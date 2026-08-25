import { requireAdmin } from '../../_lib/auth.js'
import { json, readJson } from '../../_lib/http.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function onRequestPost(context) {
  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  const body = await readJson(context.request)
  const rawItems = Array.isArray(body?.items) ? body.items : []
  const paidAmount = Number(body?.paidAmount)
  const notes = String(body?.notes || '').trim().slice(0, 500) || null

  if (rawItems.length === 0 || rawItems.length > 100) {
    return json({ ok: false, error: 'Keranjang harus berisi 1–100 jenis produk.' }, 400)
  }

  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    return json({ ok: false, error: 'Nominal pembayaran tidak valid.' }, 400)
  }

  const combined = new Map()
  for (const item of rawItems) {
    const productId = String(item?.productId || '').trim()
    const quantity = Number(item?.quantity)

    if (!UUID_PATTERN.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return json({ ok: false, error: 'Item keranjang tidak valid.' }, 400)
    }

    const nextQuantity = (combined.get(productId) || 0) + quantity
    if (nextQuantity > 999) {
      return json({ ok: false, error: 'Jumlah salah satu produk melebihi batas transaksi.' }, 400)
    }
    combined.set(productId, nextQuantity)
  }

  const items = [...combined.entries()].map(([productId, quantity]) => ({ productId, quantity }))
  const itemsJson = JSON.stringify(items)

  try {
    const rows = await auth.sql`
      WITH requested AS (
        SELECT
          (entry ->> 'productId')::uuid AS product_id,
          (entry ->> 'quantity')::integer AS quantity
        FROM jsonb_array_elements(${itemsJson}::jsonb) AS entry
      ),
      locked AS MATERIALIZED (
        SELECT
          p.id,
          p.sku,
          p.name,
          p.purchase_price,
          p.selling_price,
          p.stock AS stock_before,
          r.quantity
        FROM products p
        JOIN requested r ON r.product_id = p.id
        WHERE p.is_active = true
        FOR UPDATE OF p
      ),
      validation AS (
        SELECT
          (SELECT count(*) FROM requested)::integer AS requested_count,
          count(*)::integer AS matched_count,
          COALESCE(sum(CASE WHEN l.stock_before < l.quantity THEN 1 ELSE 0 END), 0)::integer AS insufficient_count,
          COALESCE(sum(l.selling_price * l.quantity), 0)::numeric AS total_amount
        FROM locked l
      ),
      created_transaction AS (
        INSERT INTO transactions(
          cashier_id,
          subtotal,
          discount_amount,
          total_amount,
          paid_amount,
          change_amount,
          payment_method,
          status,
          notes,
          completed_at
        )
        SELECT
          ${auth.profile.id},
          v.total_amount,
          0,
          v.total_amount,
          ${paidAmount},
          ${paidAmount} - v.total_amount,
          'cash',
          'completed',
          ${notes},
          now()
        FROM validation v
        WHERE v.requested_count > 0
          AND v.matched_count = v.requested_count
          AND v.insufficient_count = 0
          AND ${paidAmount} >= v.total_amount
        RETURNING id, invoice_no, total_amount, paid_amount, change_amount, completed_at
      ),
      created_items AS (
        INSERT INTO transaction_items(
          transaction_id,
          product_id,
          product_sku,
          product_name,
          quantity,
          purchase_price,
          unit_price
        )
        SELECT
          t.id,
          l.id,
          l.sku,
          l.name,
          l.quantity,
          l.purchase_price,
          l.selling_price
        FROM created_transaction t
        CROSS JOIN locked l
        RETURNING id
      ),
      updated_products AS (
        UPDATE products p
        SET
          stock = p.stock - l.quantity,
          updated_at = now()
        FROM locked l
        CROSS JOIN created_transaction t
        WHERE p.id = l.id
        RETURNING
          p.id,
          l.stock_before,
          p.stock AS stock_after,
          l.quantity
      ),
      movements AS (
        INSERT INTO stock_movements(
          product_id,
          transaction_id,
          actor_id,
          movement_type,
          quantity_change,
          stock_before,
          stock_after,
          reason
        )
        SELECT
          u.id,
          t.id,
          ${auth.profile.id},
          'sale',
          -u.quantity,
          u.stock_before,
          u.stock_after,
          'Penjualan POS'
        FROM updated_products u
        CROSS JOIN created_transaction t
        RETURNING id
      ),
      success_result AS (
        SELECT
          true AS ok,
          NULL::text AS error,
          t.id AS transaction_id,
          t.invoice_no,
          t.total_amount,
          t.paid_amount,
          t.change_amount,
          t.completed_at,
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'productId', l.id,
                'sku', l.sku,
                'name', l.name,
                'quantity', l.quantity,
                'unitPrice', l.selling_price,
                'subtotal', l.selling_price * l.quantity
              )
              ORDER BY l.name
            )
            FROM locked l
          ) AS items
        FROM created_transaction t
      )
      SELECT * FROM success_result
      UNION ALL
      SELECT
        false AS ok,
        CASE
          WHEN v.matched_count <> v.requested_count THEN 'Ada produk yang sudah tidak tersedia atau dinonaktifkan.'
          WHEN v.insufficient_count > 0 THEN 'Stok salah satu produk tidak mencukupi.'
          WHEN ${paidAmount} < v.total_amount THEN 'Nominal pembayaran kurang dari total belanja.'
          ELSE 'Transaksi tidak dapat diproses.'
        END AS error,
        NULL::uuid AS transaction_id,
        NULL::text AS invoice_no,
        v.total_amount,
        ${paidAmount}::numeric AS paid_amount,
        GREATEST(${paidAmount} - v.total_amount, 0)::numeric AS change_amount,
        NULL::timestamptz AS completed_at,
        '[]'::jsonb AS items
      FROM validation v
      WHERE NOT EXISTS (SELECT 1 FROM created_transaction)
    `

    const result = rows[0]
    if (!result?.ok) {
      const status = result?.error?.includes('pembayaran') ? 400 : 409
      return json({ ok: false, error: result?.error || 'Transaksi gagal diproses.' }, status)
    }

    return json({
      ok: true,
      transaction: {
        id: result.transaction_id,
        invoiceNo: result.invoice_no,
        totalAmount: Number(result.total_amount),
        paidAmount: Number(result.paid_amount),
        changeAmount: Number(result.change_amount),
        completedAt: result.completed_at,
        items: result.items || [],
      },
    }, 201)
  } catch (error) {
    console.error('POS checkout failed', error)
    return json({ ok: false, error: 'Transaksi gagal diproses. Tidak ada perubahan stok yang disimpan.' }, 500)
  }
}
