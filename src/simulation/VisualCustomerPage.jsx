import { useEffect, useMemo, useState } from 'react'
import { cloudApiFetch } from '../cloudApi.js'
import CustomerAvatar from './CustomerAvatar.jsx'
import { changeChoices, customerDialogue, customerForChallenge, formatRupiah } from './customerProfiles.js'
import './simulation.css'

const STATUS = {active: 'Sedang latihan', completed: 'Selesai'}
const post = (path, data) => cloudApiFetch(path, { method: 'POST', body: JSON.stringify(data) })

export default function VisualCustomerPage() {
  const [nickname, setNickname] = useState('')
  const [sessions, setSessions] = useState([])
  const [session, setSession] = useState(null)
  const [challenge, setChallenge] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [hint, setHint] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const customer = useMemo(
    () => customerForChallenge(challenge?.id),
    [challenge?.id],
  )
  const options = useMemo(() => changeChoices(challenge), [
    challenge?.id, challenge?.paidAmount, challenge?.totalAmount, challenge?.unitPrice
  ])
  const mood = feedback?.correct ? 'happy' : (feedback && !feedback.correct ? 'thinking' : 'neutral')
  const round = challenge?.round || Math.min(5, (session?.completedCount || 0) + 1)
  const completedCount = Math.min(5, Number(session?.completedCount || 0))

  async function loadSessions() {
    try {
      const result = await cloudApiFetch('/api/game/sessions')
      setSessions(result.sessions || [])
    } catch (problem) {
      setError(problem.message)
    }
  }

  useEffect(() => { loadSessions() }, [])

  async function request(action) {
    if (busy) return
    setBusy(true)
    setError('')
    try { await action() }
    catch (problem) { setError(problem.message) }
    finally { setBusy(false) }
  }

  async function loadChallenge(nextSession) {
    if (nextSession.status !== 'active') {
      setChallenge(null)
      setFeedback(null)
      return
    }
    const result = await post('/api/game/challenge', { sessionId: nextSession.id })
    setChallenge(result.challenge)
    setFeedback(null)
    setHint(true)
  }

  function start() {
    if (nickname.trim().length < 2) return
    request(async () => {
      const { session: created } = await post('/api/game/sessions', { playerLabel: nickname.trim() })
      setSession(created)
      setChallenge(null)
      await loadChallenge(created)
      await loadSessions()
    })
  }

  function resume(existing) {
    request(async () => {
      setSession(existing)
      setChallenge(null)
      setFeedback(null)
      await loadChallenge(existing)
    })
  }

  function leave() {
    setSession(null)
    setChallenge(null)
    setFeedback(null)
    setError('')
    loadSessions()
  }

  function answer(value) {
    if (!challenge || challenge.resolved || busy) return
    request(async () => {
      const result = await post('/api/game/answer', {
        challengeId: challenge.id, answer: value,
      })
      const outcome = result.result
      setFeedback(outcome)
      setChallenge(old => ({
        ...old,
        attempts: outcome.attemptCount,
        resolved: outcome.resolved,
        expectedChange: outcome.expectedChange,
      }))
      setSession(old => ({
        ...old,
        score: outcome.score, xp: outcome.xp, level: outcome.level,
        status: outcome.status,
        completedCount: (outcome.resolved ? (old?.completedCount || 0) + 1 : old?.completedCount || 0),
      }))
      if (outcome.resolved) await loadSessions()
    })
  }

  function next() {
    request(async () => {
      await loadChallenge(session)
      await loadSessions()
    })
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
            LENTERA POS · Game Edukasi
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Simulasi Pelanggan Visual</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Belajar menerima pesanan dan menghitung kembalian bersama pelanggan virtual.
            Tanpa batas waktu, tanpa mengurangi stok atau pendapatan toko.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/game" className="secondary-button">Kasir Pintar</a>
            <a href="/cafe" className="secondary-button">Smart Cafe</a>
          </div>
        </header>

        {error && (
          <p role="alert" className="mb-4 rounded-2xl border border-rose-800 bg-rose-950 p-4 font-semibold text-rose-200">
            {error}
          </p>
        )}

        {!session ? (
          <>
            <section className="rounded-3xl border border-cyan-900 bg-slate-900 p-5 sm:p-7">
              <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
                <div className="simulation-customer-frame">
                  <CustomerAvatar customer={customerForChallenge('welcome')} size={190}/>
                </div>
                <div>
                  <h2 className="text-2xl font-black">Selamat datang di toko!</h2>
                  <p className="mt-2 text-slate-300">
                    Satu sesi terdiri dari 5 pelanggan. Pilih uang kembalian yang tepat
                    dan kumpulkan poin. Guru dapat mendampingi setiap langkah.
                  </p>
                  <label className="mt-5 block max-w-md font-bold">
                    Nama panggilan peserta
                    <input
                      className="input mt-2 w-full text-lg"
                      value={nickname}
                      maxLength={60}
                      onChange={event => setNickname(event.target.value)}
                      placeholder="Contoh: Siswa A"
                      autoComplete="off"
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-400">Gunakan nama panggilan saja, tidak perlu data pribadi.</p>
                  <button type="button" onClick={start} disabled={busy || nickname.trim().length < 2}
                    className="primary-button simulation-main-button mt-5">
                    {busy ? 'Menyiapkan toko...' : 'Mulai Simulasi'}
                  </button>
                </div>
              </div>
            </section>
            <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-black">Lanjutkan Sesi Sebelumnya</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sessions.map(item => (
                  <button key={item.id} type="button" disabled={busy}
                    className="simulation-session-card"
                    onClick={() => resume(item)}>
                    <span className="font-black">{item.playerLabel}</span>
                    <span className="text-sm text-slate-300">
                      {STATUS[item.status] || item.status} · {item.score} poin · Level {item.level}
                    </span>
                    <span className="text-sm text-cyan-300">
                      {item.status === 'completed' ? 'Lihat hasil' : 'Lanjutkan latihan'}
                    </span>
                  </button>
                ))}
                {!sessions.length && <p className="text-sm text-slate-400">Belum ada sesi latihan.</p>}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div>
                <p className="text-xs text-cyan-300">{session.playerLabel}</p>
                <h2 className="text-xl font-black">Level {session.level || 1} · {session.score || 0} poin</h2>
                <p className="mt-1 text-sm text-slate-400">XP {session.xp || 0}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="min-w-36">
                  <p className="mb-2 text-sm font-bold">Pelanggan {Math.min(round, 5)} dari 5</p>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-700"
                    role="progressbar" aria-label="Progres latihan"
                    aria-valuenow={session.status === 'completed' ? 5 : completedCount}
                    aria-valuemin={0} aria-valuemax={5}>
                    <div className="h-full rounded-full bg-cyan-500"
                      style={{ width: ((session.status === 'completed' ? 5 : completedCount) / 5 * 100) + '%' }}/>
                  </div>
                </div>
                <button type="button" className="secondary-button" onClick={leave}>Keluar</button>
              </div>
            </section>

            {session.status === 'completed' ? (
              <section className="rounded-3xl border border-emerald-700 bg-slate-900 p-8 text-center">
                <CustomerAvatar customer={customer} mood="happy" size={190}/>
                <h2 className="mt-3 text-3xl font-black text-emerald-300">Latihan Selesai!</h2>
                <p className="mt-3 text-lg">Kamu mendapatkan {session.score} poin dan {session.xp} XP.</p>
                <p className="mt-2 text-slate-300">Terima kasih sudah melayani 5 pelanggan.</p>
                <button type="button" className="primary-button simulation-main-button mt-6"
                  onClick={leave}>Kembali ke Daftar</button>
              </section>
            ) : !challenge ? (
              <p role="status" className="rounded-2xl bg-slate-900 p-6">Pelanggan sedang datang...</p>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.2fr)]">
                <section className="simulation-customer-card">
                  <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Pelanggan Datang</p>
                  <div className="simulation-customer-frame mt-4">
                    <CustomerAvatar customer={customer}
                      mood={mood} size={228}/>
                    <p className="mt-2 text-xl font-black">{customer.name}</p>
                    <p className="text-sm text-slate-300">{customer.label}</p>
                  </div>
                  <div className="simulation-speech mt-5" role="status" aria-live="polite">
                    <strong className="block text-base">{customer.name} berkata:</strong>
                    <p className="mt-2 text-lg leading-7">
                      {customerDialogue(customer, challenge, feedback)}
                    </p>
                  </div>
                </section>
                <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Langkah 1 · Lihat Pesanan</p>
                  <h2 className="mt-2 text-2xl font-black">{challenge.quantity} × {challenge.itemName}</h2>
                  <p className="mt-2 text-sm text-slate-300">Harga satuan: {formatRupiah(challenge.unitPrice)}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="simulation-money-card">
                      <p className="text-sm font-bold text-slate-300">Total belanja</p>
                      <strong className="mt-2 block text-2xl text-white">{formatRupiah(challenge.totalAmount)}</strong>
                    </div>
                    <div className="simulation-money-card simulation-money-highlight">
                      <p className="text-sm font-bold text-cyan-100">Uang pelanggan</p>
                      <strong className="mt-2 block text-2xl text-white">{formatRupiah(challenge.paidAmount)}</strong>
                    </div>
                  </div>

                  <p className="mt-7 text-xs font-black uppercase tracking-widest text-cyan-300">
                    Langkah 2 · Pilih Jawaban
                  </p>
                  <h3 className="mt-2 text-xl font-black">Berapa uang kembalian?</h3>
                  {challenge.resolved ? (
                    <div className="mt-4 rounded-2xl border border-emerald-700 bg-emerald-950 p-5">
                      <p className="font-bold text-emerald-200">
                        {feedback?.correct ? 'Hebat, jawabanmu benar!' : 'Latihan soal ini sudah selesai.'}
                      </p>
                      <p className="mt-2 text-lg font-black">
                        Jawaban: {formatRupiah(challenge.expectedChange)}
                      </p>
                      <p className="mt-1 text-sm text-emerald-100">
                        {feedback?.correct ? 'Poin bertambah. Pelanggan senang!' : 'Kita coba pelanggan selanjutnya, ya.'}
                      </p>
                      {session.status === 'active' && (
                        <button type="button" className="primary-button simulation-main-button mt-5"
                          disabled={busy} onClick={next}>
                          {busy ? 'Menyiapkan...' : 'Pelanggan Berikutnya'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3" role="group" aria-label="Pilihan uang kembalian">
                        {options.map(value => (
                          <button key={value} type="button" disabled={busy}
                            className="simulation-answer"
                            onClick={() => answer(value)}>
                            {formatRupiah(value)}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-slate-300" aria-live="polite">
                        {feedback?.correct === false
                          ? 'Belum tepat. Kamu masih boleh mencoba lagi.'
                          : 'Pilih satu jawaban di atas.'}
                        {' '}Percobaan {challenge.attempts || 0} dari 3.
                      </p>
                    </>
                  )}

                  <div className="mt-6 border-t border-slate-800 pt-4">
                    <button type="button" className="text-sm font-bold text-cyan-300 underline"
                      aria-expanded={hint} onClick={() => setHint(value => !value)}>
                      {hint ? 'Sembunyikan bantuan hitung' : 'Tampilkan bantuan hitung'}
                    </button>
                    {hint && (
                      <div className="mt-3 rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-200">
                        <p className="font-bold">Langkah 3 · Cara menghitung</p>
                        <p className="mt-1">Uang pelanggan dikurangi total belanja:</p>
                        <p className="mt-2 text-base font-black">
                          {formatRupiah(challenge.paidAmount)} − {formatRupiah(challenge.totalAmount)} = ?
                        </p>
                        <p className="mt-2">Tidak perlu terburu-buru. Hitung perlahan.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
