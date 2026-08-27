import { useEffect, useState } from 'react'
import POSPanel from './POSPanel.jsx'

function findButton(label) {
  const keyword = label.toLowerCase()
  return Array.from(document.querySelectorAll('button')).find((button) =>
    String(button.textContent || '').toLowerCase().includes(keyword),
  ) || null
}

export default function CashierPage() {
  const [authorized, setAuthorized] = useState(null)

  useEffect(() => {
    let active = true

    fetch('/api/auth/status')
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        if (!data?.authenticated) {
          window.location.replace('/admin')
          return
        }
        setAuthorized(true)
      })
      .catch(() => {
        if (active) window.location.replace('/admin')
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!authorized) return undefined

    document.documentElement.dataset.route = 'kasir'
    document.body.dataset.route = 'kasir'

    let attempts = 0
    let timer = null

    const openCashier = () => {
      const launch = findButton('buka pos kasir')
      if (launch) {
        launch.click()
        return
      }

      attempts += 1
      if (attempts < 80) timer = window.setTimeout(openCashier, 100)
    }

    openCashier()

    const handleClick = (event) => {
      const button = event.target?.closest?.('button')
      if (!button) return
      const text = String(button.textContent || '').toLowerCase()
      if (!text.includes('kembali ke admin')) return

      event.preventDefault()
      event.stopPropagation()
      window.location.assign('/admin')
    }

    document.addEventListener('click', handleClick, true)

    return () => {
      if (timer) window.clearTimeout(timer)
      document.removeEventListener('click', handleClick, true)
      delete document.documentElement.dataset.route
      delete document.body.dataset.route
    }
  }, [authorized])

  if (!authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-700">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold shadow-sm">
          Memuat POS Kasir...
        </div>
      </main>
    )
  }

  return <POSPanel />
}
