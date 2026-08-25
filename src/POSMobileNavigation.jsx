import { useEffect, useRef, useState } from 'react'
import './pos-mobile.css'

const COMPACT_MAX = 1279

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
  if (!aside) return { count: 0, countLabel: '0 item', total: 'Rp 0' }

  const countLabel = aside.querySelector('h3')?.textContent?.trim() || '0 item'
  const count = Number(countLabel.match(/\d+/)?.[0] || 0)
  let total = 'Rp 0'

  const labels = Array.from(aside.querySelectorAll('span'))
  const totalLabel = labels.find((node) => String(node.textContent || '').trim().toUpperCase() === 'TOTAL')
  if (totalLabel?.parentElement) {
    const siblings = Array.from(totalLabel.parentElement.querySelectorAll('span'))
    const value = siblings.at(-1)?.textContent?.trim()
    if (value) total = value
  }

  return { count, countLabel, total }
}

function restoreStyle(element, original) {
  if (!element) return
  if (original) element.setAttribute('style', original)
  else element.removeAttribute('style')
}

function NavButton({ icon, label, active = false, badge = '', onClick }) {
  return (
    <button
      type="button"
      className={`pos-mobile-nav-button ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <span className="pos-mobile-nav-icon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
      {badge ? <span className="pos-mobile-nav-badge">{badge}</span> : null}
    </button>
  )
}

export default function POSMobileNavigation() {
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  const [posRoot, setPosRoot] = useState(null)
  const [section, setSection] = useState(null)
  const [aside, setAside] = useState(null)
  const [grid, setGrid] = useState(null)
  const [activeView, setActiveView] = useState('products')
  const [summary, setSummary] = useState({ count: 0, countLabel: '0 item', total: 'Rp 0' })

  const originalsRef = useRef({ root: '', section: '', aside: '', grid: '' })
  const compact = viewportWidth <= COMPACT_MAX

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    let frame = null

    const scan = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const root = findPosRoot()
        const nextSection = root?.querySelector('section') || null
        const nextAside = root?.querySelector('aside') || null
        const nextGrid = nextSection?.parentElement || null

        setPosRoot((current) => current === root ? current : root)
        setSection((current) => current === nextSection ? current : nextSection)
        setAside((current) => current === nextAside ? current : nextAside)
        setGrid((current) => current === nextGrid ? current : nextGrid)
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
      setSummary({ count: 0, countLabel: '0 item', total: 'Rp 0' })
      return undefined
    }

    const update = () => setSummary(readCartSummary(aside))
    update()

    const observer = new MutationObserver(update)
    observer.observe(aside, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [aside])

  useEffect(() => {
    if (!posRoot || !section || !aside || !grid) return undefined

    originalsRef.current = {
      root: posRoot.getAttribute('style') || '',
      section: section.getAttribute('style') || '',
      aside: aside.getAttribute('style') || '',
      grid: grid.getAttribute('style') || '',
    }

    return () => {
      restoreStyle(posRoot, originalsRef.current.root)
      restoreStyle(section, originalsRef.current.section)
      restoreStyle(aside, originalsRef.current.aside)
      restoreStyle(grid, originalsRef.current.grid)
    }
  }, [posRoot, section, aside, grid])

  useEffect(() => {
    if (!posRoot || !section || !aside || !grid) return

    if (!compact) {
      restoreStyle(posRoot, originalsRef.current.root)
      restoreStyle(section, originalsRef.current.section)
      restoreStyle(aside, originalsRef.current.aside)
      restoreStyle(grid, originalsRef.current.grid)
      setActiveView('products')
      return
    }

    posRoot.style.overflowX = 'hidden'
    grid.style.display = 'block'
    grid.style.width = '100%'
    grid.style.maxWidth = '100%'
    grid.style.paddingBottom = '156px'

    if (activeView === 'products') {
      section.style.display = 'block'
      section.style.width = '100%'
      section.style.maxWidth = '100%'
      section.style.animation = 'posViewIn 180ms ease-out'

      aside.style.display = 'none'
      return
    }

    section.style.display = 'none'

    Object.assign(aside.style, {
      display: 'block',
      position: 'static',
      inset: 'auto',
      left: 'auto',
      right: 'auto',
      top: 'auto',
      bottom: 'auto',
      width: '100%',
      maxWidth: '760px',
      height: 'auto',
      maxHeight: 'none',
      margin: '0 auto',
      padding: '0',
      overflow: 'visible',
      transform: 'none',
      opacity: '1',
      zIndex: 'auto',
      background: 'transparent',
      borderRadius: '0',
      boxShadow: 'none',
      animation: 'posViewIn 180ms ease-out',
    })
  }, [posRoot, section, aside, grid, compact, activeView])

  useEffect(() => {
    if (!posRoot) setActiveView('products')
  }, [posRoot])

  function showProducts() {
    setActiveView('products')
    setTimeout(() => {
      posRoot?.scrollTo?.({ top: 0, behavior: 'smooth' })
    }, 40)
  }

  function showCart() {
    setActiveView('cart')
    setTimeout(() => {
      posRoot?.scrollTo?.({ top: 0, behavior: 'smooth' })
    }, 40)
  }

  function openScanner() {
    setActiveView('products')
    setTimeout(() => {
      const video = posRoot?.querySelector('video')
      if (video) {
        video.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }

      const cameraButton = findButtonByText(posRoot, 'scan kamera')
      cameraButton?.click()

      const scanInput = findInputByPlaceholder(posRoot, 'scan lp')
      scanInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }

  function openPayment() {
    setActiveView('cart')
    setTimeout(() => {
      const input = aside?.querySelector('input[type="number"]')
      input?.focus({ preventScroll: true })
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
  }

  if (!compact || !posRoot || !section || !aside) return null

  return (
    <nav className="pos-mobile-app-nav" aria-label="Navigasi POS mobile">
      <button type="button" className="pos-mobile-cart-summary" onClick={showCart}>
        <span className="pos-mobile-cart-summary-icon" aria-hidden="true">🛒</span>
        <span className="pos-mobile-cart-summary-copy">
          <strong>{summary.countLabel}</strong>
          <span>Keranjang aktif</span>
        </span>
        <strong className="pos-mobile-cart-summary-total">{summary.total}</strong>
      </button>

      <div className="pos-mobile-nav-grid">
        <NavButton icon="🛍️" label="Produk" active={activeView === 'products'} onClick={showProducts} />
        <NavButton icon="📷" label="Scan" onClick={openScanner} />
        <NavButton icon="🛒" label="Keranjang" active={activeView === 'cart'} badge={summary.count > 0 ? String(summary.count) : ''} onClick={showCart} />
        <NavButton icon="💵" label="Bayar" active={activeView === 'cart'} onClick={openPayment} />
      </div>
    </nav>
  )
}
