// Keranjang latihan multi-item. Murni, tidak menulis stok/penjualan.
// Jumlah jenis produk meningkat selama lima pelanggan: 2, 3, 3, 4, 5.
const FALLBACK_CATALOG = Object.freeze([
  { name:'Pensil', selling_price:1500 },
  { name:'Pulpen', selling_price:3000 },
  { name:'Buku Tulis', selling_price:6000 },
  { name:'Air Mineral', selling_price:5000 },
  { name:'Penghapus', selling_price:2000 },
  { name:'Roti', selling_price:5000 },
])
const PAYMENT_NOTES = [10000,20000,50000,100000,200000,500000,1000000,2000000]
const SIZES = [2,3,3,4,5]

export function basketSizeForRound(round) {
  const normalized = Number.isInteger(Number(round)) ? Math.trunc(Number(round)) : 1
  return SIZES[Math.max(0,Math.min(4,normalized-1))]
}
function validProduct(row) {
  const name = String(row?.name || '').trim()
  const price = Number(row?.selling_price ?? row?.sellingPrice)
  if (!name || name.length > 120 || !Number.isSafeInteger(price) ||
      price < 100 || price > 100000 || price % 100 !== 0) return null
  const url = String(row?.image_url ?? row?.imageUrl ?? '')
  return {
    productId:typeof row?.id === 'string' ? row.id : null,
    name,unitPrice:price,
    imageUrl:/^https:\/\/[a-z0-9.-]+\//i.test(url) && url.length < 800 ? url : null,
  }
}
function draw(pool, random) {
  const index = Math.abs(Math.trunc(random(pool.length))) % pool.length
  return pool.splice(index,1)[0]
}
export function createPracticeBasket(catalog, round, random=max=>
  crypto.getRandomValues(new Uint32Array(1))[0] % max) {
  const desired = basketSizeForRound(round)
  const pool = []
  const seen = new Set()
  for (const row of Array.isArray(catalog) ? catalog : []) {
    const item = validProduct(row)
    if (!item || seen.has(item.name.toLocaleLowerCase('id-ID'))) continue
    seen.add(item.name.toLocaleLowerCase('id-ID'))
    pool.push(item)
  }
  for (const row of FALLBACK_CATALOG) {
    if (pool.length >= desired) break
    const item = validProduct(row)
    if (!seen.has(item.name.toLocaleLowerCase('id-ID'))) {
      seen.add(item.name.toLocaleLowerCase('id-ID'))
      pool.push(item)
    }
  }
  if (pool.length < desired) throw new Error('Katalog latihan tidak mencukupi.')
  const stage = Math.max(1,Math.min(5,Math.trunc(Number(round)) || 1))
  const maxQuantity = stage <= 2 ? 1 : stage <= 4 ? 2 : 3
  const items = []
  let totalAmount = 0
  for (let i=0; i<desired; i++) {
    const product=draw(pool,random)
    const quantity=1 + Math.abs(Math.trunc(random(maxQuantity))) % maxQuantity
    const subtotal=product.unitPrice*quantity
    totalAmount+=subtotal
    items.push({ ...product, quantity, subtotal })
  }
  if (!Number.isSafeInteger(totalAmount) || totalAmount > 2147483647)
    throw new Error('Total latihan terlalu besar.')
  const paidAmount=PAYMENT_NOTES.find(value=>value>=totalAmount+500)
    || Math.ceil((totalAmount+500)/100000)*100000
  if (paidAmount > 2147483647) throw new Error('Pembayaran latihan terlalu besar.')
  return { items, totalAmount, paidAmount, correctChange:paidAmount-totalAmount,
    difficulty:stage }
}

// Untuk melanjutkan soal satu barang dari versi lama tanpa migrasi data lama.
export function challengeItems(row) {
  if (Array.isArray(row?.items) && row.items.length > 0) return row.items
  const quantity=Number(row?.quantity)||1
  const unitPrice=Number(row?.unit_price ?? row?.unitPrice)||0
  return [{productId:null,name:String(row?.item_name ?? row?.itemName ?? 'Produk'),
    quantity,unitPrice,subtotal:quantity*unitPrice,imageUrl:null}]
}
