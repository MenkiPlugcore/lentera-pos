import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const app=readFileSync(new URL('./App.jsx',import.meta.url),'utf8')
const api=readFileSync(new URL('../worker/index.js',import.meta.url),'utf8')
const local=readFileSync(new URL('./localPos.js',import.meta.url),'utf8')
const main=readFileSync(new URL('./main.jsx',import.meta.url),'utf8')

test('product inventory has Hapus Permanen action for active and archived products',()=>{
  assert.match(app,/async function deleteProduct\(product\)/)
  assert.match(app,/onClick=\{\(\) => deleteProduct\(product\)\}/)
  assert.match(app,/aria-label=\{\`Hapus permanen \$\{product\.name\}\`\}/)
  assert.match(app,/deletingId === product\.id \? 'Menghapus\.\.\.' : 'Hapus'/)
  assert.match(app,/setProducts\(\(current\) => current\.filter\(\(item\) => item\.id !== product\.id\)\)/)
  assert.doesNotMatch(app,/>Arsipkan<\/button>/)
})
test('permanent delete requires two deliberate confirmations, including exact SKU',()=>{
  assert.match(app,/window\.prompt\(/)
  assert.match(app,/typed\.trim\(\) !== product\.sku/)
  assert.match(app,/window\.confirm\(/)
  assert.match(app,/Tindakan ini tidak bisa dibatalkan/)
  assert.match(app,/disabled=\{deletingId !== null \|\| busy\}/)
  assert.match(app,/setNotice\(\{ tone: 'error', text: error\.message \}\)/)
})
test('cloud delete endpoint removes catalog product without blocking old practice purchases',()=>{
  const route=api.slice(api.indexOf("const deleteMatch = path.match("),api.indexOf("if (path === '/api/pos/checkout'"))
  assert.match(route,/uuidRE\.test\(deleteMatch\[1\]\) && method === 'DELETE'/)
  assert.match(route,/DELETE FROM public\.products WHERE id=\$1::uuid RETURNING id,sku,name/)
  assert.doesNotMatch(route,/NOT EXISTS/)
  assert.doesNotMatch(route,/DELETE FROM public\.transactions/)
  assert.doesNotMatch(route,/DELETE FROM public\.transaction_items/)
  assert.match(api,/if \(!account\) return fail\('Silakan login admin terlebih dahulu\.'/)
  assert.match(api,/if \(account\.role !== 'admin'\) return fail\('Akses admin diperlukan\.'/)
})
test('practice snapshots survive local catalog deletion',()=>{
  assert.match(local,/state\.transactions = state\.transactions\.map\(\(tx\) => \(\{/)
  assert.match(local,/item\.productId === id/)
  assert.match(local,/\{ \.\.\.item, productId: null \}/)
  assert.match(local,/state\.products = state\.products\.filter\(\(item\) => item\.id !== id\)/)
  assert.doesNotMatch(local,/Produk sudah dipakai dalam transaksi\. Arsipkan/)
})
test('old cloud dashboard floating delete entry is removed while local fallback remains',()=>{
  assert.match(main,/if \(path === '\/admin\/produk'\) return <CloudGate><App view="products"\/><\/CloudGate>/)
  const cloudSection=main.slice(main.indexOf("if (path === '/admin') return <CloudGate>"),main.indexOf("window.history.replaceState"))
  assert.doesNotMatch(cloudSection,/<HardDeletePanel\/>/)
  const localSection=main.slice(main.indexOf('if (!IS_CLOUD)'),main.indexOf("if (path === '/'"))
  assert.match(localSection,/<HardDeletePanel\/>/)
})
