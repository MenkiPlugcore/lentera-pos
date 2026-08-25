import { requireAdmin } from '../../_lib/auth.js'
import { json } from '../../_lib/http.js'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(value) {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function daySpan(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  const url = new URL(context.request.url)
  const from = String(url.searchParams.get('from') || '').trim()
  const to = String(url.searchParams.get('to') || '').trim()

  if (!isValidDate(from) || !isValidDate(to) || from > to) {
    return json({ ok: false, error: 'Rentang tanggal laporan tidak valid.' }, 400)
  }

  const span = daySpan(from, to)
  if (span < 0 || span > 366) {
    return json({ ok: false, error: 'Rentang laporan maksimal 366 hari.' }, 400)
  }

  try {
    const rows = await auth.sql`
      WITH tx AS MATERIALIZED (
        SELECT t.*
        FROM transactions t
        WHERE t.status = 'completed'
          AND (t.completed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
      ),
      summary AS (
        SELECT
          count(*)::integer AS transaction_count,
          COALESCE(sum(total_amount), 0)::numeric AS revenue,
          COALESCE(avg(total_amount), 0)::numeric AS average_ticket
        FROM tx
      ),
      item_summary AS (
        SELECT
          COALESCE(sum(ti.quantity), 0)::integer AS units_sold,
          COALESCE(sum((ti.unit_price - ti.purchase_price) * ti.quantity), 0)::numeric AS estimated_profit
        FROM transaction_items ti
        JOIN tx ON tx.id = ti.transaction_id
      ),
      daily AS (
        SELECT
          (tx.completed_at AT TIME ZONE 'Asia/Jakarta')::date AS sale_date,
          count(*)::integer AS transaction_count,
          COALESCE(sum(tx.total_amount), 0)::numeric AS revenue
        FROM tx
        GROUP BY 1
        ORDER BY 1
      ),
      products AS (
        SELECT
          ti.product_id,
          ti.product_sku,
          ti.product_name,
          sum(ti.quantity)::integer AS units_sold,
          sum(ti.subtotal)::numeric AS revenue,
          sum((ti.unit_price - ti.purchase_price) * ti.quantity)::numeric AS estimated_profit
        FROM transaction_items ti
        JOIN tx ON tx.id = ti.transaction_id
        GROUP BY ti.product_id, ti.product_sku, ti.product_name
        ORDER BY units_sold DESC, revenue DESC, ti.product_name
        LIMIT 20
      ),
      cashiers AS (
        SELECT
          tx.cashier_id,
          COALESCE(p.full_name, p.username, 'Kasir') AS cashier_name,
          count(*)::integer AS transaction_count,
          COALESCE(sum(tx.total_amount), 0)::numeric AS revenue
        FROM tx
        LEFT JOIN profiles p ON p.id = tx.cashier_id
        GROUP BY tx.cashier_id, p.full_name, p.username
        ORDER BY revenue DESC, transaction_count DESC
        LIMIT 20
      )
      SELECT jsonb_build_object(
        'summary', jsonb_build_object(
          'transactionCount', s.transaction_count,
          'revenue', s.revenue,
          'averageTicket', s.average_ticket,
          'unitsSold', i.units_sold,
          'estimatedProfit', i.estimated_profit
        ),
        'daily', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'date', d.sale_date,
            'transactionCount', d.transaction_count,
            'revenue', d.revenue
          ) ORDER BY d.sale_date)
          FROM daily d
        ), '[]'::jsonb),
        'products', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'productId', p.product_id,
            'sku', p.product_sku,
            'name', p.product_name,
            'unitsSold', p.units_sold,
            'revenue', p.revenue,
            'estimatedProfit', p.estimated_profit
          ) ORDER BY p.units_sold DESC, p.revenue DESC)
          FROM products p
        ), '[]'::jsonb),
        'cashiers', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'cashierId', c.cashier_id,
            'name', c.cashier_name,
            'transactionCount', c.transaction_count,
            'revenue', c.revenue
          ) ORDER BY c.revenue DESC, c.transaction_count DESC)
          FROM cashiers c
        ), '[]'::jsonb)
      ) AS report
      FROM summary s
      CROSS JOIN item_summary i
    `

    return json({ ok: true, from, to, report: rows[0]?.report || { summary: {}, daily: [], products: [], cashiers: [] } })
  } catch (error) {
    console.error('Sales report failed', error)
    return json({ ok: false, error: 'Gagal membuat laporan penjualan.' }, 500)
  }
}
