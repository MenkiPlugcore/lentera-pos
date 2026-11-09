import { useEffect, useMemo, useState } from 'react'
import { cloudApiFetch } from './cloudApi.js'

const rupiah = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value)||0)

export default function GamePage() {
  const [playerLabel,setPlayerLabel] = useState('')
  const [session,setSession] = useState(null)
  const [challenge,setChallenge] = useState(null)
  const [answer,setAnswer] = useState('')
  const [feedback,setFeedback] = useState(null)
  const [sessions,setSessions] = useState([])
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [guide,setGuide] = useState(true)

  async function loadSessions(){
    try { const result=await cloudApiFetch('/api/game/sessions');setSessions(result.sessions||[]) }
    catch(e){setError(e.message)}
  }
  useEffect(()=>{loadSessions()},[])

  async function act(callback){
    setBusy(true);setError('')
    try {await callback()}
    catch(e){setError(e.message)}
    finally {setBusy(false)}
  }

  function nextQuestion(s=session){
    if(!s)return
    act(async()=>{
      const data=await cloudApiFetch('/api/game/challenge',{
        method:'POST',body:JSON.stringify({sessionId:s.id})
      })
      setChallenge(data.challenge);setAnswer('');setFeedback(null)
    })
  }

  function newSession(){
    act(async()=>{
      const data=await cloudApiFetch('/api/game/sessions',{
        method:'POST',body:JSON.stringify({playerLabel})
      })
      setSession(data.session);setChallenge(null);setFeedback(null);setGuide(false)
      await loadSessions()
      const next=await cloudApiFetch('/api/game/challenge',{
        method:'POST',body:JSON.stringify({sessionId:data.session.id})
      })
      setChallenge(next.challenge);setAnswer('')
    })
  }

  function resume(s){
    setSession(s);setChallenge(null);setFeedback(null);setGuide(false)
    if(s.status==='active') nextQuestion(s)
  }

  function submit(selected){
    if(!challenge || challenge.resolved)return
    const num=Number(String(selected??answer).replace(/\D/g,''))
    if(!Number.isSafeInteger(num)){setError('Pilih nominal kembalian yang valid.');return}
    act(async()=>{
      const data=await cloudApiFetch('/api/game/answer',{
        method:'POST',body:JSON.stringify({challengeId:challenge.id,answer:num})
      })
      setFeedback(data.result)
      setChallenge(old=>({...old,attempts:data.result.attemptCount,resolved:data.result.resolved,
        expectedChange:data.result.expectedChange}))
      setSession(old=>({...old,score:data.result.score,xp:data.result.xp,
        level:data.result.level,status:data.result.status}))
      await loadSessions()
    })
  }
  const options=useMemo(()=>{
    if(!challenge)return []
    const correct=Number(challenge.paidAmount)-Number(challenge.totalAmount)
    const offset=Math.max(500,Math.min(5000,Math.round(Number(challenge.unitPrice)/1000)*1000||1000))
    const values=[correct,Math.max(0,correct-offset),correct+offset]
    if(values[0]===values[1])values[1]=correct+offset*2
    return values.map((value,i)=>({value,key:i})).sort((a,b)=>((a.value*13+a.key*5)%7)-((b.value*13+b.key*5)%7))
  },[challenge?.id])

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
    <div className="mx-auto max-w-5xl">
      <header className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">LENTERA · GAME EDUKASI</p>
        <h1 className="mt-2 text-3xl font-black">Kasir Pintar</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Simulasi pelanggan virtual dengan 5 soal menghitung kembalian. XP dan nilai tersimpan di Neon. Tidak ada uang, stok, atau transaksi asli yang berubah.</p>
      </header>
      {error && <div role="alert" className="mb-5 rounded-2xl border border-rose-700 bg-rose-950 p-4 text-rose-200">{error}</div>}
      {!session && <section className="rounded-3xl border border-cyan-900 bg-slate-900 p-6">
        <h2 className="text-2xl font-black">Mulai Latihan</h2>
        <p className="mt-2 text-sm text-slate-400">Pendamping boleh mengisi nama panggilan siswa tanpa mencantumkan data pribadi.</p>
        <label className="mt-5 block text-base font-bold">Nama panggilan peserta
          <input className="input mt-2 w-full max-w-md" maxLength={60} value={playerLabel} onChange={e=>setPlayerLabel(e.target.value)} placeholder="Contoh: Siswa A" />
        </label>
        <button className="primary-button mt-5 px-6 py-4 text-lg" disabled={busy || playerLabel.trim().length<2} onClick={newSession}>Mulai Game</button>
      </section>}
      {session && <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm text-cyan-300">{session.playerLabel}</p>
            <h2 className="text-2xl font-black">Level {session.level||1} · {session.score||0} Poin</h2>
            <p className="mt-1 text-sm text-slate-400">XP {session.xp||0} · {session.status==='completed'?'Sesi selesai':'Latihan aktif'}</p>
          </div>
          <button className="secondary-button" type="button" onClick={()=>{setSession(null);setChallenge(null);setFeedback(null);loadSessions()}}>Kembali ke Daftar</button>
        </div>
        {session.status==='completed'
          ? <div className="rounded-2xl border border-emerald-700 bg-emerald-950 p-6"><h3 className="text-2xl font-black text-emerald-200">Sesi Selesai!</h3><p className="mt-2 text-lg">Total nilai: {session.score} poin. Bagus, lanjutkan latihan lain!</p></div>
          : challenge ? <>
            <div className="rounded-3xl bg-slate-950 p-5">
              <p className="font-bold text-cyan-300">Pelanggan virtual datang ke kasir</p>
              <div className="mt-4 rounded-2xl border border-slate-700 p-4">
                <p className="text-xl font-bold">Pelanggan membeli {challenge.quantity} × {challenge.itemName}</p>
                <p className="mt-2 text-sm text-slate-400">Harga satuan {rupiah(challenge.unitPrice)}</p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-800 p-5"><p className="text-sm text-slate-300">Total Belanja</p><p className="mt-2 text-3xl font-black">{rupiah(challenge.totalAmount)}</p></div>
                <div className="rounded-2xl bg-cyan-950 p-5"><p className="text-sm text-cyan-200">Uang Diterima</p><p className="mt-2 text-3xl font-black text-cyan-200">{rupiah(challenge.paidAmount)}</p></div>
              </div>
              <p className="mt-6 text-xl font-black">Berapa uang kembalian pelanggan?</p>
              {!challenge.resolved && <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {options.map(option=><button type="button" key={option.key} onClick={()=>submit(option.value)} disabled={busy}
                  className="min-h-24 rounded-2xl border-2 border-cyan-700 bg-slate-900 p-4 text-xl font-black hover:bg-cyan-950 focus-visible:outline focus-visible:outline-4 focus-visible:outline-cyan-400">
                  {rupiah(option.value)}
                </button>)}
              </div>}
              {guide && <p className="mt-3 text-sm text-slate-400">Petunjuk: uang diterima dikurangi total belanja. Pilih salah satu dari tiga jawaban besar di atas.</p>}
              {!challenge.resolved && <button type="button" className="mt-4 text-sm text-cyan-300 underline" onClick={()=>setGuide(v=>!v)}>{guide?'Sembunyikan petunjuk':'Tampilkan petunjuk'}</button>}
            </div>
            {feedback && <div role="status" className={'mt-4 rounded-2xl border p-5 '+(feedback.correct?'border-emerald-700 bg-emerald-950':'border-amber-700 bg-amber-950')}>
              <h3 className="text-xl font-black">{feedback.correct?'Benar! Dapat poin.':feedback.resolved?'Belum tepat, soal selesai.':'Coba lagi, kamu bisa!'}</h3>
              <p className="mt-2">Percobaan {feedback.attemptCount} dari 3.</p>
              {feedback.resolved && <p className="mt-2 font-bold">Kembalian yang tepat: {rupiah(feedback.expectedChange)}</p>}
            </div>}
            {challenge.resolved && session.status==='active' && <button type="button" className="primary-button mt-5 w-full py-4 text-xl" disabled={busy} onClick={()=>nextQuestion()}>Pelanggan Selanjutnya</button>}
          </> : <p className="text-slate-400">Menyiapkan pelanggan virtual...</p>}
      </section>}
      <section className="mt-7 rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-black">Riwayat Latihan</h2>
        <p className="mt-1 text-sm text-slate-400">Pendamping dapat melanjutkan sesi yang belum selesai. Maksimal 50 sesi terbaru.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sessions.map(s=><button key={s.id} type="button" onClick={()=>resume(s)}
            className="rounded-2xl border border-slate-700 bg-slate-950 p-4 text-left hover:border-cyan-500">
            <div className="flex items-center justify-between gap-2"><strong>{s.playerLabel}</strong><span className="text-xs text-cyan-300">{s.status==='completed'?'Selesai':'Lanjutkan'}</span></div>
            <p className="mt-2 text-sm text-slate-400">Level {s.level} · {s.score} poin · XP {s.xp}</p>
          </button>)}
          {!sessions.length && <p className="text-sm text-slate-400">Belum ada latihan. Mulai sesi pertama.</p>}
        </div>
      </section>
    </div>
  </main>
}
