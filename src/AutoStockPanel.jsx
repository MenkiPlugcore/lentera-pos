import { useEffect, useState } from 'react'
import { cloudApiFetch } from './cloudApi.js'

export default function AutoStockPanel() {
  const [policy,setPolicy]=useState({enabled:false,refillQuantity:20})
  const [loaded,setLoaded]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  useEffect(()=>{
    let live=true
    cloudApiFetch('/api/stock-policy').then(data=>{
      if(live){setPolicy(data.policy);setLoaded(true)}
    }).catch(problem=>{if(live)setError(problem.message)})
    return ()=>{live=false}
  },[])

  async function save(event) {
    event.preventDefault()
    const count=Number(policy.refillQuantity)
    if(!Number.isInteger(count)||count<1||count>1000){
      setError('Jumlah stok isi ulang harus 1–1.000 unit.');return
    }
    if(policy.enabled && !window.confirm('Aktifkan isi ulang stok OTOMATIS untuk penjualan sebenarnya? Stok bisa bertambah secara virtual meskipun barang fisik belum datang. Gunakan untuk simulasi atau barang yang selalu tersedia.')){
      return
    }
    setBusy(true);setError('');setMessage('')
    try {
      const data=await cloudApiFetch('/api/stock-policy',{
        method:'PATCH',
        body:JSON.stringify({enabled:Boolean(policy.enabled),refillQuantity:count}),
      })
      setPolicy(data.policy)
      setMessage(data.policy.enabled
        ? 'Auto-restock aktif. Produk yang habis akan diisi ulang sebanyak '+data.policy.refillQuantity+' unit saat checkout. Riwayat stok tetap dicatat.'
        : 'Auto-restock nonaktif. Stok kini mengikuti jumlah persediaan yang tercatat.')
    } catch(problem){setError(problem.message)}
    finally{setBusy(false)}
  }

  return <section className="mt-5 border-t border-slate-800 pt-5">
    <h3 className="text-lg font-black">Isi Ulang Stok Otomatis</h3>
    <p className="mt-1 text-sm leading-6 text-slate-400">
      Jika diaktifkan, sistem dapat mengisi ulang produk ketika stok 0 atau kurang dari jumlah pesanan.
      Berlaku untuk checkout kasir dan Smart Cafe. Semua tambahan stok dicatat sebagai <strong>restock</strong>.
    </p>
    <p className="mt-3 rounded-xl border border-amber-900 bg-amber-950/50 p-3 text-sm text-amber-100">
      Perhatian: stok virtual bukan bukti barang fisik tersedia. Pengaturan ini nonaktif secara default dan sebaiknya digunakan untuk praktik/simulasi, bukan inventaris nyata.
    </p>
    {error&&<p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    {message&&<p role="status" className="mt-3 text-sm text-emerald-300">{message}</p>}
    {!loaded?<p className="mt-3 text-sm text-slate-400">Memuat pengaturan stok...</p>:
      <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold">
          <input type="checkbox" checked={policy.enabled}
            onChange={event=>setPolicy(old=>({...old,enabled:event.target.checked}))}
            className="h-5 w-5 accent-cyan-500"/>
          Aktifkan Auto-restock
        </label>
        <label className="block text-sm font-bold">
          Jumlah unit per isi ulang
          <input className="input mt-2 block w-36" type="number" min={1} max={1000} step={1}
            value={policy.refillQuantity} onChange={event=>setPolicy(old=>({...old,refillQuantity:event.target.value}))}/>
        </label>
        <button className="primary-button min-h-12 px-5" disabled={busy} type="submit">
          {busy?'Menyimpan...':'Simpan Pengaturan'}
        </button>
      </form>}
  </section>
}
