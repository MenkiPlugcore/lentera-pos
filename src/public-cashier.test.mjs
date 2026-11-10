import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  DEMO_STOCK,DEMO_CATALOG,normalizeCatalog,findByBarcode,
  addToCart,setCartQty,cartTotal,getCashChange,checkoutDemo,receiptText,formatRupiah,
} from './publicCashier.js'
import {handlePublicApi} from '../worker/public.js'

const book={id:'buku',name:'Buku',sellingPrice:6000,barcode:'899001',sku:'LP000001',imageUrl:null}
const pen={id:'pulpen',name:'Pulpen',sellingPrice:3000,barcode:'899002',sku:'LP000002',imageUrl:null}

test('public cashier has a built-in offline catalog and virtual stock for education',()=>{
  assert.ok(DEMO_CATALOG.length>=5)
  assert.equal(DEMO_STOCK,100)
  assert.ok(DEMO_CATALOG.every(x=>x.sellingPrice>0))
})
test('public catalog is cleaned, ignores invalid prices and duplicates, and exposes barcode lookup',()=>{
  const rows=[
    {id:'buku',name:'Buku',sellingPrice:'6000',sku:'LP000001',barcode:'899001'},
    {id:'buku',name:'Duplicate',sellingPrice:5000},
    {id:'invalid',name:'Broken',sellingPrice:'-2'},
    {id:'pulpen',name:'Pulpen',sellingPrice:3000,barcode:'899002'},
  ]
  const result=normalizeCatalog(rows)
  assert.equal(result.length,2)
  assert.equal(result[0].sellingPrice,6000)
  assert.equal(findByBarcode(result,'LP000001').id,'buku')
  assert.equal(findByBarcode(result,'899001').id,'buku')
  assert.equal(findByBarcode(result,'899002').id,'pulpen')
  assert.equal(findByBarcode(result,'unlisted'),null)
})
test('cart supports adding, incrementing, decrementing and removing without stock constraints',()=>{
  let cart=addToCart([],book)
  cart=addToCart(cart,book)
  cart=addToCart(cart,pen)
  assert.equal(cart.length,2)
  assert.equal(cartTotal(cart),15000)
  assert.equal(cart[0].qty,2)
  cart=setCartQty(cart,book.id,1)
  assert.equal(cartTotal(cart),9000)
  cart=setCartQty(cart,book.id,0)
  assert.equal(cart.length,1)
  assert.equal(cartTotal(cart),3000)
  assert.throws(()=>setCartQty(cart,pen.id,100),/0–99/)
})
test('checkout returns correct cash change, simulated receipt, and replenishment info',()=>{
  const cart=addToCart(addToCart(addToCart([],book),book),pen)
  const before=JSON.stringify(cart)
  const result=checkoutDemo(cart,20000,new Date('2026-11-10T00:00:00Z'),'LAT-001')
  assert.equal(result.totalAmount,15000)
  assert.equal(result.paidAmount,20000)
  assert.equal(result.changeAmount,5000)
  assert.equal(result.restockedUnits,3)
  assert.equal(result.stockAfter,DEMO_STOCK)
  assert.equal(result.simulation,true)
  assert.equal(cart[0].qty,2)
  assert.equal(JSON.stringify(cart),before)
  const printed=receiptText(result)
  assert.match(printed,/STRUK LATIHAN/)
  assert.match(printed,/BUKAN TRANSAKSI/)
  assert.match(printed,/5\.000/)
  assert.match(formatRupiah(20000),/20\.000/)
})
test('insufficient payment is rejected without producing transactions',()=>{
  const cart=addToCart([],book)
  assert.equal(getCashChange(6000,5000).valid,false)
  assert.equal(getCashChange(6000,6000).change,0)
  assert.throws(()=>checkoutDemo(cart,5000),/kurang/)
  assert.throws(()=>checkoutDemo([],10000),/Pilih barang/)
})
test('all practice stock is replenished after every consecutive checkout',()=>{
  const cart=addToCart([],book)
  const first=checkoutDemo(cart,10000)
  const second=checkoutDemo(cart,10000)
  assert.equal(first.stockAfter,100)
  assert.equal(second.stockAfter,100)
  assert.equal(first.restockedUnits,1)
  assert.equal(second.restockedUnits,1)
})
test('public catalog remains read-only and includes barcode and SKU for hardware scanner',async()=>{
  const queries=[]
  const db={query:async(sql)=>{queries.push(sql);return []}}
  const response=await handlePublicApi({db,path:'/api/public/catalog',method:'GET'})
  assert.equal(response.status,200)
  assert.equal(queries.length,1)
  assert.match(queries[0],/SELECT p\.id,p\.name,p\.sku,p\.barcode/)
  assert.doesNotMatch(queries[0],/UPDATE|INSERT|DELETE|stock_movements|transactions/i)
  const post=await handlePublicApi({db,path:'/api/public/catalog',method:'POST'})
  assert.equal(post.status,405)
  assert.equal(queries.length,1)
})
test('public UI has no authenticated cashier APIs or real checkout writes',()=>{
  const ui=readFileSync(new URL('./PublicCashierPage.jsx',import.meta.url),'utf8')
  const core=readFileSync(new URL('./publicCashier.js',import.meta.url),'utf8')
  const entry=readFileSync(new URL('./main.jsx',import.meta.url),'utf8')
  const home=readFileSync(new URL('./PublicHomePage.jsx',import.meta.url),'utf8')
  assert.match(ui,/cloudApiFetch\('\/api\/public\/catalog'\)/)
  assert.match(ui,/checkoutDemo\(cart,paid/)
  assert.match(ui,/Stok virtual selalu tersedia/)
  assert.match(entry,/path === '\/kasir-umum' \|\| path === '\/game'/)
  assert.match(entry,/if \(path === '\/kasir'\) return <CloudGate>/)
  assert.match(home,/label:'Kasir Biasa'/)
  assert.doesNotMatch(ui,/\/api\/checkout|\/api\/transactions|\/api\/game\/answer|\/api\/products/)
  assert.doesNotMatch(core,/fetch\(|db\.query|UPDATE public\.products|INSERT INTO public\.transactions/)
})
