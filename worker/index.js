import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const COOKIE = '__Host-lentera_session'
const SESSION_AGE = 12 * 60 * 60
const MAX_BODY = 1_500_000
const uuidRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const json = (value, status = 200, cookie) => new Response(JSON.stringify(value), {
  status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...(cookie ? { 'set-cookie': cookie } : {}),
  },
})
const fail = (message, status = 400) => json({ ok: false, error: message }, status)
const sessionCookie = (token, age = SESSION_AGE) =>
  COOKIE + '=' + token + '; Path=/; Max-Age=' + age + '; HttpOnly; Secure; SameSite=Lax'
const cookieToken = (request) => {
  const match = (request.headers.get('cookie') || '').match(/(?:^|;\s*)__Host-lentera_session=([0-9a-f]{64})(?:;|$)/i)
  return match?.[1] || ''
}
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('')
}
function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2, '0')).join('')
}
function bad(message, status = 400) {
  const error = new Error(message)
  error.status = status
  throw error
}
async function bodyJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) bad('Permintaan harus JSON.')
  const size = Number(request.headers.get('content-length') || 0)
  if (size > MAX_BODY) bad('Data terlalu besar.', 413)
  const raw = await request.text()
  if (raw.length > MAX_BODY) bad('Data terlalu besar.', 413)
  try { return JSON.parse(raw) } catch { bad('Format JSON tidak valid.') }
}
function money(value, label) {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 0 || n > 1000000000000) bad(label + ' harus bilangan bulat positif.')
  return n
}
function nonnegativeInteger(value, label) {
  const n = money(value, label)
  if (n > 2147483647) bad(label + ' terlalu besar.')
  return n
}
function requiredText(value, label, min, max) {
  const text = String(value ?? '').trim()
  if (text.length < min || text.length > max) bad(label + ' harus ' + min + '-' + max + ' karakter.')
  return text
}
function productPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) bad('Data produk tidak valid.')
  const external = String(body.barcode || '').trim()
  if (external.length > 100) bad('Barcode maksimal 100 karakter.')
  const image = String(body.imageUrl || '').trim() || null
  if (image && (image.length > 250000 || !/^data:image\/(?:jpeg|png|webp);base64,/i.test(image))) {
    bad('Gambar harus JPEG, PNG, atau WebP kecil.')
  }
  const category = body.categoryId || null
  if (category && !uuidRE.test(category)) bad('Kategori tidak valid.')
  const barcodeType = String(body.barcodeType || 'CODE128')
  if (!['CODE128', 'EAN13', 'UPC', 'OTHER'].includes(barcodeType)) bad('Tipe barcode tidak valid.')
  return {
    name: requiredText(body.name, 'Nama produk', 2, 120),
    category, purchase: money(body.purchasePrice, 'Harga beli'),
    selling: money(body.sellingPrice, 'Harga jual'),
    stock: nonnegativeInteger(body.stock, 'Stok'),
    minimum: nonnegativeInteger(body.minimumStock, 'Stok minimum'),
    image, description: String(body.description || '').slice(0, 1000),
    external, barcodeType, active: body.isActive !== false,
  }
}
function normalizedProduct(row) {
  return { ...row, purchase_price: Number(row.purchase_price), selling_price: Number(row.selling_price) }
}
function txItem(row) {
  return {
    id: row.id, productId: row.product_id, sku: row.product_sku, name: row.product_name,
    quantity: row.quantity, unitPrice: Number(row.unit_price), purchasePrice: Number(row.purchase_price),
    subtotal: Number(row.subtotal),
  }
}
function normalizeTx(row) {
  return {
    id: row.id, invoiceNo: row.invoice_no, status: row.status,
    paymentMethod: row.payment_method, cashierId: row.cashier_id,
    cashierName: row.cashier_name || 'Kasir', subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount), totalAmount: Number(row.total_amount),
    paidAmount: Number(row.paid_amount), changeAmount: Number(row.change_amount),
    notes: row.notes, createdAt: row.created_at, completedAt: row.completed_at,
    cancelledAt: row.cancelled_at, items: (row.items || []).map(txItem),
    units: (row.items || []).reduce((n, i) => n + i.quantity, 0),
  }
}
async function loadTransaction(db, id) {
  const [row] = await db.query(
    "SELECT t.*, p.full_name AS cashier_name, COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at) FROM public.transaction_items i WHERE i.transaction_id=t.id),'[]'::jsonb) items FROM public.transactions t LEFT JOIN public.profiles p ON p.id=t.cashier_id WHERE t.id=$1::uuid",
    [id])
  return row && normalizeTx(row)
}
async function insertProduct(db, p) {
  const [row] = await db.query(
    "WITH code AS (SELECT 'LP' || lpad(nextval('public.product_sku_seq'::regclass)::text,6,'0') AS sku) INSERT INTO public.products (sku,barcode,barcode_type,barcode_generated,name,category_id,purchase_price,selling_price,stock,minimum_stock,image_url,description,is_active) SELECT code.sku,COALESCE($1,code.sku),$2,($1 IS NULL),$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11 FROM code RETURNING *",
    [p.external || null, p.barcodeType, p.name, p.category, p.purchase, p.selling, p.stock, p.minimum, p.image, p.description, p.active])
  return normalizedProduct(row)
}
async function getSession(db, request) {
  const token = cookieToken(request)
  if (!token) return null
  const [account] = await db.query(
    "SELECT p.id,p.username,p.full_name,p.role::text role FROM public.auth_sessions s JOIN public.profiles p ON p.id=s.profile_id WHERE s.token_hash=$1 AND s.expires_at>now() AND p.is_active",
    [await sha256(token)])
  return account || null
}
async function handleApi(request, env) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const method = request.method.toUpperCase()
  if (path === '/api/health' && method === 'GET') {
    return json({ ok: true, mode: 'cloud', databaseConfigured: Boolean(env.DATABASE_URL) })
  }
  if (!env.DATABASE_URL) return fail('DATABASE_URL belum diatur di Worker.', 503)
  const db = neon(env.DATABASE_URL)

  if (['POST','PATCH','PUT','DELETE'].includes(method)) {
    const origin = request.headers.get('origin')
    if (origin && origin !== url.origin) return fail('Origin tidak diizinkan.', 403)
    const site = request.headers.get('sec-fetch-site')
    if (site === 'cross-site') return fail('Permintaan lintas situs ditolak.', 403)
  }
  if (path === '/api/auth/login' && method === 'POST') {
    const data = await bodyJson(request)
    const username = requiredText(data.username, 'Username', 1, 100)
    const password = String(data.password || '')
    if (password.length < 1 || password.length > 200) bad('Kredensial tidak valid.', 401)
    const [account] = await db.query(
      "SELECT p.id,p.username,p.full_name,p.role::text role,c.password_hash,c.failed_attempts,c.locked_until FROM public.profiles p JOIN public.admin_credentials c ON c.profile_id=p.id WHERE lower(p.username)=lower($1) AND p.is_active AND p.role='admin' LIMIT 1",
      [username])
    if (!account || (account.locked_until && new Date(account.locked_until) > new Date())) {
      return fail('Username atau password salah, atau akun sementara terkunci.', 401)
    }
    const valid = await bcrypt.compare(password, account.password_hash)
    if (!valid) {
      await db.query(
        "UPDATE public.admin_credentials SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts+1>=5 THEN now()+interval '15 minutes' ELSE NULL END,updated_at=now() WHERE profile_id=$1",
        [account.id])
      return fail('Username atau password salah, atau akun sementara terkunci.', 401)
    }
    await db.query(
      "UPDATE public.admin_credentials SET failed_attempts=0,locked_until=NULL,last_login_at=now(),updated_at=now() WHERE profile_id=$1",
      [account.id])
    const token = randomToken()
    await db.query(
      "INSERT INTO public.auth_sessions (profile_id, token_hash, expires_at) VALUES ($1,$2,now()+interval '12 hours')",
      [account.id, await sha256(token)])
    return json({ ok: true, user: { id: account.id, username: account.username, fullName: account.full_name, role: account.role } }, 200, sessionCookie(token))
  }

  const account = await getSession(db, request)
  if (path === '/api/auth/me' && method === 'GET') {
    return account ? json({ ok: true, user: { id: account.id, username: account.username, fullName: account.full_name, role: account.role } }) : fail('Sesi berakhir. Silakan login.', 401)
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    const token = cookieToken(request)
    if (token) await db.query('DELETE FROM public.auth_sessions WHERE token_hash=$1', [await sha256(token)])
    return json({ ok: true }, 200, sessionCookie('', 0))
  }
  if (!account) return fail('Silakan login terlebih dahulu.', 401)
  if (account.role !== 'admin') return fail('Akses admin diperlukan.', 403)

  if (path === '/api/dashboard' && method === 'GET') {
    const [info] = await db.query(
      "SELECT (SELECT count(*) FROM public.products WHERE is_active) products, (SELECT count(*) FROM public.categories) categories, (SELECT count(*) FROM public.transactions WHERE status='completed') transactions, (SELECT count(*) FROM public.products WHERE is_active AND stock<=minimum_stock) low_stock, (SELECT count(*) FROM public.lentera_game_sessions) game_sessions")
    return json({ ok: true, stats: info })
  }

  if (path === '/api/categories') {
    if (method === 'GET') {
      const rows = await db.query('SELECT * FROM public.categories ORDER BY name')
      return json({ ok: true, categories: rows })
    }
    if (method === 'POST') {
      const data = await bodyJson(request)
      const name = requiredText(data.name, 'Nama kategori', 2, 60)
      const [category] = await db.query('INSERT INTO public.categories (name) VALUES ($1) RETURNING *', [name])
      return json({ ok: true, category }, 201)
    }
  }

  if (path === '/api/products') {
    if (method === 'GET') {
      const term = String(url.searchParams.get('q') || '').slice(0, 120)
      const rows = await db.query(
        "SELECT p.*, c.name category_name FROM public.products p LEFT JOIN public.categories c ON c.id=p.category_id WHERE $1='' OR p.name ILIKE '%' || $1 || '%' OR p.sku ILIKE '%' || $1 || '%' OR p.barcode ILIKE '%' || $1 || '%' ORDER BY p.is_active DESC,p.created_at DESC",
        [term])
      return json({ ok: true, products: rows.map(normalizedProduct) })
    }
    if (method === 'POST') {
      const product = await insertProduct(db, productPayload(await bodyJson(request)))
      return json({ ok: true, product }, 201)
    }
  }
  const productMatch = path.match(/^\/api\/products\/([0-9a-f-]+)$/i)
  if (productMatch && uuidRE.test(productMatch[1])) {
    const id = productMatch[1]
    if (method === 'PATCH') {
      const p = productPayload(await bodyJson(request))
      const [row] = await db.query(
        "UPDATE public.products SET name=$1,category_id=$2::uuid,purchase_price=$3,selling_price=$4,stock=$5,minimum_stock=$6,image_url=$7,description=$8,barcode=COALESCE($9,sku),barcode_generated=($9 IS NULL),barcode_type=$10,is_active=$11,updated_at=now() WHERE id=$12::uuid RETURNING *",
        [p.name,p.category,p.purchase,p.selling,p.stock,p.minimum,p.image,p.description,p.external||null,p.barcodeType,p.active,id])
      if (!row) return fail('Produk tidak ditemukan.', 404)
      return json({ ok: true, product: normalizedProduct(row) })
    }
    if (method === 'DELETE') {
      const [row] = await db.query('UPDATE public.products SET is_active=false,updated_at=now() WHERE id=$1::uuid RETURNING *', [id])
      if (!row) return fail('Produk tidak ditemukan.', 404)
      return json({ ok: true, product: normalizedProduct(row) })
    }
  }
  const deleteMatch = path.match(/^\/api\/products\/([0-9a-f-]+)\/hard-delete$/i)
  if (deleteMatch && uuidRE.test(deleteMatch[1]) && method === 'DELETE') {
    const [row] = await db.query(
      "DELETE FROM public.products p WHERE p.id=$1::uuid AND NOT EXISTS (SELECT 1 FROM public.transaction_items i WHERE i.product_id=p.id) RETURNING id,sku,name",
      [deleteMatch[1]])
    if (!row) return fail('Produk sudah terjual atau tidak ditemukan. Gunakan Arsipkan.', 409)
    return json({ ok: true, deleted: row })
  }

  if (path === '/api/pos/checkout' && method === 'POST') {
    const payload = await bodyJson(request)
    if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 100) bad('Keranjang tidak valid.')
    for (const item of payload.items) {
      if (!uuidRE.test(String(item?.productId || ''))) bad('ID produk tidak valid.')
      if (!Number.isInteger(Number(item?.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 999) bad('Jumlah produk tidak valid.')
    }
    const paid = money(payload.paidAmount, 'Uang dibayar')
    const [result] = await db.query(
      'SELECT public.lentera_pos_checkout($1::jsonb,$2::numeric,$3::uuid) id',
      [JSON.stringify(payload.items),paid,account.id])
    const transaction = await loadTransaction(db,result.id)
    return json({ ok: true, transaction }, 201)
  }

  const dateRE = /^\d{4}-\d{2}-\d{2}$/
  if ((path === '/api/transactions' || path === '/api/reports/sales') && method === 'GET') {
    const from = url.searchParams.get('from') || '2000-01-01'
    const to = url.searchParams.get('to') || '2100-01-01'
    if (!dateRE.test(from) || !dateRE.test(to) || from > to) bad('Rentang tanggal tidak valid.')
    const q = String(url.searchParams.get('q') || '').trim().slice(0,120)
    if (path === '/api/transactions') {
      const rows = await db.query(
        "SELECT t.*,p.full_name cashier_name,COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at) FROM public.transaction_items i WHERE i.transaction_id=t.id),'[]'::jsonb) items FROM public.transactions t LEFT JOIN public.profiles p ON p.id=t.cashier_id WHERE (COALESCE(t.completed_at,t.created_at) AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date AND ($3='' OR t.invoice_no ILIKE '%' || $3 || '%' OR p.full_name ILIKE '%' || $3 || '%' OR EXISTS (SELECT 1 FROM public.transaction_items i WHERE i.transaction_id=t.id AND (i.product_name ILIKE '%' || $3 || '%' OR i.product_sku ILIKE '%' || $3 || '%'))) ORDER BY t.created_at DESC LIMIT 200",
        [from,to,q])
      return json({ ok: true, from, to, query:q, transactions:rows.map(normalizeTx) })
    }
    const [summary] = await db.query(
      "SELECT count(*)::int transaction_count,COALESCE(sum(total_amount),0) revenue,COALESCE(avg(total_amount),0) average_ticket FROM public.transactions WHERE status='completed' AND (completed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date",
      [from,to])
    const [sums] = await db.query(
      "SELECT COALESCE(sum(i.quantity),0) units_sold,COALESCE(sum((i.unit_price-i.purchase_price)*i.quantity),0) estimated_profit FROM public.transaction_items i JOIN public.transactions t ON t.id=i.transaction_id WHERE t.status='completed' AND (t.completed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date",
      [from,to])
    const daily = await db.query(
      "SELECT to_char(t.completed_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD') date,count(*)::int transaction_count,sum(t.total_amount) revenue FROM public.transactions t WHERE t.status='completed' AND (t.completed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date GROUP BY 1 ORDER BY 1",
      [from,to])
    const products = await db.query(
      "SELECT i.product_id product_id,i.product_sku sku,i.product_name name,sum(i.quantity)::int units_sold,sum(i.subtotal) revenue,sum((i.unit_price-i.purchase_price)*i.quantity) estimated_profit FROM public.transaction_items i JOIN public.transactions t ON t.id=i.transaction_id WHERE t.status='completed' AND (t.completed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date GROUP BY 1,2,3 ORDER BY units_sold DESC LIMIT 20",
      [from,to])
    const cashiers = await db.query(
      "SELECT t.cashier_id cashier_id,COALESCE(p.full_name,'Kasir') name,count(*)::int transaction_count,sum(t.total_amount) revenue FROM public.transactions t LEFT JOIN public.profiles p ON p.id=t.cashier_id WHERE t.status='completed' AND (t.completed_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date GROUP BY 1,2 ORDER BY revenue DESC",
      [from,to])
    const report = {
      summary: { transactionCount:summary.transaction_count,revenue:Number(summary.revenue),
        averageTicket:Number(summary.average_ticket),unitsSold:Number(sums.units_sold),
        estimatedProfit:Number(sums.estimated_profit) },
      daily:daily.map(r=>({date:r.date,transactionCount:r.transaction_count,revenue:Number(r.revenue)})),
      products:products.map(r=>({productId:r.product_id,sku:r.sku,name:r.name,unitsSold:r.units_sold,revenue:Number(r.revenue),estimatedProfit:Number(r.estimated_profit)})),
      cashiers:cashiers.map(r=>({cashierId:r.cashier_id,name:r.name,transactionCount:r.transaction_count,revenue:Number(r.revenue)})),
    }
    return json({ ok:true,from,to,report })
  }
  if (path === '/api/game/summary' && method === 'GET') {
    const [s] = await db.query("SELECT count(*)::int sessions,COALESCE(sum(score),0)::int total_score FROM public.lentera_game_sessions")
    return json({ ok:true, summary:s })
  }

  if (path === '/api/migration/catalog' && method === 'POST') {
    const payload = await bodyJson(request)
    const state = payload?.backup?.data
    if (payload?.backup?.app !== 'lentera-pos' || payload?.backup?.version !== 1 ||
      !Array.isArray(state?.categories) || !Array.isArray(state?.products) ||
      state.categories.length > 150 || state.products.length > 500) bad('Cadangan lokal tidak valid atau terlalu besar.')
    const map = new Map()
    let categoriesAdded = 0, productsAdded = 0, skipped = 0
    for (const category of state.categories) {
      const name = requiredText(category?.name, 'Nama kategori', 2, 60)
      let [found] = await db.query('SELECT id FROM public.categories WHERE lower(name)=lower($1) LIMIT 1', [name])
      if (!found) {
        const rows = await db.query('INSERT INTO public.categories(name) VALUES($1) ON CONFLICT(name) DO NOTHING RETURNING id', [name])
        found = rows[0] || (await db.query('SELECT id FROM public.categories WHERE name=$1', [name]))[0]
        if (rows.length) categoriesAdded++
      }
      if (typeof category.id === 'string') map.set(category.id, found.id)
    }
    for (const old of state.products) {
      const name = requiredText(old?.name, 'Nama produk', 2, 120)
      const existing = await db.query('SELECT id FROM public.products WHERE lower(name)=lower($1) OR sku=$2 OR (barcode=$3 AND $3 IS NOT NULL) LIMIT 1',
        [name,String(old.sku || ''),old.barcode_generated ? null : String(old.barcode || '') || null])
      if (existing.length) { skipped++; continue }
      const mapped = map.get(old.category_id) || null
      const p = productPayload({
        name, categoryId:mapped, purchasePrice:old.purchase_price, sellingPrice:old.selling_price,
        stock:old.stock, minimumStock:old.minimum_stock, barcode:old.barcode_generated ? '' : old.barcode,
        barcodeType:old.barcode_type, imageUrl:old.image_url, description:old.description,
        isActive:old.is_active,
      })
      await insertProduct(db,p)
      productsAdded++
    }
    return json({ ok:true,categoriesAdded,productsAdded,skipped, note:'Hanya katalog yang diimpor; transaksi lokal tetap ada di cadangan JSON.' })
  }
  return fail('Endpoint tidak ditemukan.', 404)
}

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname
    if (!pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }
    try {
      return await handleApi(request,env)
    } catch (error) {
      if (error?.status) return fail(error.message,error.status)
      if (error?.code === '23505') return fail('Nama, SKU, atau barcode sudah digunakan.',409)
      if (error?.code === '23503') return fail('Kategori atau data terkait tidak ditemukan.',409)
      if (error?.code === '22P02') return fail('Format ID tidak valid.',400)
      if (error?.code === '23514') return fail('Data melanggar aturan validasi.',400)
      console.error('LENTERA POS API error',error?.code || error?.name || 'unknown')
      return fail('Terjadi kesalahan server. Coba lagi atau periksa log Worker.',500)
    }
  },
}
