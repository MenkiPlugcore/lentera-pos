import { useEffect, useMemo, useRef, useState } from 'react'
import { cloudApiFetch } from '../cloudApi.js'
import StoreScene from './StoreScene.jsx'
import MoneyTray from './MoneyTray.jsx'
import { canBuildExactChange, totalCash } from './cashMoney.js'
import { changeChoices, customerDialogue, customerForChallenge, formatRupiah } from './customerProfiles.js'
import './simulation.css'
import './arcade.css'

const STATUS = {active: 'Sedang latihan', completed: 'Selesai'}
const post = (path, data) => cloudApiFetch(path, { method: 'POST', body: JSON.stringify(data) })

export default function VisualCustomerPage() {
  const [nickname, setNickname] = useState('')
  const [sessions, setSessions] = useState([])
  const [session, setSession] = useState(null)
  const [challenge, setChallenge] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [hint, setHint] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const drawerCloseRef = useRef(null)
  const [inputMode, setInputMode] = useState('cash')
  const [selectedCash, setSelectedCash] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [moneyImages, setMoneyImages] = useState({})
  const [guestReady, setGuestReady] = useState(false)
  const [cashDrawerOpen, setCashDrawerOpen] = useState(false)

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
    } finally {
      setGuestReady(true)
    }
  }

  useEffect(() => {
    loadSessions()
    cloudApiFetch('/api/public/money').then(data => {
      const entries=(data.denominations||[]).filter(d=>d.imageUrl).map(d=>[d.value,d.imageUrl])
      setMoneyImages(Object.fromEntries(entries))
    }).catch(()=>{ /* ilustrasi bawaan tetap tersedia */ })
  }, [])

  useEffect(() => {
    if (!cashDrawerOpen) return
    const onKeyDown = event => {
      if (event.key === 'Escape') setCashDrawerOpen(false)
    }
    const mobile = window.matchMedia('(max-width: 960px)').matches
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    if (mobile) {
      document.body.style.overflow = 'hidden'
      drawerCloseRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (mobile) {
        document.body.style.overflow = previousOverflow
        if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus()
      }
    }
  }, [cashDrawerOpen])

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
    setHint(false)
    setSelectedCash([])
    setCashDrawerOpen(false)
    const neededChange = Number(result.challenge.paidAmount) - Number(result.challenge.totalAmount)
    if (!canBuildExactChange(neededChange)) setInputMode('choices')
  }

  function start() {
    if (!guestReady || nickname.trim().length < 2) return
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
    setSelectedCash([])
    setCashDrawerOpen(false)
    loadSessions()
  }

  function answer(value) {
    if (!challenge || challenge.resolved || busy || !Number.isSafeInteger(value) || value < 0) return
    request(async () => {
      const result = await post('/api/game/answer', {
        challengeId: challenge.id, answer: value,
      })
      const outcome = result.result
      setFeedback(outcome)
      if (outcome.status === 'completed') setCashDrawerOpen(false)
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
    <main className={'arcade-page' + (session ? ' arcade-page--playing' : '') + (focusMode ? ' arcade-page--focus' : '')}>
      <div className="arcade-container">
        <header className="arcade-page-heading">
          <div>
            <p className="arcade-kicker">LENTERA POS · SIMULASI INTERAKTIF</p>
            <h1>Simulasi Pelanggan</h1>
            <p>Jadilah kasir, layani pelanggan, dan siapkan uang kembalian. Tanpa timer atau transaksi sungguhan.</p>
          </div>
          <a href="/" className="arcade-back-link">← Beranda</a>
        </header>

        {error && (
          <div className="arcade-error" role="alert">
            <strong>Ada kendala:</strong> {error}
          </div>
        )}

        {!session ? (
          <div className="arcade-lobby">
            <div className="arcade-lobby-stage">
              <StoreScene customer={customerForChallenge('welcome')} mood="happy"/>
              <div className="arcade-lobby-stage-label">SELAMAT DATANG DI TOKO LENTERA!</div>
            </div>
            <section className="arcade-lobby-panel" aria-labelledby="arcade-start-title">
              <div className="arcade-lobby-icon" aria-hidden="true">✦</div>
              <span className="arcade-panel-kicker">SIAP MENJADI KASIR?</span>
              <h2 id="arcade-start-title">Ayo layani 5 pelanggan!</h2>
              <p>Ikuti pesanan pelanggan, hitung kembalian, lalu pilih uang kertas dan koin. Setiap jawaban benar menambah poin dan XP.</p>
              <label className="arcade-label" htmlFor="arcade-nickname">Nama panggilan pemain</label>
              <input id="arcade-nickname" className="arcade-input" value={nickname}
                maxLength={60} placeholder="Misalnya: Siswa A" autoComplete="off"
                onChange={event => setNickname(event.target.value)}/>
              <p className="arcade-input-caption">Cukup nama panggilan, tidak perlu nama lengkap.</p>
              <button type="button" className="arcade-primary-button"
                disabled={busy || !guestReady || nickname.trim().length < 2}
                onClick={start}>
                {busy ? 'Menyiapkan game...' : 'Mulai Bermain →'}
              </button>
              <div className="arcade-lobby-guarantee">✓ Tidak mengurangi stok & omzet asli</div>
              <div className="arcade-lobby-history">
                <h3>Lanjutkan permainan sebelumnya</h3>
                {sessions.length ? (
                  <div className="arcade-session-list">
                    {sessions.map(item => (
                      <button type="button" className="arcade-session" key={item.id}
                        disabled={busy} onClick={() => resume(item)}>
                        <span><strong>{item.playerLabel}</strong><small>{STATUS[item.status] || item.status} · Level {item.level}</small></span>
                        <span className="arcade-session-points">{item.score || 0} poin →</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="arcade-history-empty">Belum ada permainan tersimpan pada perangkat ini.</p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <>
            <div className={'arcade-play-layout' + (session.status === 'completed' ? ' arcade-play-layout--finished' : '')}>
            <section className="arcade-stage" aria-label="Area permainan kasir">
              <StoreScene customer={customer} mood={session.status === 'completed' ? 'happy' : mood}/>
              <div className="arcade-scene-vignette" aria-hidden="true"/>

              <div className="arcade-hud">
                <div className="arcade-hud-score" aria-label={'Kasir '+session.playerLabel+', level '+(session.level||1)+', '+(session.score||0)+' poin, '+(session.xp||0)+' XP'}>
                  <span className="arcade-hud-user">KASIR · {session.playerLabel}</span>
                  <strong>Level {session.level || 1} · {session.score || 0} poin</strong>
                  <span className="arcade-hud-xp">XP {session.xp || 0}</span>
                </div>
                <div className="arcade-hud-right">
                  <div className="arcade-hud-progress">
                    <span>Pelanggan {Math.min(round, 5)} dari 5</span>
                    <div className="arcade-progress-track" role="progressbar"
                      aria-label="Pelanggan yang sudah selesai dilayani" aria-valuemin={0} aria-valuemax={5}
                      aria-valuenow={session.status === 'completed' ? 5 : completedCount}>
                      <span style={{width:((session.status === 'completed' ? 5 : completedCount) / 5 * 100)+'%'}}/>
                    </div>
                  </div>
                  <button type="button" className="arcade-hud-exit" onClick={leave}>Keluar</button>
                </div>
              </div>

              {session.status === 'completed' ? (
                <div className="arcade-finish" role="status">
                  <div className="arcade-finish-stars" aria-hidden="true">★ ★ ★</div>
                  <h2>Hebat! Semua pelanggan sudah dilayani.</h2>
                  <p>Skor akhir <strong>{session.score || 0} poin</strong> · XP {session.xp || 0}</p>
                  <button type="button" className="arcade-primary-button" onClick={leave}>Main Lagi</button>
                </div>
              ) : !challenge ? (
                <div className="arcade-loading" role="status">Pelanggan sedang datang...</div>
              ) : (
                <>
                  <div className="arcade-dialogue" role="status" aria-live="polite">
                    <span className="arcade-dialogue-name">{customer.name} · {customer.label}</span>
                    <p>{customerDialogue(customer, challenge, feedback)}</p>
                  </div>
                  <div className="arcade-order-board">
                    <div className="arcade-order-label">LANGKAH 1 · LIHAT PESANAN</div>
                    <div className="arcade-order-title">{challenge.quantity} × {challenge.itemName}</div>
                    <p>Harga satuan: {formatRupiah(challenge.unitPrice)}</p>
                    <div className="arcade-order-money">
                      <div><span>Total belanja</span><strong>{formatRupiah(challenge.totalAmount)}</strong></div>
                      <div><span>Uang diterima</span><strong>{formatRupiah(challenge.paidAmount)}</strong></div>
                    </div>
                    <button type="button" className="arcade-order-jump" onClick={() => setCashDrawerOpen(true)} aria-controls="arcade-money">
                      Buka laci uang
                    </button>
                  </div>
                  {feedback?.correct && (
                    <div className="arcade-reward" aria-live="polite">★ Jawaban benar!</div>
                  )}
                </>
              )}
              {session.status === 'active' && challenge && (
                <button type="button" className="arcade-open-drawer"
                  aria-controls="arcade-money" aria-expanded={cashDrawerOpen}
                  onClick={() => setCashDrawerOpen(true)}>
                  <span>💵 Buka Laci Uang</span>
                  <strong>{formatRupiah(totalCash(selectedCash))}</strong>
                </button>
              )}
              <div className="arcade-scene-caption">SUDUT PANDANG KASIR · TOKO LENTERA</div>
            </section>
            {cashDrawerOpen && session.status === 'active' && challenge && (
              <button type="button" className="arcade-drawer-backdrop" aria-label="Tutup laci uang"
                onClick={() => setCashDrawerOpen(false)}/>
            )}

            {session.status === 'active' && challenge && (
              <section id="arcade-money" className={'arcade-workspace' + (cashDrawerOpen ? ' arcade-workspace--open' : '')}
                aria-label="Area menghitung dan menyerahkan kembalian">
                <div className="arcade-drawer-heading">
                  <strong>Laci Uang Kasir</strong>
                  <button type="button" ref={drawerCloseRef} onClick={() => setCashDrawerOpen(false)} aria-label="Tutup laci uang">✕ Tutup</button>
                </div>
                <div className="arcade-answer-area">
                  <div className="arcade-essentials" aria-label="Ringkasan transaksi">
                    <div className="arcade-essential-product">
                      <span>Pesanan</span>
                      <strong>{challenge.quantity} × {challenge.itemName}</strong>
                    </div>
                    <div><span>Total belanja</span><strong>{formatRupiah(challenge.totalAmount)}</strong></div>
                    <div><span>Uang pelanggan</span><strong>{formatRupiah(challenge.paidAmount)}</strong></div>
                  </div>
                  {challenge.resolved ? (
                    <div className="arcade-result" role="status">
                      <span className="arcade-result-star" aria-hidden="true">{feedback?.correct ? '★' : '✦'}</span>
                      <h3>{feedback?.correct ? 'Bagus! Kembalianmu tepat.' : 'Soal selesai. Yuk belajar lagi!'}</h3>
                      <p>Jawaban kembalian: <strong>{formatRupiah(challenge.expectedChange)}</strong></p>
                      {feedback?.correct && <p>+ Poin dan XP sudah tersimpan otomatis.</p>}
                      <button type="button" className="arcade-primary-button" onClick={next} disabled={busy}>
                        {busy ? 'Menyiapkan pelanggan...' : 'Pelanggan Berikutnya →'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="arcade-answer-top">
                        <div>
                          <span className="arcade-panel-kicker">LANGKAH 3 · BERIKAN KEMBALIAN</span>
                          <h3>Pilih uang yang akan diberikan</h3>
                        </div>
                        <div className="arcade-controls">
                          <button type="button" className="arcade-focus-toggle" aria-pressed={focusMode}
                            onClick={() => { setFocusMode(mode => !mode); setHint(false) }}>
                            {focusMode ? '✓ Mode Fokus' : 'Mode Fokus'}
                          </button>
                          <div className="arcade-mode-switch" role="group" aria-label="Cara menjawab">
                          <button type="button" aria-pressed={inputMode === 'cash'} onClick={() => setInputMode('cash')}
                            disabled={busy || !canBuildExactChange(Number(challenge.paidAmount) - Number(challenge.totalAmount))}>
                            Susun uang
                          </button>
                          <button type="button" aria-pressed={inputMode === 'choices'} onClick={() => setInputMode('choices')} disabled={busy}>
                            Pilihan cepat
                          </button>
                          </div>
                        </div>
                      </div>
                      {inputMode === 'cash' && canBuildExactChange(Number(challenge.paidAmount) - Number(challenge.totalAmount)) ? (
                        <MoneyTray compact images={moneyImages} selected={selectedCash}
                          paidAmount={Number(challenge.paidAmount)}
                          busy={busy} onChange={nextSelection => {
                            setSelectedCash(nextSelection)
                            if (feedback?.correct === false) setFeedback(null)
                          }} onConfirm={answer}/>
                      ) : (
                        <div className="arcade-quick-choices" role="group" aria-label="Pilih nominal kembalian">
                          {options.map(value => (
                            <button type="button" key={value} disabled={busy} onClick={() => answer(value)}>
                              {formatRupiah(value)}
                            </button>
                          ))}
                          {!canBuildExactChange(Number(challenge.paidAmount) - Number(challenge.totalAmount)) && (
                            <p>Nominal latihan ini belum tersedia pada gambar uang. Gunakan pilihan cepat.</p>
                          )}
                        </div>
                      )}
                      {feedback?.correct === false && !challenge.resolved && (
                        <p role="status" className="arcade-tryagain">Belum tepat. Coba periksa kembali uangnya. Percobaan {feedback.attemptCount} dari 3.</p>
                      )}
                      {!challenge.resolved && (
                        <div className="arcade-learning-help">
                          <span>Percobaan {challenge.attempts || 0} dari 3 · Tanpa batas waktu</span>
                          {!focusMode && (
                            <>
                              <button type="button" className="arcade-hint-toggle"
                                aria-expanded={hint} aria-controls="arcade-hint-content"
                                onClick={() => setHint(current => !current)}>
                                {hint ? 'Tutup bantuan' : 'Butuh bantuan?'}
                              </button>
                              {hint && (
                                <p id="arcade-hint-content" className="arcade-hint">
                                  <strong>Petunjuk:</strong> Uang pelanggan dikurangi total belanja. Coba mulai dari pecahan besar, lalu koin kecil.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}
            </div>
            <p className="arcade-disclaimer">Mode latihan saja. Tidak ada pengurangan stok, pembayaran asli, atau perubahan omzet.</p>
          </>
        )}
      </div>
    </main>
  )
}
