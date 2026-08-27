import { useEffect, useState } from 'react'

export default function AdminCashierShortcut() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    fetch('/api/auth/status')
      .then((response) => response.json())
      .then((data) => setVisible(Boolean(data?.authenticated)))
      .catch(() => setVisible(false))
  }, [])

  if (!visible) return null

  return (
    <a
      href="/kasir"
      className="fixed bottom-5 left-5 z-40 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-white shadow-xl shadow-cyan-950/20 transition hover:bg-cyan-600"
    >
      <span aria-hidden="true">🛒</span>
      Buka Kasir
    </a>
  )
}
