import { useEffect,useMemo,useRef,useState } from 'react'
import { cloudApiFetch } from './cloudApi.js'
import {
  DEMO_CATALOG,normalizeCatalog,findByBarcode,addToCart,
  setCartQty,cartTotal,getCashChange,checkoutDemo,receiptText,formatRupiah,
  normalizeCashInput,displayCashInput,
} from './publicCashier.js'
import './publicCashier.css'
import './publicCashierGallery.css'
import { createReceiptPdf, receiptPdfFilename } from './receiptPdf.js'

function ProductPhoto({product}){
  return <span className="pc-gallery-photo">
    {product.imageUrl ? (
      <img src={product.imageUrl} alt="" loading="lazy"
        onError={event=>{
          event.currentTarget.hidden=true
          event.currentTarget.parentElement.classList.add('pc-gallery-photo--missing')
        }}/>
    ) : <span className="pc-gallery-placeholder" aria-hidden="true">▣</span>}
  </span>
}

function ReceiptDetails({receipt}) {
  const date=new Date(receipt.createdAt).toLocaleString('id-ID',{
    dateStyle:'short',timeStyle:'short',
  })
  return <div className="pc-receipt-document">
    <div className="pc-receipt-brand">LENTERA POS</div>
    <div className="pc-receipt-label">STRUK LATIHAN</div>
    <div className="pc-receipt-identity">
      <span>No. {receipt.id}</span>
      <span>{date}</span>
    </div>
    <div className="pc-receipt-items">
      {receipt.items.map(item=><div key={item.id} className="pc-receipt-item">
        <span><strong>{item.name}</strong>
          <small>{item.qty} × {formatRupiah(item.unitPrice)}</small>
        </span>
        <b>{formatRupiah(item.subtotal)}</b>
      </div>)}
    </div>
    <div className="pc-receipt-totals">
      <div><span>Total</span><b>{formatRupiah(receipt.totalAmount)}</b></div>
      <div><span>Uang diterima</span><b>{formatRupiah(receipt.paidAmount)}</b></div>
      <div><span>Kembalian</span><b>{formatRupiah(receipt.changeAmount)}</b></div>
    </div>
    <p className="pc-receipt-warning">BUKAN TRANSAKSI ASLI</p>
    <p className="pc-receipt-thanks">Terima kasih sudah belajar!</p>
  </div>
}

export default function PublicCashierPage(){
  const [catalog,setCatalog]=useState(DEMO_CATALOG)
  const [search,setSearch]=useState('')
  const [cart,setCart]=useState([])
  const [paidRaw,setPaidRaw]=useState('')
  const [manualName,setManualName]=useState('')
  const [manualPrice,setManualPrice]=useState('')
  const [receipt,setReceipt]=useState(null)
  const [salesCount,setSalesCount]=useState(0)
  const [notice,setNotice]=useState('')
  const searchInput=useRef(null)
  const drawerClose=useRef(null)
  const [cartOpen,setCartOpen]=useState(false)
  useEffect(()=>{
    let active=true
    cloudApiFetch('/api/public/catalog').then(data=>{
      if(!active)return
      const valid=normalizeCatalog(data.products)
      if(valid.length)setCatalog(valid)
    }).catch(()=>{ /* Tetap gunakan katalog latihan bawaan. */ })
    return()=>{active=false}
  },[])
  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase()
    return catalog.filter(p=>!q||[p.name,p.category,p.sku,p.barcode]
      .filter(Boolean).some(v=>String(v).toLowerCase().includes(q)))
  },[catalog,search])
  const total=cartTotal(cart),paid=Number(paidRaw||0)
  const payment=getCashChange(total,paid)
  const units=cart.reduce((sum,item)=>sum+item.qty,0)

  useEffect(()=>{
    if(!cartOpen)return
    const previousFocus=document.activeElement
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    drawerClose.current?.focus()
    const onKey=event=>{
      if(event.key==='Escape'){
        event.preventDefault()
        setCartOpen(false)
      }
      if(event.key!=='Tab')return
      const drawer=document.getElementById('pc-cart-panel')
      const elements=Array.from(drawer?.querySelectorAll('button:not(:disabled),input:not(:disabled)')||[])
        .filter(el=>el.getClientRects().length>0)
      if(!elements.length)return
      const first=elements[0],last=elements[elements.length-1]
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
    document.addEventListener('keydown',onKey)
    return ()=>{
      document.body.style.overflow=previousOverflow
      document.removeEventListener('keydown',onKey)
      if(previousFocus?.isConnected&&typeof previousFocus.focus==='function')previousFocus.focus()
    }
  },[cartOpen])

  function add(product){
    try{setCart(current=>addToCart(current,product));setReceipt(null);setNotice('')}
    catch(e){setNotice(e.message)}
  }
  function qty(id,quantity){
    try{setCart(current=>setCartQty(current,id,quantity));setReceipt(null);setNotice('')}
    catch(e){setNotice(e.message)}
  }
  function scanProduct(event){
    event.preventDefault()
    const product=findByBarcode(catalog,search)
    if(product)add(product)
    else setNotice('Kode tidak ditemukan dalam katalog latihan.')
    if(product)setSearch('')
    searchInput.current?.focus()
  }
  function manualProduct(event){
    event.preventDefault()
    const name=manualName.trim().replace(/\s+/g,' ').slice(0,100)
    const price=Number(manualPrice)
    if(name.length<2||!Number.isSafeInteger(price)||price<100||price>1_000_000){
      setNotice('Nama barang minimal 2 karakter; harga Rp100–Rp1.000.000.')
      return
    }
    const id='manual-'+name.toLocaleLowerCase('id-ID')+'-'+price
    add({id,name,sellingPrice:price,imageUrl:null})
    setManualName('');setManualPrice('')
    setNotice('')
  }
  function checkout(event){
    event.preventDefault()
    try{
      const next=checkoutDemo(cart,paid,new Date(),'LAT-'+String(salesCount+1).padStart(3,'0'))
      setReceipt(next)
      setSalesCount(count=>count+1)
      setCart([])
      setPaidRaw('')
      setNotice('')
    }catch(e){setNotice(e.message)}
  }
  async function copyReceipt(){
    if(!receipt)return
    try{await navigator.clipboard.writeText(receiptText(receipt));setNotice('Struk latihan disalin.')}
    catch{setNotice('Tidak bisa menyalin otomatis di browser ini.')}
  }
  function printReceipt(){
    if(!receipt)return
    window.print()
  }
  function downloadReceipt(){
    if(!receipt)return
    try {
      const pdf=createReceiptPdf(receipt)
      const url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'}))
      const anchor=document.createElement('a')
      anchor.href=url
      anchor.download=receiptPdfFilename(receipt)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(()=>URL.revokeObjectURL(url),2000)
      setNotice('')
    } catch(error) {
      setNotice('Gagal membuat PDF struk: '+error.message)
    }
  }

  return <main className="pc-page">
    <div className="pc-container">
      <header className="pc-header">
        <h1>Kasir Biasa</h1>
        <span className="pc-mode-label">Mode latihan</span>
      </header>
      <p className="pc-disclaimer" role="note">
        <span aria-hidden="true">ⓘ</span> Stok otomatis · Bukan transaksi asli
      </p>
      {notice&&<div role="status" aria-live="polite" className="pc-notice">{notice}</div>}
      <div className="pc-layout">
        <section className="pc-catalog-panel" aria-labelledby="pc-catalog-title">
          <div className="pc-panel-heading">
            <h2 id="pc-catalog-title">Produk</h2>
            <span className="pc-item-count">{catalog.length} produk</span>
          </div>
          <form className="pc-gallery-search" onSubmit={scanProduct} role="search">
            <label className="sr-only" htmlFor="pc-search">Cari barang atau scan barcode</label>
            <span className="pc-gallery-search-icon" aria-hidden="true">⌕</span>
            <input id="pc-search" ref={searchInput} type="search" autoComplete="off"
              placeholder="Cari barang atau scan barcode..."
              value={search} onChange={e=>setSearch(e.target.value)}/>
            <button type="submit" aria-label="Tambahkan produk berdasarkan barcode atau SKU"
              disabled={!search.trim()}>Enter</button>
          </form>
          <div className="pc-gallery-grid" aria-label="Daftar produk latihan">
            {filtered.map(product=><button type="button" className="pc-gallery-card" key={product.id}
              onClick={()=>add(product)}
              aria-label={'Tambahkan '+product.name+' ke keranjang, '+formatRupiah(product.sellingPrice)}>
              <ProductPhoto product={product}/>
              <span className="pc-gallery-details">
                <strong className="pc-gallery-name">{product.name}</strong>
                <span className="pc-gallery-price">{formatRupiah(product.sellingPrice)}</span>
              </span>
              <span className="pc-gallery-add" aria-hidden="true">+</span>
            </button>)}
            {!filtered.length&&<p className="pc-empty">Produk tidak ditemukan.</p>}
          </div>
          <details className="pc-manual">
            <summary>+ Barang manual</summary>
            <form onSubmit={manualProduct}>
              <label htmlFor="pc-custom-name" className="sr-only">Nama barang manual</label>
              <input id="pc-custom-name" value={manualName} maxLength={100} required
                onChange={e=>setManualName(e.target.value)} placeholder="Nama barang"/>
              <label htmlFor="pc-custom-price" className="sr-only">Harga barang manual (rupiah)</label>
              <input id="pc-custom-price" value={manualPrice} inputMode="numeric" type="number"
                min={100} max={1000000} step={1} required
                onChange={e=>setManualPrice(e.target.value)} placeholder="Harga (Rp)"/>
              <button type="submit">Tambah</button>
            </form>
          </details>
        </section>

        <aside id="pc-cart-panel"
          className={'pc-checkout-panel'+(cartOpen?' pc-checkout-panel--open':'')}
          aria-labelledby="pc-cart-title"
          aria-hidden={undefined}>
          <div className="pc-mobile-cart-heading">
            <span aria-hidden="true" className="pc-mobile-cart-handle"></span>
            <button ref={drawerClose} type="button" onClick={()=>setCartOpen(false)}
              aria-label="Tutup keranjang">✕</button>
          </div>
          <div className="pc-panel-heading">
            <h2 id="pc-cart-title">Keranjang <small>({units})</small></h2>
            <button type="button" className="pc-clear" disabled={!cart.length}
              onClick={()=>{setCart([]);setPaidRaw('');setReceipt(null);setNotice('')}}>Kosongkan</button>
          </div>
          <div className="pc-cart-list">
            {cart.length===0?<div className="pc-cart-empty">
              <span aria-hidden="true">▣</span><p>Belum ada barang</p>
            </div>:cart.map(item=><div className="pc-cart-item" key={item.id}>
              <div><strong>{item.name}</strong><small>{formatRupiah(item.unitPrice)} / unit</small></div>
              <div className="pc-quantity" aria-label={'Jumlah '+item.name}>
                <button type="button" onClick={()=>qty(item.id,item.qty-1)}
                  aria-label={'Kurangi '+item.name}>{item.qty===1?'×':'−'}</button>
                <span>{item.qty}</span>
                <button type="button" onClick={()=>qty(item.id,item.qty+1)}
                  aria-label={'Tambah '+item.name} disabled={item.qty>=99}>+</button>
              </div>
              <strong className="pc-item-price">{formatRupiah(item.qty*item.unitPrice)}</strong>
            </div>)}
          </div>
          <div className="pc-totals">
            <div className="pc-grand-total"><span>Total</span><strong>{formatRupiah(total)}</strong></div>
          </div>
          <form className="pc-payment" onSubmit={checkout}>
            <label htmlFor="pc-payment">Uang diterima</label>
            <input id="pc-payment" type="text" inputMode="numeric"
              autoComplete="off" placeholder="0" maxLength={13} value={displayCashInput(paidRaw)}
              onChange={e=>setPaidRaw(normalizeCashInput(e.target.value))}/>
            <div className="pc-quick-cash" aria-label="Pilihan uang cepat">
              {[10000,20000,50000,100000].map(amount=>
                <button key={amount} type="button" onClick={()=>setPaidRaw(String(amount))}>
                  {amount/1000}K
                </button>)}
              <button type="button" onClick={()=>setPaidRaw(String(total))} disabled={!cart.length}>Uang pas</button>
            </div>
            <div className="pc-change">
              <span>Kembalian</span>
              <strong>{formatRupiah(payment.valid?payment.change:0)}</strong>
            </div>
            {cart.length>0&&paidRaw&&!payment.valid&&
              <p className="pc-shortage" role="status">{payment.reason}</p>}
            <button className="pc-checkout-button" type="submit"
              disabled={!cart.length||!payment.valid}>
              Selesaikan
            </button>
          </form>
          {receipt&&<section className="pc-receipt" aria-label="Struk transaksi latihan" role="status">
            <ReceiptDetails receipt={receipt}/>
            <div className="pc-receipt-actions">
              <button type="button" onClick={printReceipt}>Cetak struk</button>
              <button type="button" onClick={downloadReceipt}>Unduh PDF</button>
              <button type="button" onClick={copyReceipt}>Salin</button>
            </div>
          </section>}
        </aside>
      </div>
    </div>
    <button type="button" className="pc-cart-fab" aria-controls="pc-cart-panel"
      aria-expanded={cartOpen} aria-label={'Buka keranjang, '+units+' barang'}
      onClick={()=>setCartOpen(true)}>
      <span aria-hidden="true">🛒</span>
      <strong>{units}</strong>
    </button>
    {cartOpen&&<button type="button" className="pc-cart-backdrop"
      aria-label="Tutup panel keranjang" onClick={()=>setCartOpen(false)}/>}
    <div className="pc-print-stage" aria-hidden="true">
      {receipt&&<ReceiptDetails receipt={receipt}/>}
    </div>
  </main>
}
