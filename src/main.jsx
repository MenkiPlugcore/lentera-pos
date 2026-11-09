import { StrictMode, useEffect, useState } from 'react'
import { IS_CLOUD, cloudApiFetch } from './cloudApi.js'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './responsive.css'
import './cashier-universal.css'
import './barcodeDetectorPolyfill.js'
import App from './App.jsx'
import AdminCashierShortcut from './AdminCashierShortcut.jsx'
import CashierPage from './CashierPage.jsx'
import HardDeletePanel from './HardDeletePanel.jsx'
import ReportsPanel from './ReportsPanel.jsx'
import CafePage from './CafePage.jsx'
import GamePage from './GamePage.jsx'

function normalizePath(pathname) {
  const cleaned = String(pathname || '/').replace(/\/+$/, '')
  return cleaned || '/'
}

function LoginPage({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await cloudApiFetch('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ username, password }),
      })
      onSuccess(result.user)
    } catch (problem) {
      setError(problem.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-12 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-xl">
        <div className="mb-5 text-4xl">☕</div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">Lentera POS 2.0</p>
        <h1 className="mt-2 text-3xl font-black">Masuk Admin</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Database Neon aktif. Gunakan akun admin LENTERA POS lama untuk mengakses kasir dan produk.</p>
        <label className="mt-7 block text-sm font-bold">Username
          <input className="input mt-2 w-full" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required />
        </label>
        <label className="mt-4 block text-sm font-bold">Password
          <input className="input mt-2 w-full" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </label>
        {error && <p className="mt-4 text-sm text-rose-300" role="alert">{error}</p>}
        <button className="primary-button mt-6 w-full py-3" type="submit" disabled={loading}>{loading ? 'Memeriksa...' : 'Masuk ke LENTERA POS'}</button>
      </form>
    </main>
  )
}

function CloudGate({ children }) {
  const [state, setState] = useState({ loading: true, user: null })
  useEffect(() => {
    let active = true
    cloudApiFetch('/api/auth/me')
      .then(data => { if (active) setState({ loading: false, user: data.user }) })
      .catch(() => { if (active) setState({ loading: false, user: null }) })
    return () => { active = false }
  }, [])

  if (state.loading) return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">Memeriksa sesi database...</main>
  if (!state.user) return <LoginPage onSuccess={user => setState({ loading: false, user })} />

  async function logout() {
    try {
      await cloudApiFetch('/api/auth/logout', { method: 'POST', body: '{}' })
      setState({ loading: false, user: null })
    } catch (error) {
      window.alert('Gagal keluar dari sesi: ' + error.message)
    }
  }

  return (
    <>
      <div className="sticky top-0 z-[70] flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900 bg-slate-950 px-4 py-2 text-xs text-slate-200">
        <span>☁️ Neon Cloud · {state.user.fullName || state.user.username}</span>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Navigasi LENTERA POS">
          <a href="/kasir" className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Kasir</a>
          <a href="/admin" className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Admin</a>
          <a href="/cafe" className="rounded-lg border border-cyan-700 px-3 py-1.5 text-cyan-200 hover:bg-cyan-900">Smart Cafe</a>
          <a href="/game" className="rounded-lg border border-cyan-700 px-3 py-1.5 text-cyan-200 hover:bg-cyan-900">Mode Game</a>
          <button type="button" className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800" onClick={logout}>Keluar</button>
        </nav>
      </div>
      {children}
    </>
  )
}

function RootRoute() {
  const path = normalizePath(window.location.pathname)

  const view = (() => {
  if (path === '/') {
    window.history.replaceState({}, '', '/kasir')
    return <CashierPage />
  }

  if (path === '/kasir') {
    return <CashierPage />
  }

  if (path === '/cafe' && IS_CLOUD) return <CafePage />
  if (path === '/game' && IS_CLOUD) return <GamePage />

  if (path === '/admin') {
    return (
      <>
        <App />
        <AdminCashierShortcut />
        <HardDeletePanel />
        <ReportsPanel />
      </>
    )
  }

  window.history.replaceState({}, '', '/kasir')
  return <CashierPage />
  })()
  return IS_CLOUD ? <CloudGate>{view}</CloudGate> : view
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootRoute />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Offline cache tidak tersedia:', error)
    })
  })
}
