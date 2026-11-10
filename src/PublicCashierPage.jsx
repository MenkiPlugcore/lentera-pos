import { useEffect,useMemo,useRef,useState } from 'react'
import { cloudApiFetch } from './cloudApi.js'
import {
  DEMO_STOCK,DEMO_CATALOG,normalizeCatalog,findByBarcode,addToCart,
  setCartQty,cartTotal,getCashChange,checkoutDemo,receiptText,formatRupiah,
} from './publicCashier.js'
import './publicCashier.css'

const prettyInput=value=>String(value||'').replace(/\B(?=(\d{3})+(?!\d))/g,'.')

function ProductPhoto({product}){
  return <div className="pc-product-image">
    {product.imageUrl?<img src={product.imageUrl} alt="" loading="lazy"
      onError={e=>{e.currentTarget.hidden=true;e.currentTarget.parentElement.classList.add('pc-product-image--missing')}}/>
      :<span aria-hidden="true">▣</span>}
  </div>
}

export default function PublicCashierPage(){
  const [catalog,setCatalog]=useState(DEMO_CATALOG)
  const [catalogStatus,setCatalogStatus]=useState('Memuat katalog...')
  const [search,setSearch]=useState('')
  const [scan,setScan]=useState('')
  const [cart,setCart]=useState([])
  const [paidRaw,setPaidRaw]=useState('')
  const [manualName,setManualName]=useState('')
  const [manualPrice,setManualPrice]=useState('')
  const [receipt,setReceipt]=useState(null)
  const [salesCount,setSalesCount]=useState(0)
  const [notice,setNotice]=useState('')
  const barcodeInput=useRef(null)
  useEffect(()=>{
    let active=true
    cloudApiFetch('/api/public/catalog').then(data=>{
      if(!active)return
      const valid=normalizeCatalog(data.products)
      if(valid.length){setCatalog(valid);setCatalogStatus('Katalog produk latihan')}
      else setCatalogStatus('Memakai katalog latihan bawaan')
    }).catch(()=>{
      if(active)setCatalogStatus('Katalog latihan bawaan · offline')
    })
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
    const product=findByBarcode(catalog,scan)
    if(product){add(product);setNotice('Barang ditambahkan: '+product.name)}
    else setNotice('Kode tidak ditemukan dalam katalog latihan.')
    setScan('')
    barcodeInput.current?.focus()
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
    setNotice('Barang latihan ditambahkan.')
  }
  function checkout(event){
    event.preventDefault()
    try{
      const next=checkoutDemo(cart,paid,new Date(),'LAT-'+String(salesCount+1).padStart(3,'0'))
      setReceipt(next)
      setSalesCount(count=>count+1)
      setCart([])
      setPaidRaw('')
      setNotice('Transaksi latihan selesai. Stok virtual otomatis bertambah '+next.restockedUnits+' unit dan kembali ke '+DEMO_STOCK+'.')
    }catch(e){setNotice(e.message)}
  }
  async function copyReceipt(){
    if(!receipt)return
    try{await navigator.clipboard.writeText(receiptText(receipt));setNotice('Struk latihan disalin.')}
    catch{setNotice('Tidak bisa menyalin otomatis di browser ini.')}
  }

  return <main className="pc-page">
    <div className="pc-container">
      <header className="pc-header">
        <div>
          <p className="pc-eyebrow">LENTERA POS · KASIR LATIHAN UMUM</p>
          <h1>Kasir Biasa</h1>
          <p>Pilih barang, atur jumlah, terima pembayaran, dan hitung kembalian. Tidak perlu akun.</p>
        </div>
        <div className="pc-header-badges">
          <span>✓ Tanpa login</span><span>✓ Stok otomatis</span>
        </div>
      </header>
      <section className="pc-disclaimer" aria-label="Informasi mode edukasi">
        <span className="pc-disclaimer-icon" aria-hidden="true">ⓘ</span>
        <div><strong>Mode edukasi — bukan transaksi asli.</strong>
          <p>Barang dan harga mengikuti katalog latihan. Stok virtual selalu tersedia dan diisi kembali setelah transaksi. Data stok, pembayaran, dan omzet kasir admin tidak berubah.</p>
        </div>
      </section>
      <div className="pc-stats">
        <div><span>Jenis produk</span><strong>{catalog.length}</strong></div>
        <div><span>Stok per barang</span><strong>{DEMO_STOCK} <small>otomatis</small></strong></div>
        <div><span>Transaksi latihan</span><strong>{salesCount}</strong></div>
      </div>
      {notice&&<div role="status" aria-live="polite" className="pc-notice">{notice}</div>}
      <div className="pc-grid">
        <section className="pc-catalog-panel" aria-labelledby="pc-catalog-title">
          <div className="pc-panel-heading">
            <div><span className="pc-section-tag">1. PILIH BARANG</span>
              <h2 id="pc-catalog-title">Katalog Barang</h2></div>
            <span className="pc-source">{catalogStatus}</span>
          </div>
          <form className="pc-scan" onSubmit={scanProduct}>
            <label htmlFor="pc-barcode">Scan atau ketik barcode / SKU</label>
            <div><input id="pc-barcode" ref={barcodeInput} value={scan}
              onChange={e=>setScan(e.target.value)} autoComplete="off"
              placeholder="Scan barcode lalu Enter"/>
              <button type="submit" disabled={!scan.trim()}>Tambah</button></div>
          </form>
          <label className="pc-search-label" htmlFor="pc-search">Cari produk</label>
          <input id="pc-search" className="pc-search" type="search" placeholder="Cari nama produk..."
            value={search} onChange={e=>setSearch(e.target.value)} />
          <div className="pc-products" aria-live="polite">
            {filtered.map(product=><article className="pc-product" key={product.id}>
              <ProductPhoto product={product}/>
              <div className="pc-product-meta">
                <span>{product.category||'Produk'}</span><h3>{product.name}</h3>
                <strong>{formatRupiah(product.sellingPrice)}</strong>
                <small>Stok latihan: {DEMO_STOCK} • isi ulang otomatis</small>
              </div>
              <button type="button" onClick={()=>add(product)}
                aria-label={'Tambahkan '+product.name+' ke keranjang'}>+ Tambah</button>
            </article>)}
            {!filtered.length&&<p className="pc-empty">Produk tidak ditemukan. Coba kata kunci lain atau tambahkan barang manual.</p>}
          </div>
          <details className="pc-manual">
            <summary>+ Tambahkan barang manual (latihan)</summary>
            <form onSubmit={manualProduct}>
              <label htmlFor="pc-custom-name">Nama barang</label>
              <input id="pc-custom-name" value={manualName} maxLength={100} required
                onChange={e=>setManualName(e.target.value)} placeholder="Contoh: Roti Cokelat"/>
              <label htmlFor="pc-custom-price">Harga (Rp)</label>
              <input id="pc-custom-price" value={manualPrice} inputMode="numeric" type="number"
                min={100} max={1000000} step={1} required
                onChange={e=>setManualPrice(e.target.value)} placeholder="5000"/>
              <button type="submit">Tambahkan ke keranjang</button>
            </form>
            <p>Barang manual hanya berlaku untuk keranjang ini dan tidak masuk database.</p>
          </details>
        </section>

        <aside className="pc-checkout-panel" aria-labelledby="pc-cart-title">
          <div className="pc-panel-heading">
            <div><span className="pc-section-tag">2. KERANJANG & PEMBAYARAN</span>
              <h2 id="pc-cart-title">Kasir</h2></div>
            <button type="button" className="pc-clear" disabled={!cart.length}
              onClick={()=>{setCart([]);setPaidRaw('');setReceipt(null);setNotice('Keranjang dikosongkan.')}}>Kosongkan</button>
          </div>
          <div className="pc-cart-list">
            {cart.length===0?<div className="pc-cart-empty">
              <span aria-hidden="true">▣</span><p>Keranjang kosong</p>
              <small>Pilih barang dari katalog untuk mulai.</small>
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
            <div><span>{units} unit barang</span><strong>{cart.length} jenis</strong></div>
            <div className="pc-grand-total"><span>Total belanja</span><strong>{formatRupiah(total)}</strong></div>
          </div>
          <form className="pc-payment" onSubmit={checkout}>
            <label htmlFor="pc-payment">Uang diterima (Rp)</label>
            <input id="pc-payment" type="text" inputMode="numeric" pattern="[0-9]*"
              autoComplete="off" placeholder="0" value={prettyInput(paidRaw)}
              onChange={e=>setPaidRaw(e.target.value.replace(/\D/g,'').slice(0,10))}/>
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
              ✓ Selesaikan Transaksi Latihan
            </button>
            <p className="pc-payment-note">Setelah selesai, keranjang kosong dan stok latihan kembali ke {DEMO_STOCK} unit.</p>
          </form>
          {receipt&&<section className="pc-receipt" aria-label="Struk transaksi latihan" role="status">
            <div className="pc-receipt-header">
              <strong>TRANSAKSI LATIHAN BERHASIL</strong>
              <small>{receipt.id}</small>
            </div>
            <p><strong>Struk edukasi</strong> · Bukan pembayaran asli</p>
            <div className="pc-receipt-items">
              {receipt.items.map(item=><div key={item.id}>
                <span>{item.qty} × {item.name}</span><b>{formatRupiah(item.subtotal)}</b>
              </div>)}
            </div>
            <div className="pc-receipt-totals">
              <div><span>Total</span><b>{formatRupiah(receipt.totalAmount)}</b></div>
              <div><span>Uang diterima</span><b>{formatRupiah(receipt.paidAmount)}</b></div>
              <div><span>Kembalian</span><b>{formatRupiah(receipt.changeAmount)}</b></div>
            </div>
            <p className="pc-restock-line">↻ Stok latihan otomatis ditambah {receipt.restockedUnits} unit.</p>
            <button type="button" className="pc-copy-receipt" onClick={copyReceipt}>Salin struk</button>
          </section>}
        </aside>
      </div>
    </div>
  </main>
}
