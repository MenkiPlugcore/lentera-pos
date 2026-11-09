import { useEffect, useMemo, useState } from 'react'
import { cloudApiFetch } from './cloudApi.js'

const rupiah = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value)||0)
const STATUS = {pending:'Menunggu Pembayaran',preparing:'Sedang Dibuat',ready:'Siap Diantar',served:'Selesai Diantar',cancelled:'Dibatalkan'}
const TABS = [{id:'kasir',name:'Kasir / Pesanan'},{id:'barista',name:'Barista / Dapur'},{id:'pelayan',name:'Pelayan / Antar'}]

export default function CafePage() {
  const [tab,setTab] = useState('kasir')
  const [products,setProducts] = useState([])
  const [autoRefill,setAutoRefill] = useState(false)
  const [orders,setOrders] = useState([])
  const [tableLabel,setTableLabel] = useState('Meja 1')
  const [notes,setNotes] = useState('')
  const [cart,setCart] = useState({})
  const [paid,setPaid] = useState({})
  const [busy,setBusy] = useState(false)
  const [notice,setNotice] = useState('')
  const [error,setError] = useState('')

  async function reload(quiet=false) {
    try {
      const [p,o,settings] = await Promise.all([
        cloudApiFetch('/api/products'),
        cloudApiFetch('/api/cafe/orders'),
        cloudApiFetch('/api/stock-policy'),
      ])
      setAutoRefill(Boolean(settings.policy?.enabled))
      setProducts(p.products || [])
      setOrders(o.orders || [])
      setError('')
    } catch(e) { if(!quiet) setError(e.message) }
  }

  useEffect(()=>{
    reload()
    const timer=setInterval(()=>reload(true),10000)
    return ()=>clearInterval(timer)
  },[])

  const available = useMemo(()=>products.filter(p=>p.is_active && (Number(p.stock)>0 || autoRefill)),[products,autoRefill])
  const sum = useMemo(()=>available.reduce((s,p)=>s+Number(p.selling_price)*(cart[p.id]||0),0),[available,cart])
  const selected = useMemo(()=>orders.filter(o=>tab==='kasir' ? o.status==='pending'
    :tab==='barista' ? ['pending','preparing'].includes(o.status) && Boolean(o.transactionId)
    : ['ready','served'].includes(o.status)),[orders,tab])
  const history = useMemo(()=>orders.filter(o=>o.status==='cancelled' || o.status==='served'),[orders])
  function add(p,diff) {
    setCart(old=>{
      const quantity=Math.min(autoRefill?999:Number(p.stock),Math.max(0,(old[p.id]||0)+diff))
      return {...old,[p.id]:quantity}
    })
  }

  async function act(callback) {
    setBusy(true);setError('');setNotice('')
    try {await callback();await reload(true)}
    catch(e){setError(e.message)}
    finally{setBusy(false)}
  }

  function createOrder() {
    const items=Object.entries(cart).filter(([,qty])=>qty>0).map(([productId,quantity])=>({productId,quantity}))
    if(!items.length){setError('Pilih menu terlebih dahulu.');return}
    act(async()=>{
      const data=await cloudApiFetch('/api/cafe/orders',{
        method:'POST',body:JSON.stringify({tableLabel,notes,items})
      })
      setCart({});setNotes('')
      setNotice('Pesanan '+data.order.orderCode+' dibuat. Pembayaran dilakukan sebelum pesanan masuk dapur.')
    })
  }
  function payOrder(order) {
    const value=paid[order.id] || String(Math.round(Number(order.totalAmount)))
    act(async()=>{
      await cloudApiFetch('/api/cafe/orders/'+order.id+'/pay',{
        method:'POST',body:JSON.stringify({paidAmount:Number(value)})
      })
      setNotice(order.orderCode+' berhasil dibayar. Stok dan transaksi asli sudah diperbarui.')
    })
  }
  function updateStatus(order,status) {
    act(async()=>{
      await cloudApiFetch('/api/cafe/orders/'+order.id+'/status',{
        method:'POST',body:JSON.stringify({status})
      })
      setNotice(order.orderCode+' → '+STATUS[status])
    })
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">LENTERA · SMART CAFE</p>
          <h1 className="mt-1 text-3xl font-black">Pesanan Meja & Alur Tim</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">Pisahkan peran kasir, barista, dan pelayan. Antrean diperbarui otomatis setiap 10 detik. Pembayaran mengurangi stok dan dicatat ke laporan kasir asli.</p>
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map(t=><button key={t.id} type="button" onClick={()=>setTab(t.id)} className={'rounded-xl px-5 py-3 text-base font-bold '+(tab===t.id?'bg-cyan-500 text-slate-950':'border border-slate-700 bg-slate-900')}>{t.name}</button>)}
          <button onClick={()=>reload()} className="secondary-button" type="button">Muat Ulang</button>
        </div>
        {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-700 bg-emerald-950 p-3 text-emerald-200">{notice}</div>}
        {error && <div role="alert" className="mb-4 rounded-xl border border-rose-700 bg-rose-950 p-3 text-rose-200">{error}</div>}
        {tab==='kasir' && <section className="mb-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-black">1. Pilih Menu</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {available.map(p=><div key={p.id} className="flex gap-3 rounded-2xl border border-slate-700 p-3">
                {p.image_url?<img src={p.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover"/>:<div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-slate-800 text-3xl">☕</div>}
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-sm text-cyan-300">{rupiah(p.selling_price)}</p>
                  <p className="text-xs text-slate-500">Stok {p.stock}{autoRefill?' · Isi ulang otomatis aktif':''}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" onClick={()=>add(p,-1)} aria-label={'Kurangi '+p.name} className="rounded-lg bg-slate-700 px-3 py-2 font-black">−</button>
                    <span className="min-w-5 text-center font-bold">{cart[p.id]||0}</span>
                    <button type="button" onClick={()=>add(p,1)} aria-label={'Tambah '+p.name} className="rounded-lg bg-cyan-700 px-3 py-2 font-black">+</button>
                  </div>
                </div>
              </div>)}
              {!available.length && <p className="text-sm text-slate-400">Belum ada menu aktif dengan stok tersedia.</p>}
            </div>
          </div>
          <div className="self-start rounded-3xl border border-cyan-900 bg-slate-900 p-5">
            <h2 className="text-xl font-black">2. Buat Pesanan</h2>
            <label className="mt-4 block text-sm font-bold">Nomor meja / takeaway
              <input className="input mt-2 w-full" value={tableLabel} maxLength={30} onChange={e=>setTableLabel(e.target.value)} placeholder="Meja 1" />
            </label>
            <label className="mt-4 block text-sm font-bold">Catatan untuk dapur
              <textarea className="input mt-2 w-full" rows={2} value={notes} maxLength={300} onChange={e=>setNotes(e.target.value)} placeholder="Contoh: tanpa es" />
            </label>
            <div className="mt-5 flex items-center justify-between border-t border-slate-700 pt-4">
              <span className="font-bold">Total pesanan</span>
              <span className="text-2xl font-black text-cyan-300">{rupiah(sum)}</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Membuat pesanan belum memotong stok. Stok akan dipotong satu kali saat pembayaran berhasil.</p>
            <button className="primary-button mt-5 w-full py-4 text-base" disabled={busy || !sum || !tableLabel.trim()} onClick={createOrder}>Buat Pesanan Meja</button>
          </div>
        </section>}
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black">{tab==='kasir'?'Pesanan Belum Diproses':tab==='barista'?'Antrean Barista':'Antrean Pelayan'} ({selected.length})</h2>
            <span className="text-xs text-slate-400">Sinkronisasi berkala 10 detik</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {selected.map(order=><article key={order.id} className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="text-xs font-bold text-cyan-300">{order.orderCode}</p><h3 className="mt-1 text-xl font-black">{order.tableLabel}</h3></div>
                <span className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold">{STATUS[order.status]||order.status}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString('id-ID')}</p>
              <ul className="mt-4 space-y-1 text-sm">
                {(order.items||[]).map(i=><li key={i.id} className="flex justify-between gap-2"><span>{i.quantity}× {i.name}</span><span>{rupiah(i.subtotal)}</span></li>)}
              </ul>
              {order.notes && <p className="mt-3 rounded-lg bg-amber-950/50 p-2 text-sm text-amber-200">{order.notes}</p>}
              <p className="mt-4 border-t border-slate-800 pt-3 text-xl font-black">{rupiah(order.totalAmount)}</p>
              <p className="mt-1 text-xs">{order.transactionId?'Sudah dibayar · Masuk laporan asli':'Belum dibayar'}</p>
              {tab==='kasir' && !order.transactionId && <div className="mt-4 space-y-2">
                <label className="block text-sm font-bold">Uang diterima (Rp)
                  <input className="input mt-1 w-full" inputMode="numeric" value={paid[order.id]??String(Math.round(Number(order.totalAmount)))} onChange={e=>setPaid(v=>({...v,[order.id]:e.target.value.replace(/\D/g,'')}))} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="primary-button py-3" disabled={busy} onClick={()=>payOrder(order)}>Bayar</button>
                  <button className="secondary-button" disabled={busy} onClick={()=>updateStatus(order,'cancelled')}>Batalkan</button>
                </div>
              </div>}
              {tab==='barista' && order.status==='pending' && order.transactionId &&
                <button className="primary-button mt-4 w-full py-4" disabled={busy} onClick={()=>updateStatus(order,'preparing')}>Mulai Siapkan</button>}
              {tab==='barista' && order.status==='preparing' &&
                <button className="primary-button mt-4 w-full py-4" disabled={busy} onClick={()=>updateStatus(order,'ready')}>Pesanan Siap</button>}
              {tab==='pelayan' && order.status==='ready' &&
                <button className="primary-button mt-4 w-full py-4" disabled={busy} onClick={()=>updateStatus(order,'served')}>Sudah Diantar</button>}
            </article>)}
            {!selected.length && <p className="text-slate-400">Belum ada pesanan untuk tampilan ini.</p>}
          </div>
        </section>
        {tab==='kasir' && history.length>0 && <section className="mt-5 rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-black">Riwayat pesanan terbaru</h2>
          <div className="mt-3 space-y-2">
            {history.slice(0,15).map(o=><div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2 text-sm"><span>{o.orderCode} · {o.tableLabel}</span><span>{STATUS[o.status]} · {rupiah(o.totalAmount)}</span></div>)}
          </div>
        </section>}
      </div>
    </main>
  )
}
