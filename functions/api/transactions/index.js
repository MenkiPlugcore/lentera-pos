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
  const query = String(url.searchParams.get('q') || '').trim().slice(0, 120)
  const pattern = `%${query}%`

  if (!isValidDate(from) || !isValidDate(to) || from > to) {
    return json({ ok: false, error: 'Rentang tanggal tidak valid.' }, 400)
  }

  const span = daySpan(from, to)
  if (span < 0 || span > 366) {
    return json({ ok: false, error: 'Rentang riwayat maksimal 366 hari.' }, 400)
  }

  try {
    const rows = await auth.sql`
      SELECT
        t.id,
        t.invoice_no,
        t.status,
        t.payment_method,
        t.subtotal,
        t.discount_amount,
        t.total_amount,
        t.paid_amount,
        t.change_amount,
        t.notes,
        t.created_at,
        t.completed_at,
        t.cancelled_at,
        t.cashier_id,
        COALESCE(p.full_name, p.username, 'Kasir') AS cashier_name,
        COALESCE(
          (
            SELECT sum(ti.quantity)::integer
            FROM transaction_items ti
            WHERE ti.transaction_id = t.id
          ),
          0
        ) AS units,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', ti.id,
                'productId', ti.product_id,
                'sku', ti.product_sku,
                'name', ti.product_name,
                'quantity', ti.quantity,
                'unitPrice', ti.unit_price,
                'subtotal', ti.subtotal
              )
              ORDER BY ti.created_at, ti.product_name
            )
            FROM transaction_items ti
            WHERE ti.transaction_id = t.id
          ),
          '[]'::jsonb
        ) AS items
      FROM transactions t
      LEFT JOIN profiles p ON p.id = t.cashier_id
      WHERE (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
        AND (
          ${query} = ''
          OR t.invoice_no ILIKE ${pattern}
          OR COALESCE(p.full_name, '') ILIKE ${pattern}
          OR COALESCE(p.username, '') ILIKE ${pattern}
          OR EXISTS (
            SELECT 1
            FROM transaction_items si
            WHERE si.transaction_id = t.id
              AND (si.product_name ILIKE ${pattern} OR si.product_sku ILIKE ${pattern})
          )
        )
      ORDER BY t.created_at DESC
      LIMIT 200
    `

    return json({
      ok: true,
      from,
      to,
      query,
      transactions: rows.map((row) => ({
        id: row.id,
        invoiceNo: row.invoice_no,
        status: row.status,
        paymentMethod: row.payment_method,
        subtotal: Number(row.subtotal),
        discountAmount: Number(row.discount_amount),
        totalAmount: Number(row.total_amount),
        paidAmount: Number(row.paid_amount),
        changeAmount: Number(row.change_amount),
        notes: row.notes,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        cancelledAt: row.cancelled_at,
        cashierId: row.cashier_id,
        cashierName: row.cashier_name,
        units: Number(row.units || 0),
        items: row.items || [],
      })),
    })
  } catch (error) {
    console.error('Transaction history failed', error)
    return json({ ok: false, error: 'Gagal mengambil riwayat transaksi.' }, 500)
  }
}
