import test from 'node:test'
import assert from 'node:assert/strict'

const memory = new Map()
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
globalThis.Event ||= class Event { constructor(type) { this.type = type } }
globalThis.window = {
  location: { origin: 'http://localhost:5173' },
  localStorage: {
    getItem(key) { return memory.has(key) ? memory.get(key) : null },
    setItem(key, value) { memory.set(key, String(value)) },
  },
  dispatchEvent() {},
}

const { apiFetch, exportBackup, restoreBackup, getLocalStats } = await import('./localPos.js')
const post = (url, body) => apiFetch(url, { method: 'POST', body: JSON.stringify(body) })
const item = (name, extra = {}) => ({
  name, purchasePrice: 3000, sellingPrice: 5000, stock: 10, minimumStock: 2,
  barcode: '', barcodeType: 'CODE128', imageUrl: '', description: '', ...extra,
})

test('category and products persist without server or login', async () => {
  const cat = (await post('/api/categories', { name: 'Minuman' })).category
  assert.ok(cat.id)
  const product = (await post('/api/products', item('Air Mineral', { categoryId: cat.id }))).product
  assert.equal(product.sku, 'LP000001')
  assert.equal(product.barcode, 'LP000001')
  assert.equal(product.category_name, 'Minuman')
  assert.equal((await apiFetch('/api/products')).products[0].stock, 10)
  assert.equal(getLocalStats().products, 1)
})

test('product validation rejects negative stock and barcode duplicates', async () => {
  await assert.rejects(post('/api/products', item('Rusak', { stock: -1 })), /Stok/)
  await assert.rejects(post('/api/products', item('Duplikat', { barcode: 'LP000001' })), /Barcode/)
  assert.equal((await apiFetch('/api/products')).products.length, 1)
})

test('checkout reduces stock and keeps an immutable item snapshot', async () => {
  const product = (await apiFetch('/api/products')).products[0]
  const result = await post('/api/pos/checkout', { items: [{ productId: product.id, quantity: 2 }], paidAmount: 15000 })
  assert.equal(result.transaction.totalAmount, 10000)
  assert.equal(result.transaction.changeAmount, 5000)
  assert.equal(result.transaction.items[0].purchasePrice, 3000)
  assert.equal((await apiFetch('/api/products')).products[0].stock, 8)
  await assert.rejects(post('/api/pos/checkout', {
    items: [{ productId: product.id, quantity: 999 }], paidAmount: 999999,
  }), /Stok/)
  assert.equal((await apiFetch('/api/products')).products[0].stock, 8)
  assert.equal((await apiFetch('/api/products')).products[0].id,product.id)
})

test('reports use Jakarta dates, history filters, and actual purchase costs', async () => {
  const now = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (type) => date.find((x) => x.type === type).value
  const day = get('year') + '-' + get('month') + '-' + get('day')
  const report = (await apiFetch('/api/reports/sales?from=' + day + '&to=' + day)).report
  assert.equal(report.summary.revenue, 10000)
  assert.equal(report.summary.unitsSold, 2)
  assert.equal(report.summary.estimatedProfit, 4000)
  assert.equal(report.daily.length, 1)
  const tx = (await apiFetch('/api/transactions?from=' + day + '&to=' + day + '&q=Air')).transactions
  assert.equal(tx.length, 1)
  assert.equal(tx[0].items[0].quantity, 2)
})

test('backup import roundtrip and invalid backup does not overwrite data', async () => {
  const json = exportBackup()
  const restored = restoreBackup(json)
  assert.equal(restored.products, 1)
  assert.equal(restored.transactions, 1)
  assert.throws(() => restoreBackup('{"app":"wrong"}'), /cadangan/)
  assert.equal(getLocalStats().transactions, 1)
})

test('archiving prevents sale and fresh products may be hard deleted', async () => {
  const extra = (await post('/api/products', item('Roti Tawar', { barcode: 'ROTI001' }))).product
  await apiFetch('/api/products/' + extra.id, { method: 'DELETE' })
  await assert.rejects(post('/api/pos/checkout', {
    items: [{ productId: extra.id, quantity: 1 }], paidAmount: 5000,
  }), /diarsipkan/)
  const deleted = await apiFetch('/api/products/' + extra.id + '/hard-delete', { method: 'DELETE' })
  assert.equal(deleted.deleted.sku, 'LP000002')
  assert.equal((await apiFetch('/api/products')).products.length, 1)
})

test('previously sold product can be deleted permanently without removing practice receipt', async () => {
  const product = (await apiFetch('/api/products')).products.find(item => item.sku === 'LP000001')
  assert.ok(product)
  const historyBefore = (await apiFetch('/api/transactions')).transactions
  const snapshot = historyBefore.flatMap(tx => tx.items).find(item => item.sku === product.sku)
  assert.ok(snapshot)
  const deleted = await apiFetch('/api/products/' + product.id + '/hard-delete', { method: 'DELETE' })
  assert.equal(deleted.deleted.id,product.id)
  assert.equal((await apiFetch('/api/products')).products.some(item => item.id === product.id),false)
  const historyAfter = (await apiFetch('/api/transactions')).transactions
  const saved = historyAfter.flatMap(tx => tx.items).find(item => item.sku === product.sku)
  assert.ok(saved)
  assert.equal(saved.productId,null)
  assert.equal(saved.name,snapshot.name)
  assert.equal(saved.unitPrice,snapshot.unitPrice)
  assert.equal(saved.quantity,snapshot.quantity)
  assert.equal(saved.subtotal,snapshot.subtotal)
  const backup = JSON.parse(exportBackup())
  assert.equal(backup.data.products.some(item => item.id === product.id),false)
  assert.equal(backup.data.transactions.length,historyBefore.length)
})
