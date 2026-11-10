// Public educational cashier; every transaction is simulated and in-memory.
// No mutations to Neon products, product stock, actual transactions, or accounting.
// Pisahkan angka mentah dari penampilannya agar 50.000 tetap valid saat dibayar.
export const normalizeCashInput=value=>String(value??'').replace(/\D/g,'').slice(0,10)
export const displayCashInput=value=>normalizeCashInput(value).replace(/\B(?=(\d{3})+(?!\d))/g,'.')
export const DEMO_STOCK=100
export const MAX_QTY=99
export const DEMO_CATALOG=Object.freeze([
  {id:'demo-buku',name:'Buku Tulis',sellingPrice:6000,sku:'DEMO001',barcode:'DEMO001',category:'Alat Tulis',imageUrl:null},
  {id:'demo-pulpen',name:'Pulpen',sellingPrice:3000,sku:'DEMO002',barcode:'DEMO002',category:'Alat Tulis',imageUrl:null},
  {id:'demo-pensil',name:'Pensil',sellingPrice:1500,sku:'DEMO003',barcode:'DEMO003',category:'Alat Tulis',imageUrl:null},
  {id:'demo-penghapus',name:'Penghapus',sellingPrice:2000,sku:'DEMO004',barcode:'DEMO004',category:'Alat Tulis',imageUrl:null},
  {id:'demo-air',name:'Air Mineral',sellingPrice:5000,sku:'DEMO005',barcode:'DEMO005',category:'Minuman',imageUrl:null},
  {id:'demo-roti',name:'Roti',sellingPrice:5000,sku:'DEMO006',barcode:'DEMO006',category:'Makanan',imageUrl:null},
])
const cleanText=(v,max=100)=>String(v??'').trim().replace(/\s+/g,' ').slice(0,max)
export function normalizeCatalog(rows) {
  const data=Array.isArray(rows)?rows:[]
  const seen=new Set()
  return data.flatMap((item,index)=>{
    const id=cleanText(item?.id||item?.sku||'demo-item-'+index,120)
    const name=cleanText(item?.name,120)
    const price=Number(item?.sellingPrice??item?.selling_price)
    if(!id||!name||!Number.isSafeInteger(price)||price<=0||price>1_000_000||seen.has(id))return []
    seen.add(id)
    const rawImg=String(item?.imageUrl??item?.image_url??'')
    return [{
      id,name,sellingPrice:price,sku:cleanText(item?.sku,100),
      barcode:cleanText(item?.barcode,100),category:cleanText(item?.category||'Produk',60),
      imageUrl:rawImg.startsWith('https://')&&rawImg.length<1000?rawImg:null,
    }]
  })
}
export function findByBarcode(catalog,raw) {
  const code=cleanText(raw,100).toLowerCase()
  if(!code)return null
  return (Array.isArray(catalog)?catalog:[]).find(item=>
    String(item.sku||'').toLowerCase()===code||
    String(item.barcode||'').toLowerCase()===code)||null
}
export function addToCart(cart,product) {
  if(!product||!product.id||!Number.isSafeInteger(product.sellingPrice)||product.sellingPrice<=0)
    throw new Error('Barang tidak valid.')
  const existing=cart.find(x=>x.id===product.id)
  if(existing){
    if(existing.qty>=MAX_QTY)throw new Error('Maksimal 99 unit per barang.')
    return cart.map(x=>x.id===product.id?{...x,qty:x.qty+1}:x)
  }
  if(cart.length>=60)throw new Error('Keranjang maksimal 60 jenis barang.')
  return [...cart,{id:product.id,name:product.name,unitPrice:product.sellingPrice,
    imageUrl:product.imageUrl||null,qty:1}]
}
export function setCartQty(cart,id,qty) {
  if(!Number.isInteger(qty)||qty<0||qty>MAX_QTY)throw new Error('Jumlah harus 0–99.')
  return qty===0?cart.filter(x=>x.id!==id):cart.map(x=>x.id===id?{...x,qty}:x)
}
export function cartTotal(cart) {
  if(!Array.isArray(cart))return 0
  return cart.reduce((sum,item)=>sum+item.qty*item.unitPrice,0)
}
export function getCashChange(total,paid) {
  if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(paid)||paid<0
    ||paid>1_000_000_000)return {valid:false,reason:'Masukkan nominal uang yang valid.'}
  if(paid<total)return {valid:false,reason:'Uang pelanggan masih kurang '+formatRupiah(total-paid)+'.'}
  return {valid:true,change:paid-total}
}
export const formatRupiah=value=>new Intl.NumberFormat('id-ID',{
  style:'currency',currency:'IDR',maximumFractionDigits:0,
}).format(Number(value)||0)
export function checkoutDemo(cart,paid,now=new Date(),id='DEMO-'+Date.now()) {
  if(!Array.isArray(cart)||cart.length===0)throw new Error('Pilih barang terlebih dahulu.')
  if(!cart.every(item=>Number.isInteger(item.qty)&&item.qty>0&&item.qty<=MAX_QTY&&
    Number.isSafeInteger(item.unitPrice)&&item.unitPrice>0))
    throw new Error('Keranjang tidak valid.')
  const total=cartTotal(cart)
  const payment=getCashChange(total,paid)
  if(!payment.valid)throw new Error(payment.reason)
  const items=cart.map(x=>({id:x.id,name:x.name,qty:x.qty,unitPrice:x.unitPrice,
    subtotal:x.qty*x.unitPrice}))
  // Once purchased, the same number of virtual units are restocked immediately.
  // Every item remains at DEMO_STOCK and NEVER touches the admin stock field.
  const restockedUnits=items.reduce((sum,item)=>sum+item.qty,0)
  return {id,createdAt:now.toISOString(),items,totalAmount:total,paidAmount:paid,
    changeAmount:payment.change,restockedUnits,stockAfter:DEMO_STOCK,
    simulation:true}
}
export function receiptText(receipt) {
  if(!receipt)return ''
  return [
    'LENTERA POS — STRUK LATIHAN',
    'BUKAN TRANSAKSI / PEMBAYARAN ASLI',
    '--------------------------------',
    receipt.id,new Date(receipt.createdAt).toLocaleString('id-ID'),
    '--------------------------------',
    ...receipt.items.map(item=>item.name+' | '+item.qty+' x '+formatRupiah(item.unitPrice)+' = '+formatRupiah(item.subtotal)),
    '--------------------------------',
    'TOTAL: '+formatRupiah(receipt.totalAmount),
    'TUNAI: '+formatRupiah(receipt.paidAmount),
    'KEMBALI: '+formatRupiah(receipt.changeAmount),
    'Stok latihan terisi ulang otomatis: +'+receipt.restockedUnits,
    'Terima kasih sudah belajar!',
  ].join('\n')
}
