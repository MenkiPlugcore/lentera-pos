import { requireAdmin } from '../../../_lib/auth.js'
import { getPathParam, json } from '../../../_lib/http.js'

export async function onRequestDelete(context) {
  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  const productId = getPathParam(context, 'id')
  if (!productId) {
    return json({ ok: false, error: 'ID produk tidak valid.' }, 400)
  }

  try {
    const rows = await auth.sql`
      SELECT
        p.id,
        p.sku,
        p.name,
        (
          SELECT count(*)::int
          FROM transaction_items ti
          WHERE ti.product_id = p.id
        ) AS transaction_count
      FROM products p
      WHERE p.id = ${productId}
      LIMIT 1
    `

    const product = rows[0]
    if (!product) {
      return json({ ok: false, error: 'Produk tidak ditemukan.' }, 404)
    }

    if (Number(product.transaction_count) > 0) {
      return json(
        {
          ok: false,
          error: 'Produk sudah pernah dipakai dalam transaksi. Gunakan Arsipkan agar laporan dan riwayat transaksi tetap konsisten.',
        },
        409,
      )
    }

    await auth.sql`
      DELETE FROM products
      WHERE id = ${productId}
    `

    return json({
      ok: true,
      deleted: {
        id: product.id,
        sku: product.sku,
        name: product.name,
      },
    })
  } catch (error) {
    console.error('Hard delete product failed', error)
    return json({ ok: false, error: 'Gagal menghapus produk secara permanen.' }, 500)
  }
}
