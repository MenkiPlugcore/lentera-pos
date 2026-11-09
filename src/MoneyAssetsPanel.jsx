import { useEffect, useState } from 'react'
import { cloudApiFetch } from './cloudApi.js'
import { imageFileToDataUrl } from './localPos.js'
import { CASH_DENOMINATIONS } from './simulation/cashMoney.js'

const rupiah = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value)

export default function MoneyAssetsPanel() {
  const [money,setMoney]=useState([])
  const [loading,setLoading]=useState(true)
  const [busyValue,setBusyValue]=useState(null)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')

  async function reload() {
    const result=await cloudApiFetch('/api/money')
    setMoney(result.denominations||[])
  }
  useEffect(()=>{
    let mounted=true
    cloudApiFetch('/api/money').then(result=>{if(mounted)setMoney(result.denominations||[])})
      .catch(e=>{if(mounted)setError(e.message)})
      .finally(()=>{if(mounted)setLoading(false)})
    return ()=>{mounted=false}
  },[])

  async function upload(event,value) {
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file)return
    setBusyValue(value);setNotice('');setError('')
    try {
      const image=await imageFileToDataUrl(file)
      const uploaded=await cloudApiFetch('/api/media/upload',{
        method:'POST',body:JSON.stringify({image,purpose:'money'}),
      })
      await cloudApiFetch('/api/money/'+value,{
        method:'PATCH',body:JSON.stringify({imageUrl:uploaded.imageUrl}),
      })
      await reload()
      setNotice('Foto pecahan '+rupiah(value)+' berhasil disimpan ke Cloudinary.')
    } catch(problem){setError('Gagal mengunggah '+rupiah(value)+': '+problem.message)}
    finally{setBusyValue(null)}
  }

  async function remove(value) {
    if(!window.confirm('Hapus foto untuk pecahan '+rupiah(value)+'? Ilustrasi uang bawaan akan tetap tersedia.'))return
    setBusyValue(value);setNotice('');setError('')
    try {
      await cloudApiFetch('/api/money/'+value,{method:'PATCH',body:JSON.stringify({imageUrl:null})})
      await reload()
      setNotice('Gambar '+rupiah(value)+' dilepas dari halaman latihan.')
    } catch(problem){setError(problem.message)}
    finally{setBusyValue(null)}
  }

  return <section className="mt-5 border-t border-slate-800 pt-5">
    <h3 className="text-lg font-black">Gambar Uang & Koin · Cloudinary</h3>
    <p className="mt-1 text-sm leading-6 text-slate-400">
      Upload gambar sendiri untuk setiap nominal. Gambar akan muncul otomatis di laci uang halaman simulasi umum.
      Tanpa gambar, sistem menggunakan ilustrasi uang bawaan. Foto tersimpan di Cloudinary, URL di Neon.
    </p>
    <p className="mt-2 text-xs text-slate-500">Gunakan gambar uang yang boleh digunakan untuk pembelajaran. File maksimal 5 MB sebelum kompresi.</p>
    {notice&&<p role="status" className="mt-3 rounded-xl bg-emerald-950 p-3 text-sm text-emerald-200">{notice}</p>}
    {error&&<p role="alert" className="mt-3 rounded-xl bg-rose-950 p-3 text-sm text-rose-200">{error}</p>}
    {loading&&<p className="mt-4 text-sm text-slate-400">Memuat daftar pecahan...</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CASH_DENOMINATIONS.map(d=>{
        const uploaded=money.find(m=>Number(m.value)===d.value)?.imageUrl
        const saving=busyValue===d.value
        return <div key={d.value} className="rounded-2xl border border-slate-700 bg-slate-950 p-3">
          <div className="flex items-center justify-between gap-2">
            <strong>{rupiah(d.value)}</strong>
            <span className="text-xs text-slate-400">{d.type==='coin'?'Koin':'Uang kertas'}</span>
          </div>
          <div className="mt-2 grid h-28 place-items-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
            {uploaded?<img src={uploaded} alt={'Foto '+rupiah(d.value)}
              className="h-full max-h-28 w-full object-contain"/>:
              <div className="text-center"><span className="text-3xl">{d.type==='coin'?'🪙':'💵'}</span><p className="mt-1 text-xs text-slate-500">Ilustrasi bawaan</p></div>}
          </div>
          <label className={'mt-3 flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-cyan-700 px-3 py-2 text-center text-sm font-bold text-white '+(busyValue!==null?'opacity-50':'')}>
            {saving?'Mengunggah...':uploaded?'Ganti Gambar':'Upload Gambar'}
            <input aria-label={'Upload gambar uang '+rupiah(d.value)}
              type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
              disabled={busyValue!==null} onChange={event=>upload(event,d.value)}/>
          </label>
          {uploaded&&<button type="button" className="mt-2 w-full rounded-xl border border-slate-600 px-3 py-2 text-sm font-bold text-slate-300"
            disabled={busyValue!==null} onClick={()=>remove(d.value)}>Gunakan Ilustrasi Bawaan</button>}
        </div>
      })}
    </div>
  </section>
}
