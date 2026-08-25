import { useEffect, useRef, useState } from 'react'

const COMPACT_QUERY = '(max-width: 1279px)'

function findPosRoot() {
  const heading = Array.from(document.querySelectorAll('h2')).find((node) =>
    String(node.textContent || '').toLowerCase().includes('pos kasir'),
  )

  if (!heading) return null

  let current = heading.parentElement
  while (current && current !== document.body) {
    if (current.classList.contains('fixed') && current.classList.contains('inset-0')) return current
    current = current.parentElement
  }

  return null
}

function findInputByPlaceholder(root, keyword) {
  if (!root) return null
  const normalized = keyword.toLowerCase()
  return Array.from(root.querySelectorAll('input')).find((input) =>
    String(input.placeholder || '').toLowerCase().includes(normalized),
  ) || null
}

function findButtonByText(root, keyword) {
  if (!root) return null
  const normalized = keyword.toLowerCase()
  return Array.from(root.querySelectorAll('button')).find((button) =>
    String(button.textContent || '').toLowerCase().includes(normalized),
  ) || null
}

function readCartSummary(aside) {
  if (!aside) return { count: '0 item', total: 'Rp 0' }

  const count = aside.querySelector('h3')?.textContent?.trim() || '0 item'
  let total = 'Rp 0'

  const labels = Array.from(aside.querySelectorAll('span'))
  const totalLabel = labels.find((node) => String(node.textContent || '').trim().toUpperCase() === 'TOTAL')
  if (totalLabel?.parentElement) {
    const siblings = Array.from(totalLabel.parentElement.querySelectorAll('span'))
    const value = siblings.at(-1)?.textContent?.trim()
    if (value) total = value
  }

  return { count, total }
}

function restoreStyle(element, original) {
  if (!element) return
  if (original) element.setAttribute('style', original)
  else element.removeAttribute('style')
}

function FocusButton({ icon, label, active = false, badge = '', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-center transition ${
        active
          ? 'bg-cyan-100 text-cyan-800 ring-2 ring-cyan-300'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <span className="text-xl leading-none" aria-hidden="true">{icon}</span>
      <span className="text-[11px] font-black leading-tight">{label}</span>
      {badge && (
        <span className="absolute right-1.5 top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

export default function POSFocusOverlay() {
  const [posRoot, setPosRoot] = useState(null)
  const [aside, setAside] = useState(null)
  const [section, setSection] = useState(null)
  const [compact, setCompact] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summary, setSummary] = useState({ count: '0 item', total: 'Rp 0' })

  const originalAsideStyleRef = useRef('')
  const originalSectionStyleRef = useRef('')

  useEffect(() => {
    const query = window.matchMedia(COMPACT_QUERY)
    const update = () => setCompact(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    let frame = null

    const scan = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const root = findPosRoot()
        const nextAside = root?.querySelector('aside') || null
        const nextSection = root?.querySelector('section') || null
        setPosRoot((current) => current === root ? current : root)
        setAside((current) => current === nextAside ? current : nextAside)
        setSection((current) => current === nextSection ? current : nextSection)
      })
    }

    scan()
    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (!aside) {
      setSummary({ count: '0 item', total: 'Rp 0' })
      return undefined
    }

    const update = () => setSummary(readCartSummary(aside))
    update()

    const observer = new MutationObserver(update)
    observer.observe(aside, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [aside])

  useEffect(() => {
    if (!aside || !section) return undefined

    originalAsideStyleRef.current = aside.getAttribute('style') || ''
    originalSectionStyleRef.current = section.getAttribute('style') || ''

    return () => {
      restoreStyle(aside, originalAsideStyleRef.current)
      restoreStyle(section, originalSectionStyleRef.current)
    }
  }, [aside, section])

  useEffect(() => {
    if (!aside || !section) return

    if (!compact) {
      restoreStyle(aside, originalAsideStyleRef.current)
      restoreStyle(section, originalSectionStyleRef.current)
      setDrawerOpen(false)
      return
    }

    section.style.paddingBottom = '150px'

    if (!drawerOpen) {
      aside.style.display = 'none'
      aside.style.position = ''
      aside.style.left = ''
      aside.style.right = ''
      aside.style.top = ''
      aside.style.bottom = ''
      aside.style.zIndex = ''
      aside.style.height = ''
      aside.style.maxHeight = ''
      aside.style.overflowY = ''
      aside.style.padding = ''
      aside.style.background = ''
      aside.style.borderRadius = ''
      aside.style.boxShadow = ''
      return
    }

    Object.assign(aside.style, {
      display: 'block',
      position: 'fixed',
      left: '0',
      right: '0',
      top: '18vh',
      bottom: '0',
      zIndex: '74',
      height: '82vh',
      maxHeight: '82vh',
      overflowY: 'auto',
      padding: '64px 16px 120px',
      background: '#f8fafc',
      borderRadius: '28px 28px 0 0',
      boxShadow: '0 -24px 64px rgba(15,23,42,.22), 0 0 0 100vmax rgba(15,23,42,.28)',
    })
  }, [aside, section, compact, drawerOpen])

  useEffect(() => {
    if (!posRoot) setDrawerOpen(false)
  }, [posRoot])

  function focusSearch() {
    setDrawerOpen(false)
    const input = findInputByPlaceholder(posRoot, 'cari produk')
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => input?.focus(), 250)
  }

  function focusScan() {
    setDrawerOpen(false)

    const existingVideo = posRoot?.querySelector('video')
    if (existingVideo) {
      existingVideo.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const cameraButton = findButtonByText(posRoot, 'scan kamera')
    cameraButton?.click()

    const scanInput = findInputByPlaceholder(posRoot, 'scan lp')
    scanInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function toggleCart() {
    setDrawerOpen((current) => !current)
  }

  function focusPayment() {
    setDrawerOpen(true)
    setTimeout(() => {
      const input = aside?.querySelector('input[type="number"]')
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      input?.focus()
    }, 180)
  }

  if (!compact || !posRoot || !aside) return null

  const countBadge = summary.count.match(/\d+/)?.[0] || ''

  return (
    <>
      {drawerOpen && (
        <div
          className="fixed inset-x-0 z-[78] flex items-center justify-between px-5"
          style={{ top: 'calc(18vh + 12px)' }}
        >
          <div className="rounded-2xl bg-white/95 px-4 py-2 shadow-lg backdrop-blur">
            <p className="text-xs font-black uppercase tracking-wide text-cyan-700">🛒 Keranjang</p>
            <p className="text-sm font-black text-slate-900">{summary.count} • {summary.total}</p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-lg"
          >
            ✕ Tutup
          </button>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_36px_rgba(15,23,42,.12)] backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={toggleCart}
            className="mb-2 flex w-full items-center justify-between rounded-2xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-left"
          >
            <span className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500 text-lg text-white" aria-hidden="true">🛒</span>
              <span>
                <span className="block text-[10px] font-black uppercase tracking-wide text-cyan-700">Keranjang Aktif</span>
                <span className="block text-sm font-black text-slate-900">{summary.count}</span>
              </span>
            </span>
            <span className="text-sm font-black text-slate-900">{summary.total}</span>
          </button>

          <div className="grid grid-cols-4 gap-1.5">
            <FocusButton icon="🔍" label="Cari" onClick={focusSearch} />
            <FocusButton icon="📷" label="Scan" onClick={focusScan} />
            <FocusButton icon="🛒" label={drawerOpen ? 'Tutup' : 'Keranjang'} active={drawerOpen} badge={countBadge} onClick={toggleCart} />
            <FocusButton icon="💵" label="Bayar" active={drawerOpen} onClick={focusPayment} />
          </div>
        </div>
      </div>
    </>
  )
}
