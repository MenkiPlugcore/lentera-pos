import { useEffect, useId, useRef, useState } from 'react'
import { formatRupiah } from './customerProfiles.js'
import { calculateChange } from './subtraction.js'
import './subtraction.css'

// Kalkulator bantuan terpisah dari jawaban; hasilnya tidak memengaruhi skor/XP.
export default function SubtractionSlide({ open, onClose, challengeId, paidAmount, totalAmount }) {
  const [paid, setPaid] = useState(String(paidAmount ?? 0))
  const [total, setTotal] = useState(String(totalAmount ?? 0))
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const closeRef = useRef(null)
  const panelRef = useRef(null)
  const titleId = useId()
  const detailId = useId()

  useEffect(() => {
    setPaid(String(paidAmount ?? 0))
    setTotal(String(totalAmount ?? 0))
    setResult(null)
    setError('')
  }, [challengeId, paidAmount, totalAmount])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const controls = Array.from(panelRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled])'
      ) || []).filter(el => el.getClientRects().length)
      if (!controls.length) return
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      if (previous?.isConnected && typeof previous.focus === 'function') previous.focus()
    }
  }, [open, onClose])

  const edit = setter => event => {
    setter(event.target.value.replace(/\D/g, '').slice(0, 10))
    setResult(null)
    setError('')
  }
  const reset = () => {
    setPaid(String(paidAmount ?? 0))
    setTotal(String(totalAmount ?? 0))
    setResult(null)
    setError('')
  }
  const calculate = event => {
    event.preventDefault()
    const value = calculateChange(paid, total)
    if (!value.ok) {
      setResult(null)
      setError(value.error)
      return
    }
    setError('')
    setResult(value)
  }

  return <div id="arcade-subtraction-slide" className={'subtraction-slide-layer' + (open ? ' subtraction-slide-layer--open' : '')}
    aria-hidden={!open} inert={!open}>
    <button type="button" tabIndex={-1} aria-hidden="true" className="subtraction-slide-backdrop"
      onClick={onClose}/>
    <section className="subtraction-slide-panel" ref={panelRef}
      role="dialog" aria-modal={open ? 'true' : undefined}
      aria-labelledby={titleId} aria-describedby={detailId}>
      <div className="subtraction-slide-head">
        <div className="subtraction-slide-title">
          <span className="subtraction-slide-icon" aria-hidden="true">−</span>
          <div>
            <h2 id={titleId}>Kalkulator</h2>
            <p id={detailId}>Bantuan pengurangan</p>
          </div>
        </div>
        <button type="button" ref={closeRef} className="subtraction-slide-close"
          onClick={onClose} aria-label="Tutup kalkulator">✕</button>
      </div>

      <form onSubmit={calculate} className="subtraction-slide-content">
        <div className="subtraction-slide-equation">
          <label htmlFor={titleId + '-paid'}>Uang pelanggan (Rp)</label>
          <input id={titleId + '-paid'} type="text" inputMode="numeric" pattern="[0-9]*"
            autoComplete="off" maxLength={10} value={paid} onChange={edit(setPaid)}
            aria-label="Jumlah uang yang diberikan pelanggan dalam rupiah"/>
          <span className="subtraction-slide-symbol" aria-hidden="true">−</span>
          <label htmlFor={titleId + '-total'}>Total belanja (Rp)</label>
          <input id={titleId + '-total'} type="text" inputMode="numeric" pattern="[0-9]*"
            autoComplete="off" maxLength={10} value={total} onChange={edit(setTotal)}
            aria-label="Total harga belanja dalam rupiah"/>
        </div>

        <div className="subtraction-slide-action-row">
          <button type="submit" className="subtraction-slide-calculate">Hitung −</button>
          <button type="button" className="subtraction-slide-reset" onClick={reset}>Isi ulang</button>
        </div>

        <div className="subtraction-slide-result" aria-live="polite" aria-atomic="true">
          {error ? (
            <p role="alert" className="subtraction-slide-error">{error}</p>
          ) : result ? (
            <>
              <span className="subtraction-slide-result-label">
                {result.insufficient ? 'Uang masih kurang' : 'Uang kembalian'}
              </span>
              <strong>{formatRupiah(result.insufficient ? result.shortage : result.change)}</strong>
              <div className="subtraction-slide-formula">
                {formatRupiah(result.paid)} − {formatRupiah(result.total)}
                {' = '}
                {result.insufficient
                  ? '−' + formatRupiah(result.shortage)
                  : formatRupiah(result.change)}
              </div>
              <p>{result.insufficient
                ? 'Uang pelanggan belum cukup untuk belanja.'
                : 'Sekarang susun uang kembalian di laci kasir.'}</p>
            </>
          ) : (
            <div className="subtraction-slide-placeholder">
              <span aria-hidden="true">= ?</span>
              <p>Tekan <strong>Hitung</strong> untuk melihat selisihnya.</p>
            </div>
          )}
        </div>

        <button type="button" className="subtraction-slide-return" onClick={onClose}>
          ← Kembali ke permainan
        </button>
      </form>
    </section>
  </div>
}
