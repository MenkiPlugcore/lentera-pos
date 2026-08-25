import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const COMPACT_MAX = 1279
const PHONE_MAX = 767
const ANIMATION_MS = 260

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
      className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-center transition duration-200 ${active ? 'bg-cyan-100 text-cyan-800 ring-2 ring-cyan-300' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
    >
      <span className="text-xl leading-none" aria-hidden="true">{icon}</span>
      <span className="text-[11px] font-black leading-tight">{label}</span>
      {badge && <span className="absolute right-1.5 top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">{badge}</span>}
    </button>
  )
}

export default function POSModalOverlay() {
  const [posRoot, setPosRoot] = useState(null)
  const [aside, setAside] = useState(null)
  const [section, setSection] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  const [modalMounted, setModalMounted] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState('cart')
  const [summary, setSummary] = useState({ count: '0 item', total: 'Rp 0' })

  const originalAsideStyleRef = useRef('')
  const originalSectionStyleRef = useRef('')
  const originalRootStyleRef = useRef('')
  const closeTimerRef = useRef(null)

  const compact = viewportWidth <= COMPACT_MAX
  const phone = viewportWidth <= PHONE_MAX

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('resize', updateViewport)
    return () => {
      window.removeEventListener('resize', updateViewport)
      window.visualViewport?.removeEventListener('resize', updateViewport)
    }
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
    if (!posRoot || !aside || !section) return undefined

    originalRootStyleRef.current = posRoot.getAttribute('style') || ''
    originalAsideStyleRef.current = aside.getAttribute('style') || ''
    originalSectionStyleRef.current = section.getAttribute('style') || ''

    return () => {
      restoreStyle(posRoot, originalRootStyleRef.current)
      restoreStyle(aside, originalAsideStyleRef.current)
      restoreStyle(section, originalSectionStyleRef.current)
    }
  }, [posRoot, aside, section])

  useEffect(() => {
    if (!posRoot || !aside || !section) return

    if (!compact) {
      restoreStyle(posRoot, originalRootStyleRef.current)
      restoreStyle(aside, originalAsideStyleRef.current)
      restoreStyle(section, originalSectionStyleRef.current)
      setModalMounted(false)
      setModalVisible(false)
      return
    }

    section.style.paddingBottom = '154px'

    if (!modalMounted) {
      restoreStyle(posRoot, originalRootStyleRef.current)
      aside.style.display = 'none'
      return
    }

    posRoot.style.zIndex = '100'
    posRoot.style.overflowX = 'hidden'
    posRoot.style.overflowY = 'hidden'

    const common = {
      display: 'block',
      position: 'fixed',
      zIndex: '102',
      overflowY: 'auto',
      overflowX: 'hidden',
      background: '#f8fafc',
      boxShadow: '0 28px 80px rgba(15,23,42,.34)',
      transition: `opacity ${ANIMATION_MS}ms ease, transform ${ANIMATION_MS}ms cubic-bezier(.22,1,.36,1)`,
      opacity: modalVisible ? '1' : '0',
      willChange: 'opacity, transform',
      overscrollBehavior: 'contain',
      WebkitOverflowScrolling: 'touch',
    }

    if (phone) {
      Object.assign(aside.style, common, {
        left: '0',
        right: '0',
        top: 'auto',
        bottom: '0',
        width: '100%',
        maxWidth: '100%',
        height: '88dvh',
        maxHeight: '88dvh',
        padding: '68px 12px calc(110px + env(safe-area-inset-bottom))',
        borderRadius: '26px 26px 0 0',
        transform: modalVisible ? 'translateY(0)' : 'translateY(105%)',
      })
    } else {
      Object.assign(aside.style, common, {
        left: '50%',
        right: 'auto',
        top: '50%',
        bottom: 'auto',
        width: 'min(720px, calc(100vw - 32px))',
        maxWidth: '720px',
        height: '86dvh',
        maxHeight: '86dvh',
        padding: '70px 16px 32px',
        borderRadius: '28px',
        transform: modalVisible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, calc(-50% + 24px)) scale(.97)',
      })
    }
  }, [posRoot, aside, section, compact, phone, modalMounted, modalVisible])

  useEffect(() => {
    if (!posRoot) {
      setModalMounted(false)
      setModalVisible(false)
    }
  }, [posRoot])

  useEffect(() => {
    if (!modalMounted) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalMounted])

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [])

  function openModal(mode = 'cart') {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setModalMode(mode)
    setModalMounted(true)
    setModalVisible(false)
    requestAnimationFrame(() => requestAnimationFrame(() => setModalVisible(true)))

    if (mode === 'payment') {
      setTimeout(() => {
        const input = aside?.querySelector('input[type="number"]')
        input?.focus({ preventScroll: true })
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, ANIMATION_MS + 100)
    }
  }

  function closeModal() {
    setModalVisible(false)
    closeTimerRef.current = setTimeout(() => setModalMounted(false), ANIMATION_MS)
  }

  function focusSearch() {
    closeModal()
    setTimeout(() => {
      const input = findInputByPlaceholder(posRoot, 'cari produk')
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      input?.focus()
    }, ANIMATION_MS + 40)
  }

  function focusScan() {
    closeModal()
    setTimeout(() => {
      const video = posRoot?.querySelector('video')
      if (video) {
        video.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      findButtonByText(posRoot, 'scan kamera')?.click()
      findInputByPlaceholder(posRoot, 'scan lp')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, ANIMATION_MS + 40)
  }

  if (!compact || !posRoot || !aside) return null

  const countBadge = summary.count.match(/\d+/)?.[0] || ''
  const modalTitle = modalMode === 'payment' ? 'Pembayaran' : 'Keranjang'
  const modalIcon = modalMode === 'payment' ? '💵' : '🛒'

  const controlsStyle = phone
    ? { top: 'calc(12dvh + 10px)', left: '12px', right: '12px' }
    : { top: 'calc(7dvh + 10px)', left: '50%', width: 'min(680px, calc(100vw - 64px))', transform: 'translateX(-50%)' }

  const modalLayer = modalMounted ? createPortal(
    <>
      <button
        type="button"
        aria-label="Tutup modal"
        onClick={closeModal}
        className={`fixed inset-0 z-[101] bg-slate-950/45 backdrop-blur-[3px] transition-opacity duration-300 ${modalVisible ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        className={`pointer-events-none fixed z-[103] flex items-center justify-between gap-3 transition-all duration-300 ${modalVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
        style={controlsStyle}
      >
        <div className="pointer-events-auto min-w-0 rounded-2xl bg-white/95 px-4 py-2 shadow-lg backdrop-blur">
          <p className="text-xs font-black uppercase tracking-wide text-cyan-700">{modalIcon} {modalTitle}</p>
          <p className="truncate text-sm font-black text-slate-900">{summary.count} • {summary.total}</p>
        </div>
        <button
          type="button"
          onClick={closeModal}
          className="pointer-events-auto shrink-0 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-lg transition hover:scale-[1.03] active:scale-95"
        >
          ✕ Tutup
        </button>
      </div>
    </>,
    posRoot,
  ) : null

  return (
    <>
      {modalLayer}

      <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_36px_rgba(15,23,42,.12)] backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => openModal('cart')}
            className="mb-2 flex w-full items-center justify-between rounded-2xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-left transition duration-200 hover:bg-cyan-100 active:scale-[.99]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500 text-lg text-white shadow-sm" aria-hidden="true">🛒</span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wide text-cyan-700">Keranjang Aktif</span>
                <span className="block truncate text-sm font-black text-slate-900">{summary.count}</span>
              </span>
            </span>
            <span className="shrink-0 text-sm font-black text-slate-900">{summary.total}</span>
          </button>

          <div className="grid grid-cols-4 gap-1.5">
            <FocusButton icon="🔍" label="Cari" onClick={focusSearch} />
            <FocusButton icon="📷" label="Scan" onClick={focusScan} />
            <FocusButton icon="🛒" label="Keranjang" active={modalMounted && modalMode === 'cart'} badge={countBadge} onClick={() => openModal('cart')} />
            <FocusButton icon="💵" label="Bayar" active={modalMounted && modalMode === 'payment'} onClick={() => openModal('payment')} />
          </div>
        </div>
      </div>
    </>
  )
}
