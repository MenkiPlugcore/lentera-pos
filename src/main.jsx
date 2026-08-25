import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './responsive.css'
import './barcodeDetectorPolyfill.js'
import App from './App.jsx'
import HardDeletePanel from './HardDeletePanel.jsx'
import POSPanel from './POSPanel.jsx'
import POSMobileNavigation from './POSMobileNavigation.jsx'
import ReportsPanel from './ReportsPanel.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <HardDeletePanel />
    <POSPanel />
    <POSMobileNavigation />
    <ReportsPanel />
  </StrictMode>,
)
