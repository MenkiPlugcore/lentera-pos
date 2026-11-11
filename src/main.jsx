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
import PublicCashierPage from './PublicCashierPage.jsx'
import PublicHomePage from './PublicHomePage.jsx'
import VisualCustomerPage from './simulation/VisualCustomerPage.jsx'

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
    <main className="portal-login-page">
      <form onSubmit={submit} className="portal-login-card">
        <div className="portal-login-badge" aria-hidden="true">☘</div>
        <div className="portal-login-kicker">LENTERA POS · AKSES PETUGAS</div>
        <h1>Masuk Admin</h1>
        <p>Kelola produk, gambar uang, stok, dan transaksi melalui akun admin LENTERA POS.</p>
        <label className="mt-7">Username
          <input className="input mt-2 w-full" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required />
        </label>
        <label className="mt-4">Password
          <input className="input mt-2 w-full" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </label>
        {error && <p className="portal-login-error mt-4" role="alert">{error}</p>}
        <button className="primary-button portal-login-submit mt-6 w-full py-3" type="submit" disabled={loading}>
          {loading ? 'Memeriksa...' : 'Masuk ke Dashboard'}
        </button>
        <a className="portal-login-back" href="/">← Kembali ke beranda</a>
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
      <div className="portal-adminbar">
        <span className="portal-adminbar-user">● Admin · {state.user.fullName || state.user.username}</span>
        <nav className="portal-adminbar-nav" aria-label="Navigasi LENTERA POS">
          <a href="/admin">Dashboard</a>
          <a href="/admin/produk">Produk</a>
          <a href="/admin/gambar-uang">Gambar Uang</a>
          <a href="/admin/produk/tambah">+ Tambah Produk</a>
          <a href="/kasir">Kasir</a>
          <a href="/cafe">Smart Cafe</a>
          <a href="/kasir-umum">Kasir Biasa</a>
          <a href="/simulasi">Simulasi</a>
          <a href="/">Beranda</a>
          <button type="button" onClick={logout}>Keluar</button>
        </nav>
      </div>
      {children}
    </>
  )
}

function PublicHeader() {
  const [menuOpen,setMenuOpen]=useState(false)
  const current=normalizePath(window.location.pathname)
  const nav=[
    {href:'/',label:'Beranda'},
    {href:'/simulasi',label:'Simulasi Pelanggan'},
    {href:'/kasir-umum',label:'Kasir Biasa'},
  ]
  return <header className="portal-header">
    <a href="#page-content" className="portal-skip">Langsung ke konten</a>
    <div className="portal-header-inner">
      <a href="/" className="portal-brand" aria-label="LENTERA POS, kembali ke beranda">
        <span className="portal-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19.5 4.5c-8 .2-13.9 3.4-14.6 9-.5 4.4 2.8 6.5 6.3 5.3 6.6-2.2 8.1-8.8 8.3-14.3Z"/>
            <path d="M4.5 20c1.7-4 4.2-6.8 9.6-10.1"/>
          </svg>
        </span>
        <span className="portal-brand-copy"><strong>LENTERA POS</strong><small>Belajar • Berlatih • Berkembang</small></span>
      </a>
      <button type="button" className="portal-menu-toggle" aria-label={menuOpen?'Tutup menu navigasi':'Buka menu navigasi'}
        aria-expanded={menuOpen} aria-controls="portal-site-nav"
        onClick={()=>setMenuOpen(open=>!open)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {menuOpen ? <path d="M5 5l14 14M19 5 5 19"/> : <path d="M4 6h16M4 12h16M4 18h16"/>}
        </svg>
        Menu
      </button>
      <nav id="portal-site-nav" className="portal-nav" data-open={menuOpen} aria-label="Navigasi situs umum">
        {nav.map(item=><a href={item.href} key={item.href} className="portal-nav-link"
          aria-current={current===item.href?'page':undefined}
          onClick={()=>setMenuOpen(false)}>{item.label}</a>)}
        <a href="/admin" className="portal-nav-link portal-nav-admin">Masuk Admin</a>
      </nav>
    </div>
  </header>
}

function PublicShell({children}) {
  return <div className="portal-shell">
    <PublicHeader/>
    <div id="page-content">{children}</div>
  </div>
}

function RootRoute() {
  const path = normalizePath(window.location.pathname)

  if (!IS_CLOUD) {
    if (path === '/admin') return <><App/><AdminCashierShortcut/><HardDeletePanel/><ReportsPanel/></>
    if (path !== '/kasir') window.history.replaceState({}, '', '/kasir')
    return <CashierPage/>
  }

  if (path === '/' || path === '/home') return <PublicShell><PublicHomePage/></PublicShell>
  if (path === '/simulasi') return <PublicShell><VisualCustomerPage/></PublicShell>
  if (path === '/kasir-umum' || path === '/game') return <PublicShell><PublicCashierPage/></PublicShell>

  if (path === '/kasir') return <CloudGate><CashierPage/></CloudGate>
  if (path === '/cafe') return <CloudGate><CafePage/></CloudGate>
  if (path === '/admin/produk') return <CloudGate><App view="products"/></CloudGate>
  if (path === '/admin/gambar-uang') return <CloudGate><App view="money"/></CloudGate>
  if (path === '/admin/produk/tambah') return <CloudGate><App view="create"/></CloudGate>
  const editProductRoute = path.match(/^\/admin\/produk\/edit\/([0-9a-f-]{36})$/i)
  if (editProductRoute) return <CloudGate><App view="edit" editProductId={editProductRoute[1]}/></CloudGate>
  if (path === '/admin') return <CloudGate>
    <App/>
    <AdminCashierShortcut/>
    <HardDeletePanel/>
    <ReportsPanel/>
  </CloudGate>

  window.history.replaceState({}, '', '/')
  return <PublicShell><PublicHomePage/></PublicShell>
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
