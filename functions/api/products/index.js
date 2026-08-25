import { requireAdmin } from '../../_lib/auth.js'
import { json, readJson } from '../../_lib/http.js'

const BARCODE_TYPES = new Set(['CODE128', 'EAN13', 'UPC', 'OTHER'])

function parseNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function parseInteger(value, fallback = 0) {
  const number = Number(value)
  return Number.isInteger(number) ? number : fallback
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  const url = new URL(context.request.url)
  const query = String(url.searchParams.get('q') || '').trim()
  const pattern = `%${query}%`

  try {
    const products = await auth.sql`
      SELECT
        p.id,
        p.sku,
        p.barcode,
        p.barcode_type,
        p.barcode_generated,
        p.name,
        p.category_id,
        c.name AS category_name,
        p.purchase_price,
        p.selling_price,
        p.stock,
        p.minimum_stock,
        p.image_url,
        p.description,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE (
        ${query} = '' OR
        p.name ILIKE ${pattern} OR
        p.sku ILIKE ${pattern} OR
        COALESCE(p.barcode, '') ILIKE ${pattern}
      )
      ORDER BY p.is_active DESC, p.created_at DESC
      LIMIT 500
    `

    return json({ ok: true, products })
  } catch (error) {
    console.error('List products failed', error)
    return json({ ok: false, error: 'Gagal mengambil daftar produk.' }, 500)
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  const body = await readJson(context.request)
  const name = String(body?.name || '').trim()
  const categoryId = body?.categoryId || null
  const purchasePrice = parseNumber(body?.purchasePrice)
  const sellingPrice = parseNumber(body?.sellingPrice)
  const stock = parseInteger(body?.stock)
  const minimumStock = parseInteger(body?.minimumStock)
  const rawBarcode = String(body?.barcode || '').trim()
  const barcode = rawBarcode || null
  const barcodeType = BARCODE_TYPES.has(body?.barcodeType) ? body.barcodeType : 'CODE128'
  const imageUrl = String(body?.imageUrl || '').trim() || null
  const description = String(body?.description || '').trim() || null

  if (name.length < 2 || name.length > 120) {
    return json({ ok: false, error: 'Nama produk harus 2–120 karakter.' }, 400)
  }

  if (purchasePrice < 0 || sellingPrice < 0) {
    return json({ ok: false, error: 'Harga tidak boleh negatif.' }, 400)
  }

  if (stock < 0 || minimumStock < 0) {
    return json({ ok: false, error: 'Stok tidak boleh negatif.' }, 400)
  }

  try {
    const rows = await auth.sql`
      WITH generated AS (
        SELECT 'LP' || lpad(nextval('product_sku_seq')::text, 6, '0') AS sku
      ),
      created AS (
        INSERT INTO products(
          sku,
          name,
          category_id,
          purchase_price,
          selling_price,
          stock,
          minimum_stock,
          barcode,
          barcode_type,
          barcode_generated,
          image_url,
          description,
          is_active
        )
        SELECT
          g.sku,
          ${name},
          ${categoryId},
          ${purchasePrice},
          ${sellingPrice},
          ${stock},
          ${minimumStock},
          COALESCE(${barcode}, g.sku),
          CASE WHEN ${barcode} IS NULL THEN 'CODE128' ELSE ${barcodeType} END,
          ${!barcode},
          ${imageUrl},
          ${description},
          true
        FROM generated g
        RETURNING *
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
          'initial',
          stock,
          0,
          stock,
          'Stok awal produk'
        FROM created
        WHERE stock > 0
        RETURNING product_id
      )
      SELECT
        c.*,
        cat.name AS category_name
      FROM created c
      LEFT JOIN categories cat ON cat.id = c.category_id
    `

    const product = rows[0]
    if (!product) {
      throw new Error('Created product was not returned by database.')
    }

    return json({ ok: true, product }, 201)
  } catch (error) {
    console.error('Create product failed', error)

    if (error?.code === '23505') {
      return json({ ok: false, error: 'Barcode atau kode produk sudah digunakan.' }, 409)
    }

    if (error?.code === '23503') {
      return json({ ok: false, error: 'Kategori produk tidak ditemukan.' }, 400)
    }

    return json({ ok: false, error: 'Gagal membuat produk.' }, 500)
  }
}
