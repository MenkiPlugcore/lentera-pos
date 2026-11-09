import { useEffect, useState } from 'react'
import { cloudApiFetch } from './cloudApi.js'

const rupiah = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value)||0)

export default function PublicHomePage() {
  const [products,setProducts]=useState([])
  const [error,setError]=useState('')
  useEffect(()=>{
    let live=true
    cloudApiFetch('/api/public/catalog').then(data=>{
      if(live)setProducts((data.products||[]).slice(0,12))
    }).catch(problem=>{if(live)setError(problem.message)})
    return ()=>{live=false}
  },[])

  return <main className="min-h-screen bg-slate-950 text-slate-100">
    <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[.3em] text-cyan-300">HOMESCHOOLING LENTERA HATI · MEDIA BELAJAR</p>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
            Belajar jadi kasir lewat <span className="text-cyan-300">simulasi seru.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-200">
            Sambut pelanggan, hitung belanja, dan susun uang kembalian dengan gambar uang interaktif.
            Bisa bermain tanpa login dan tanpa memengaruhi stok atau transaksi asli.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/simulasi" className="primary-button inline-flex min-h-14 items-center justify-center px-7 text-lg font-black">Main Simulasi Pelanggan</a>
            <a href="/game" className="secondary-button inline-flex min-h-14 items-center justify-center px-5 font-bold">Kasir Pintar</a>
          </div>
          <p className="mt-4 text-sm text-slate-300">Gratis untuk latihan · Tanpa timer · Ramah pembelajaran bertahap</p>
        </div>
        <div aria-hidden="true" className="rounded-3xl border border-cyan-700/50 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/30">
          <div className="flex items-center justify-between rounded-xl bg-slate-800 p-4"><span className="font-bold">Pelanggan sedang membeli...</span><span className="text-3xl">🛍️</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-800 bg-slate-950 p-5"><p className="text-sm text-slate-300">Total Belanja</p><p className="mt-2 text-3xl font-black">Rp13.000</p></div>
            <div className="rounded-2xl border border-cyan-600 bg-cyan-950 p-5"><p className="text-sm text-cyan-200">Uang Diterima</p><p className="mt-2 text-3xl font-black">Rp20.000</p></div>
          </div>
          <div className="mt-4 rounded-2xl border-2 border-dashed border-emerald-700 bg-emerald-950/30 p-5">
            <p className="text-sm text-slate-200">Bantu siapkan uang kembalian:</p>
            <div className="mt-3 flex gap-3">
              <span className="rounded-lg bg-amber-100 px-4 py-3 font-black text-slate-900">5.000</span>
              <span className="rounded-lg bg-slate-200 px-4 py-3 font-black text-slate-900">2.000</span>
            </div>
            <p className="mt-4 text-xl font-black text-emerald-300">Kembalian Rp7.000</p>
          </div>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-12">
      <h2 className="text-2xl font-black">Pilih Aktivitas Belajar</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <a href="/simulasi" className="rounded-3xl border border-cyan-800 bg-slate-900 p-6 hover:border-cyan-400">
          <span className="text-4xl">🧑‍🍳</span><h3 className="mt-4 text-xl font-black">Pelanggan Virtual</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Lihat pesanan, pilih uang kertas dan koin, lalu berikan kembalian.</p>
        </a>
        <a href="/game" className="rounded-3xl border border-slate-700 bg-slate-900 p-6 hover:border-cyan-400">
          <span className="text-4xl">🧮</span><h3 className="mt-4 text-xl font-black">Kasir Pintar</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Jawab lima tantangan matematika dan kumpulkan skor serta XP.</p>
        </a>
        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <span className="text-4xl">🏫</span><h3 className="mt-4 text-xl font-black">Pendampingan Guru</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Siswa bisa belajar dengan instruksi bertahap, tanpa batas waktu atau tekanan.</p>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 pb-16">
      <h2 className="text-2xl font-black">Contoh Produk untuk Latihan</h2>
      <p className="mt-2 text-sm text-slate-400">Diambil dari katalog LENTERA POS. Ini bukan toko online atau halaman checkout.</p>
      {error && <p role="status" className="mt-4 text-sm text-amber-300">Katalog belum dapat dimuat: {error}</p>}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map(p=><article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900" key={p.id}>
          {p.imageUrl?<img loading="lazy" className="h-36 w-full object-cover" src={p.imageUrl} alt={p.name}/>:<div className="grid h-36 place-items-center bg-slate-800 text-4xl">🛒</div>}
          <div className="p-4"><p className="font-black">{p.name}</p><p className="mt-2 text-cyan-300">{rupiah(p.sellingPrice)}</p></div>
        </article>)}
      </div>
    </section>
    <footer className="border-t border-slate-800 px-5 py-6 text-center text-sm text-slate-500">
      LENTERA POS · Media pembelajaran interaktif · <a href="/admin" className="text-cyan-300 underline">Masuk Admin</a>
    </footer>
  </main>
}
