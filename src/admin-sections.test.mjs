import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const main=readFileSync(new URL('./main.jsx',import.meta.url),'utf8')
const app=readFileSync(new URL('./App.jsx',import.meta.url),'utf8')
const dashboard=readFileSync(new URL('./CloudAdminPanel.jsx',import.meta.url),'utf8')
const money=readFileSync(new URL('./MoneyAssetsPanel.jsx',import.meta.url),'utf8')
const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8')

test('inventory and money assets use separate protected routes',()=>{
  assert.match(main,/if \(path === '\/admin\/produk'\) return <CloudGate><App view="products"\/><\/CloudGate>/)
  assert.match(main,/if \(path === '\/admin\/gambar-uang'\) return <CloudGate><App view="money"\/><\/CloudGate>/)
  assert.match(main,/<a href="\/admin\/produk">Produk<\/a>/)
  assert.match(main,/<a href="\/admin\/gambar-uang">Gambar Uang<\/a>/)
  assert.match(sw,/\/admin\/produk/)
  assert.match(sw,/\/admin\/gambar-uang/)
})
test('dashboard contains links rather than embedded inventory and money photo gallery',()=>{
  assert.match(dashboard,/href="\/admin\/produk"/)
  assert.match(dashboard,/href="\/admin\/gambar-uang"/)
  assert.doesNotMatch(dashboard,/MoneyAssetsPanel/)
  assert.match(app,/\{view === 'dashboard' && \(IS_CLOUD \? <CloudAdminPanel \/> : <LocalBackupPanel \/>\)\}/)
  assert.match(app,/\{\(!IS_CLOUD \|\| \['products','create','edit'\]\.includes\(view\)\) &&/)
  assert.doesNotMatch(dashboard,/<ProductManager/)
})
test('dedicated money page loads only money image manager, not product manager',()=>{
  assert.match(app,/IS_CLOUD && view === 'money'/)
  assert.match(app,/<MoneyAssetsPanel\/>/)
  assert.match(app,/href="\/admin" className="secondary-button">← Dashboard/)
  assert.match(app,/const showList = !IS_CLOUD \|\| view === 'products'/)
  assert.match(money,/cloudApiFetch\('\/api\/money'\)/)
  assert.match(money,/cloudApiFetch\('\/api\/media\/upload'/)
  assert.match(money,/cloudApiFetch\('\/api\/money\/'\+value/)
  assert.match(money,/CASH_DENOMINATIONS\.map/)
})
test('inventory page retains its own create/edit workflow and link back',()=>{
  assert.match(app,/const standaloneEditor = IS_CLOUD && \(view === 'create' \|\| view === 'edit'\)/)
  assert.match(app,/const showList = !IS_CLOUD \|\| view === 'products'/)
  assert.match(app,/id="daftar-produk"/)
  assert.match(app,/href="\/admin\/produk\/tambah"/)
  assert.match(app,/href="\/admin\/produk"/)
  assert.match(app,/window\.location\.assign\('\/admin\/produk\?produk=diperbarui'\)/)
  assert.match(app,/apiFetch\('\/api\/products', \{ method: 'POST'/)
  assert.match(app,/apiFetch\(\`\/api\/products\/\$\{editingId\}\`, \{ method: 'PATCH'/)
})
