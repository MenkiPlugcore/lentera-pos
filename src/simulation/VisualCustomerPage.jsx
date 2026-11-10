import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cloudApiFetch } from '../cloudApi.js'
import StoreScene from './StoreScene.jsx'
import MoneyTray from './MoneyTray.jsx'
import SubtractionSlide from './SubtractionSlide.jsx'
import BasketList, { basketLines } from './BasketList.jsx'
import LevelSelect from './LevelSelect.jsx'
import { createProfile,loadProfiles,saveProfiles,startLevel,submitLocalAnswer,
  advanceLocalRound,starsForCorrect,ROUNDS_PER_LEVEL,MIN_CORRECT_TO_PASS,
  FALLBACK_PRODUCTS,TOTAL_LEVELS } from './localLevels.js'
import { canBuildExactChange, totalCash } from './cashMoney.js'
import { changeChoices, customerDialogue, customerForChallenge, formatRupiah } from './customerProfiles.js'
import './simulation.css'
import './arcade.css'

const CURRENT_KEY = 'lentera-pos-simulasi-selected-v1'
const initialProfiles = () => {
  try { return typeof window === 'undefined' ? [] : loadProfiles(window.localStorage) }
  catch { return [] }
}
const initialSelected = () => {
  try { return typeof window === 'undefined' ? '' : (window.localStorage.getItem(CURRENT_KEY) || '') }
  catch { return '' }
}

export default function VisualCustomerPage() {
  const [nickname, setNickname] = useState('')
  const [profiles, setProfiles] = useState(initialProfiles)
  const [selectedId, setSelectedId] = useState(initialSelected)
  const [showMap, setShowMap] = useState(false)
  const [summary, setSummary] = useState(null)
  const [catalog, setCatalog] = useState(FALLBACK_PRODUCTS)
  const [hint, setHint] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const drawerCloseRef = useRef(null)
  const [inputMode, setInputMode] = useState('cash')
  const [selectedCash, setSelectedCash] = useState([])
  const busy = false
  const [error, setError] = useState('')
  const [moneyImages, setMoneyImages] = useState({})
  const profile = profiles.find(p => p.id === selectedId) || null
  const session = profile?.active && !showMap && !summary
    ? {status:'active',playerLabel:profile.name,level:profile.active.level,
       score:profile.active.score,xp:profile.active.score,
       completedCount:profile.active.round-1} : null
  const challenge = session ? profile.active.challenge : null
  const feedback = session ? profile.active.feedback : null
  const [cashDrawerOpen, setCashDrawerOpen] = useState(false)
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const closeCalculator = useCallback(() => setCalculatorOpen(false), [])

  const customer = useMemo(
    () => customerForChallenge(challenge?.id),
    [challenge?.id],
  )
  const options = useMemo(() => changeChoices(challenge), [
    challenge?.id, challenge?.paidAmount, challenge?.totalAmount, challenge?.unitPrice
  ])
  const mood = feedback?.correct ? 'happy' : (feedback && !feedback.correct ? 'thinking' : 'neutral')
  const round = challenge?.round || Math.min(ROUNDS_PER_LEVEL, (session?.completedCount || 0) + 1)
  const completedCount = Math.min(ROUNDS_PER_LEVEL, Number(session?.completedCount || 0))
  const items = basketLines(challenge)

  // Menyimpan nama/progres per browser. Tidak ada POST ke Neon.
  useEffect(() => {
    try { saveProfiles(window.localStorage,profiles) }
    catch { setError('Penyimpanan browser penuh atau nonaktif. Progres tidak bisa disimpan.') }
  }, [profiles])
  useEffect(() => {
    try {
      if(selectedId)window.localStorage.setItem(CURRENT_KEY,selectedId)
      else window.localStorage.removeItem(CURRENT_KEY)
    } catch { /* pengguna bisa mengaktifkan penyimpanan browser */ }
  }, [selectedId])

  useEffect(() => {
    // Data katalog & foto uang hanya dibaca; game tetap berjalan tanpa jaringan.
    cloudApiFetch('/api/public/money').then(data=>{
      setMoneyImages(Object.fromEntries((data.denominations||[])
        .filter(d=>d.imageUrl).map(d=>[d.value,d.imageUrl])))
    }).catch(()=>{})
    cloudApiFetch('/api/public/catalog').then(data=>{
      if(Array.isArray(data.products) && data.products.length)setCatalog(data.products)
    }).catch(()=>{})
  }, [])

  useEffect(() => {
    if(!cashDrawerOpen || calculatorOpen)return
    const onKeyDown=event=>{ if(event.key==='Escape')setCashDrawerOpen(false) }
    const mobile=window.matchMedia('(max-width:960px)').matches
    const previousFocus=document.activeElement
    const previousOverflow=document.body.style.overflow
    if(mobile){
      document.body.style.overflow='hidden'
      drawerCloseRef.current?.focus()
    }
    window.addEventListener('keydown',onKeyDown)
    return ()=>{
      window.removeEventListener('keydown',onKeyDown)
      if(mobile){
        document.body.style.overflow=previousOverflow
        if(previousFocus?.isConnected&&typeof previousFocus.focus==='function')previousFocus.focus()
      }
    }
  }, [cashDrawerOpen,calculatorOpen])

  const updateProfile=(next)=>{
    setProfiles(current=>current.map(p=>p.id===next.id?next:p))
  }
  function createLocalPlayer() {
    const name=nickname.trim()
    if(profiles.some(p=>p.name.toLocaleLowerCase('id-ID')===name.toLocaleLowerCase('id-ID'))){
      setError('Nama itu sudah digunakan di perangkat ini. Pilih nama lain atau lanjutkan profil lama.')
      return
    }
    if(profiles.length>=30){setError('Maksimal 30 pemain lokal per browser.');return}
    try {
      const id=crypto.randomUUID()
      const newPlayer=createProfile(name,id)
      setProfiles(current=>[...current,newPlayer])
      setSelectedId(id)
      setNickname('')
      setSummary(null)
      setShowMap(true)
      setError('')
    } catch(problem){setError(problem.message)}
  }
  function chooseLocalPlayer(id) {
    if(!profiles.some(p=>p.id===id))return
    setSelectedId(id);setSummary(null);setShowMap(true);setError('')
  }
  function deleteLocalPlayer(id) {
    const selected=profiles.find(p=>p.id===id)
    if(!selected||!window.confirm('Hapus profil '+selected.name+' beserta semua progres 40 level di browser ini?'))return
    setProfiles(current=>current.filter(p=>p.id!==id))
    if(selectedId===id)setSelectedId('')
    setSummary(null);setShowMap(true)
  }
  function playLevel(level) {
    if(!profile)return
    if(profile.active && profile.active.level!==level &&
      !window.confirm('Berpindah level akan mengulang progres level yang sedang dimainkan. Lanjut?'))return
    try {
      const next=startLevel(profile,level,catalog)
      updateProfile(next)
      setSummary(null);setShowMap(false);setError('')
      resetGameUI(next.active.challenge)
    } catch(problem){setError(problem.message)}
  }
  function resumeLevel() {
    if(!profile?.active)return
    setSummary(null);setShowMap(false);setError('')
    resetGameUI(profile.active.challenge,false)
  }
  function resetGameUI(current,resetCash=true) {
    setHint(false)
    if(resetCash)setSelectedCash([])
    setCashDrawerOpen(false);setCalculatorOpen(false)
    const change=current.paidAmount-current.totalAmount
    if(!canBuildExactChange(change))setInputMode('choices')
    else setInputMode('cash')
  }
  function leave() {
    // Kembali ke pemilihan level; ronde aktif tetap disimpan.
    setShowMap(true);setSummary(null);setError('')
    setCashDrawerOpen(false);setCalculatorOpen(false)
    setSelectedCash([])
  }
  function answer(value) {
    if(!profile?.active||challenge?.resolved||!Number.isSafeInteger(value)||value<0)return
    try {
      const {profile:next}=submitLocalAnswer(profile,value)
      updateProfile(next)
      setError('')
    } catch(problem){setError(problem.message)}
  }
  function clearFeedback() {
    if(!profile?.active?.feedback)return
    updateProfile({...profile,active:{...profile.active,feedback:null}})
  }
  function next() {
    if(!profile?.active?.challenge?.resolved)return
    try {
      const old=profile.active
      const updated=advanceLocalRound(profile,catalog)
      updateProfile(updated)
      if(!updated.active) {
        setSummary({level:old.level,score:old.score,correctCount:old.correctCount,
          passed:old.correctCount>=MIN_CORRECT_TO_PASS,
          stars:starsForCorrect(old.correctCount)})
        setShowMap(true)
      } else {
        resetGameUI(updated.active.challenge)
      }
      setError('')
    } catch(problem){setError(problem.message)}
  }
  return (
    <main className={'arcade-page' + (session ? ' arcade-page--playing' : '') + (focusMode ? ' arcade-page--focus' : '')}>
      <div className="arcade-container">
        {session && <h1 className="sr-only">Simulasi Pelanggan</h1>}

        {error && (
          <div className="arcade-error" role="alert">
            <strong>Ada kendala:</strong> {error}
          </div>
        )}

        {!session ? (
          summary && profile ? (
            <section className="local-completion" aria-label="Hasil level">
              <span className="local-completion-star" aria-hidden="true">{summary.passed ? '★' : '↻'}</span>
              <p className="local-overline">LEVEL {summary.level} SELESAI</p>
              <h2>{summary.passed ? 'Level Berhasil!' : 'Ayo Coba Lagi!'}</h2>
              <p>{summary.correctCount} dari {ROUNDS_PER_LEVEL} pelanggan dijawab benar.</p>
              <div className="local-completion-score">
                <strong>{summary.score} poin</strong>
                <strong>{summary.passed ? '★'.repeat(summary.stars)+'☆'.repeat(3-summary.stars) : 'Belum lulus'}</strong>
              </div>
              <p>{summary.passed
                ? (summary.level===TOTAL_LEVELS
                  ? 'Hebat! Semua 40 level sudah kamu selesaikan.'
                  : 'Level '+(summary.level+1)+' sudah terbuka!')
                : 'Butuh minimal '+MIN_CORRECT_TO_PASS+' jawaban benar. Tidak ada batas waktu.'}</p>
              <div className="local-completion-actions">
                {summary.passed && summary.level<TOTAL_LEVELS && (
                  <button type="button" className="arcade-primary-button"
                    onClick={()=>playLevel(summary.level+1)}>Main Level {summary.level+1} →</button>
                )}
                <button type="button" className="arcade-primary-button"
                  onClick={()=>playLevel(summary.level)}>Ulangi Level {summary.level}</button>
                <button type="button" className="local-switch-button"
                  onClick={()=>{setSummary(null);setShowMap(true)}}>Pilih Level</button>
              </div>
            </section>
          ) : (
            <LevelSelect profiles={profiles} profile={profile} nickname={nickname}
              onNameChange={setNickname} onCreate={createLocalPlayer}
              onChooseProfile={chooseLocalPlayer} onDeleteProfile={deleteLocalPlayer}
              onStartLevel={playLevel} onResume={resumeLevel}
              onBackHome={()=>{setSelectedId('');setSummary(null);setError('');setShowMap(true)}}/>
          )
        ) : (
          <>
            <div className="arcade-play-layout">
            <section className="arcade-stage" aria-label="Area permainan kasir">
              <StoreScene customer={customer} mood={mood}/>
              <div className="arcade-scene-vignette" aria-hidden="true"/>

              <div className="arcade-hud">
                <div className="arcade-hud-score" aria-label={'Kasir '+session.playerLabel+', Level '+session.level+', '+session.score+' poin'}>
                  <strong>Level {session.level} · {session.score} poin</strong>
                </div>
                <div className="arcade-hud-right">
                  <div className="arcade-hud-progress">
                    <span aria-label={'Pelanggan '+Math.min(round,5)+' dari 5'}>{Math.min(round, ROUNDS_PER_LEVEL)}/{ROUNDS_PER_LEVEL} pelanggan</span>
                    <div className="arcade-progress-track" role="progressbar"
                      aria-label="Pelanggan yang sudah selesai dilayani" aria-valuemin={0} aria-valuemax={ROUNDS_PER_LEVEL}
                      aria-valuenow={completedCount}>
                      <span style={{width:(completedCount / ROUNDS_PER_LEVEL * 100)+'%'}}/>
                    </div>
                  </div>
                  <button type="button" className="arcade-hud-exit" onClick={leave}>Keluar</button>
                </div>
              </div>

              {!challenge ? (
                <div className="arcade-loading" role="status">Pelanggan sedang datang...</div>
              ) : (
                <>
                  <div className="arcade-dialogue" role="status" aria-live="polite">
                    <span className="arcade-dialogue-name">{customer.name}</span>
                    <p>{feedback ? customerDialogue(customer, challenge, feedback) : customer.greeting}</p>
                  </div>
                  <div className="arcade-order-board" aria-label="Keranjang belanja pelanggan">
                    <div className="arcade-basket-stage">Level {session.level} · Pelanggan {round}/{ROUNDS_PER_LEVEL}</div>
                    <BasketList items={items} variant="scene"/>
                    <div className="arcade-order-money">
                      <div><span>Total belanja</span><strong>{formatRupiah(challenge.totalAmount)}</strong></div>
                      <div><span>Uang diterima</span><strong>{formatRupiah(challenge.paidAmount)}</strong></div>
                    </div>
                  </div>
                  {feedback?.correct && (
                    <div className="arcade-reward" aria-live="polite">★ Jawaban benar!</div>
                  )}
                </>
              )}
              {session.status === 'active' && challenge && !challenge.resolved && (
                <div className="arcade-scene-actions">
                  <button type="button" className="arcade-open-drawer"
                    aria-controls="arcade-money" aria-expanded={cashDrawerOpen}
                    onClick={() => setCashDrawerOpen(true)}>
                    <span>💵 Laci Uang</span>
                    <strong>{formatRupiah(totalCash(selectedCash))}</strong>
                  </button>
                  <button type="button" className="arcade-open-calculator"
                    aria-controls="arcade-subtraction-slide" aria-haspopup="dialog"
                    aria-expanded={calculatorOpen} onClick={() => setCalculatorOpen(true)}>
                    − Kalkulator
                  </button>
                </div>
              )}
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
                  <div className="arcade-essentials arcade-essentials--mobile-only" aria-label="Ringkasan pesanan saat laci terbuka">
                    <div className="arcade-drawer-basket">
                      <BasketList items={items} variant="drawer"/>
                    </div>
                    <div><span>Total belanja</span><strong>{formatRupiah(challenge.totalAmount)}</strong></div>
                    <div><span>Uang pelanggan</span><strong>{formatRupiah(challenge.paidAmount)}</strong></div>
                  </div>
                  {challenge.resolved ? (
                    <div className="arcade-result" role="status">
                      <span className="arcade-result-star" aria-hidden="true">{feedback?.correct ? '★' : '✦'}</span>
                      <h3>{feedback?.correct ? 'Bagus! Kembalianmu tepat.' : 'Soal selesai. Yuk belajar lagi!'}</h3>
                      <p>Kembalian: <strong>{formatRupiah(challenge.expectedChange)}</strong></p>
                      <button type="button" className="arcade-primary-button" onClick={next} disabled={busy}>
                        {busy ? 'Memuat...' : 'Lanjut →'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="arcade-answer-top">
                        <div>
                          <h3>Siapkan Kembalian</h3>
                        </div>
                        <div className="arcade-controls">
                          <button type="button" className="arcade-focus-toggle" aria-label={focusMode ? 'Nonaktifkan mode fokus' : 'Aktifkan mode fokus'} aria-pressed={focusMode}
                            onClick={() => { setFocusMode(mode => !mode); setHint(false) }}>
                            {focusMode ? '✓ Fokus' : 'Fokus'}
                          </button>
                          <button type="button" className="arcade-calculator-trigger"
                            aria-controls="arcade-subtraction-slide" aria-haspopup="dialog"
                            aria-expanded={calculatorOpen} onClick={() => setCalculatorOpen(true)}>
                            <span aria-hidden="true">−</span> Kalkulator
                          </button>
                          <div className="arcade-mode-switch" role="group" aria-label="Cara menjawab">
                          <button type="button" aria-pressed={inputMode === 'cash'} onClick={() => setInputMode('cash')}
                            disabled={busy || !canBuildExactChange(Number(challenge.paidAmount) - Number(challenge.totalAmount))}>
                            Uang
                          </button>
                          <button type="button" aria-pressed={inputMode === 'choices'} onClick={() => setInputMode('choices')} disabled={busy}>
                            Pilihan
                          </button>
                          </div>
                        </div>
                      </div>
                      {inputMode === 'cash' && canBuildExactChange(Number(challenge.paidAmount) - Number(challenge.totalAmount)) ? (
                        <MoneyTray compact images={moneyImages} selected={selectedCash}
                          paidAmount={Number(challenge.paidAmount)}
                          busy={busy} onChange={nextSelection => {
                            setSelectedCash(nextSelection)
                            if (feedback?.correct === false) clearFeedback()
                          }} onConfirm={answer}/>
                      ) : (
                        <div className="arcade-quick-choices" role="group" aria-label="Pilih nominal kembalian">
                          {options.map(value => (
                            <button type="button" key={value} disabled={busy} onClick={() => answer(value)}>
                              {formatRupiah(value)}
                            </button>
                          ))}
                          {!canBuildExactChange(Number(challenge.paidAmount) - Number(challenge.totalAmount)) && (
                            <p>Gunakan pilihan angka.</p>
                          )}
                        </div>
                      )}
                      {feedback?.correct === false && !challenge.resolved && (
                        <p role="status" className="arcade-tryagain">Belum tepat. Coba lagi ({feedback.attemptCount}/3).</p>
                      )}
                      {!challenge.resolved && (
                        <div className="arcade-learning-help">
                          {Number(challenge.attempts || 0) > 0 && !feedback && <span>Percobaan {challenge.attempts}/3</span>}
                          {!focusMode && (
                            <>
                              <button type="button" className="arcade-hint-toggle"
                                aria-expanded={hint} aria-controls="arcade-hint-content"
                                onClick={() => setHint(current => !current)}>
                                {hint ? 'Tutup bantuan' : 'Bantuan'}
                              </button>
                              {hint && (
                                <p id="arcade-hint-content" className="arcade-hint">
                                  Uang pelanggan − total belanja = kembalian. Pilih uang besar dahulu, lalu koin.
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
            {session.status === 'active' && challenge && (
              <SubtractionSlide open={calculatorOpen} onClose={closeCalculator}
                challengeId={challenge.id} paidAmount={challenge.paidAmount}
                totalAmount={challenge.totalAmount}/>
            )}
          </>
        )}
      </div>
    </main>
  )
}
