import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './responsive.css'
import './barcodeDetectorPolyfill.js'
import App from './App.jsx'
import HardDeletePanel from './HardDeletePanel.jsx'
import POSPanel from './POSPanel.jsx'
import POSModalOverlay from './POSModalOverlay.jsx'
import ReportsPanel from './ReportsPanel.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <HardDeletePanel />
    <POSPanel />
    <POSModalOverlay />
    <ReportsPanel />
  </StrictMode>,
)
