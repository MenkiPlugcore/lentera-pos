import { StrictMode } from 'react'
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

function normalizePath(pathname) {
  const cleaned = String(pathname || '/').replace(/\/+$/, '')
  return cleaned || '/'
}

function RootRoute() {
  const path = normalizePath(window.location.pathname)

  if (path === '/') {
    window.history.replaceState({}, '', '/kasir')
    return <CashierPage />
  }

  if (path === '/kasir') {
    return <CashierPage />
  }

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
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootRoute />
  </StrictMode>,
)
