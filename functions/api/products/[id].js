import { requireAdmin } from '../../_lib/auth.js'
import { getPathParam, json, readJson } from '../../_lib/http.js'

const BARCODE_TYPES = new Set(['CODE128', 'EAN13', 'UPC', 'OTHER'])

function parseNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function parseInteger(value, fallback = 0) {
  const number = Number(value)
  return Number.isInteger(number) ? number : fallback
}

export async function onRequestPatch(context) {
  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  const productId = getPathParam(context, 'id')
  const body = await readJson(context.request)
  const name = String(body?.name || '').trim()
  const categoryId = body?.categoryId || null
  const purchasePrice = parseNumber(body?.purchasePrice)
  const sellingPrice = parseNumber(body?.sellingPrice)
  const stock = parseInteger(body?.stock)
  const minimumStock = parseInteger(body?.minimumStock)
  const rawBarcode = String(body?.barcode || '').trim()
  const barcodeType = BARCODE_TYPES.has(body?.barcodeType) ? body.barcodeType : 'CODE128'
  const imageUrl = String(body?.imageUrl || '').trim() || null
  const description = String(body?.description || '').trim() || null
  const isActive = body?.isActive !== false

  if (!productId) {
    return json({ ok: false, error: 'ID produk tidak valid.' }, 400)
  }

  if (name.length < 2 || name.length > 120) {
    return json({ ok: false, error: 'Nama produk harus 2–120 karakter.' }, 400)
  }

  if (purchasePrice < 0 || sellingPrice < 0 || stock < 0 || minimumStock < 0) {
    return json({ ok: false, error: 'Harga dan stok tidak boleh negatif.' }, 400)
  }

  try {
    const rows = await auth.sql`
      WITH before_update AS (
        SELECT id, stock, sku
        FROM products
        WHERE id = ${productId}
        FOR UPDATE
      ),
      updated AS (
        UPDATE products p
        SET
          name = ${name},
          category_id = ${categoryId},
          purchase_price = ${purchasePrice},
          selling_price = ${sellingPrice},
          stock = ${stock},
          minimum_stock = ${minimumStock},
          barcode = CASE WHEN ${rawBarcode} = '' THEN p.sku ELSE ${rawBarcode} END,
          barcode_type = CASE WHEN ${rawBarcode} = '' THEN 'CODE128' ELSE ${barcodeType} END,
          barcode_generated = CASE WHEN ${rawBarcode} = '' THEN true ELSE false END,
          image_url = ${imageUrl},
          description = ${description},
          is_active = ${isActive},
          updated_at = now()
        FROM before_update b
        WHERE p.id = b.id
        RETURNING p.*, b.stock AS old_stock
      ),
      movement AS (
        INSERT INTO stock_movements(
          product_id,
          actor_id,
          movement_type,
          quantity_change,
          stock_before,
          stock_after,
          reason
        )
        SELECT
          id,
          ${auth.profile.id},
          'adjustment',
          stock - old_stock,
          old_stock,
          stock,
          'Penyesuaian dari editor produk'
        FROM updated
        WHERE stock <> old_stock
        RETURNING id
      )
      SELECT
        u.id,
        u.sku,
        u.barcode,
        u.barcode_type,
        u.barcode_generated,
        u.name,
        u.category_id,
        c.name AS category_name,
        u.purchase_price,
        u.selling_price,
        u.stock,
        u.minimum_stock,
        u.image_url,
        u.description,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM updated u
      LEFT JOIN categories c ON c.id = u.category_id
    `

    if (!rows[0]) {
      return json({ ok: false, error: 'Produk tidak ditemukan.' }, 404)
    }

    return json({ ok: true, product: rows[0] })
  } catch (error) {
    console.error('Update product failed', error)

    if (error?.code === '23505') {
      return json({ ok: false, error: 'Barcode tersebut sudah digunakan produk lain.' }, 409)
    }

    if (error?.code === '23503') {
      return json({ ok: false, error: 'Kategori produk tidak ditemukan.' }, 400)
    }

    return json({ ok: false, error: 'Gagal menyimpan perubahan produk.' }, 500)
  }
}

export async function onRequestDelete(context) {
  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  const productId = getPathParam(context, 'id')
  if (!productId) {
    return json({ ok: false, error: 'ID produk tidak valid.' }, 400)
  }

  try {
    const rows = await auth.sql`
      UPDATE products
      SET is_active = false, updated_at = now()
      WHERE id = ${productId}
      RETURNING id, sku, name, is_active
    `

    if (!rows[0]) {
      return json({ ok: false, error: 'Produk tidak ditemukan.' }, 404)
    }

    return json({ ok: true, product: rows[0] })
  } catch (error) {
    console.error('Archive product failed', error)
    return json({ ok: false, error: 'Gagal mengarsipkan produk.' }, 500)
  }
}
