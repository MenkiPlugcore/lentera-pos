import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import HardDeletePanel from './HardDeletePanel.jsx'
import POSPanel from './POSPanel.jsx'
import ReportsPanel from './ReportsPanel.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <HardDeletePanel />
    <POSPanel />
    <ReportsPanel />
  </StrictMode>,
)
