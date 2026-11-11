import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app=readFileSync(new URL('./App.jsx',import.meta.url),'utf8')
const main=readFileSync(new URL('./main.jsx',import.meta.url),'utf8')
const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8')
const wrangler=readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8')

test('add product has its own protected admin route and navigation',()=>{
  assert.match(main,/path === '\/admin\/produk\/tambah'\) return <CloudGate><App view="create"\/><\/CloudGate>/)
  assert.match(main,/<a href="\/admin\/produk\/tambah">\+ Tambah Produk<\/a>/)
  assert.match(main,/<a href="\/admin\/produk">Produk<\/a>/)
  assert.match(main,/if \(path === '\/admin'\) return <CloudGate>/)
})

test('editing products opens a dedicated protected URL, not the inline list form',()=>{
  assert.match(main,/path\.match\(\/\^\\\/admin\\\/produk\\\/edit\\\/\(\[0-9a-f-\]\{36\}\)\$\/i\)/)
  assert.match(main,/if \(editProductRoute\) return <CloudGate><App view="edit" editProductId=\{editProductRoute\[1\]\}\/><\/CloudGate>/)
  assert.match(app,/window\.location\.assign\('\/admin\/produk\/edit\/' \+ encodeURIComponent\(product\.id\)\)/)
  assert.match(app,/products\.find\(\(item\) => item\.id === editProductId\)/)
  assert.match(app,/if \(!editingPage \|\| loading\) return/)
})

test('dashboard shows inventory with add button while editor remains a standalone form',()=>{
  assert.match(app,/const standaloneEditor = IS_CLOUD && \(view === 'create' \|\| view === 'edit'\)/)
  assert.match(app,/const showList = !IS_CLOUD \|\| view === 'products'/)
  assert.match(app,/const showEditor = !IS_CLOUD \|\| standaloneEditor/)
  assert.match(app,/\{showEditor && \(!editingPage \|\| \(!loading && editingId\)\) && \(/)
  assert.match(app,/\{showList && \(/)
  assert.match(app,/<a href="\/admin\/produk\/tambah" className="primary-button shrink-0">\+ Tambah Produk<\/a>/)
  assert.match(app,/id="daftar-produk"/)
  assert.match(app,/max-w-3xl/)
  assert.match(app,/href="\/admin\/produk"/)
})

test('product creation and editing reuse original API, Cloudinary upload and category logic',()=>{
  assert.match(app,/apiFetch\('\/api\/products', \{ method: 'POST', body: JSON\.stringify\(payload\) \}\)/)
  assert.match(app,/apiFetch\(\`\/api\/products\/\$\{editingId\}\`, \{ method: 'PATCH'/)
  assert.match(app,/cloudApiFetch\('\/api\/media\/upload'/)
  assert.match(app,/imageFileToDataUrl\(file\)/)
  assert.match(app,/apiFetch\('\/api\/categories', \{ method: 'POST'/)
  assert.match(app,/setPendingCloudImage\(false\)/)
  assert.match(app,/Simpan Produk/)
  assert.match(app,/Simpan Perubahan/)
  assert.match(app,/window\.location\.assign\('\/admin\/produk\?produk=diperbarui'\)/)
})

test('local POS and existing inventory actions remain available',()=>{
  assert.match(app,/const showEditor = !IS_CLOUD \|\| standaloneEditor/)
  assert.match(app,/const showList = !IS_CLOUD \|\| view === 'products'/)
  assert.match(app,/deleteProduct\(product\)/)
  assert.match(app,/ProductBarcodeActions product=\{product\}/)
  assert.match(app,/apiFetch\(\`\/api\/products\/\$\{product\.id\}\/hard-delete\`, \{ method: 'DELETE'/)
  assert.match(main,/if \(!IS_CLOUD\)/)
})

test('new admin route can deep-link through single-page-application deployment',()=>{
  assert.match(wrangler,/"not_found_handling": "single-page-application"/)
  assert.match(sw,/\/admin\/produk\/tambah/)
})
