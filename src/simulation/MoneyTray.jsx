import { CASH_DENOMINATIONS, MAX_CASH_PIECES, addCash, canAddCash, cashBreakdown, removeCashValue, removeLastCash, totalCash } from './cashMoney.js'
import { formatRupiah } from './customerProfiles.js'

function MoneyPiece({ denomination, disabled, onSelect, imageUrl }) {
  const { value, type, color, light } = denomination
  const isCoin = type === 'coin'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(value)}
      className={'cash-piece-button ' + (isCoin ? 'cash-piece-button--coin' : '')}
      aria-label={'Tambahkan ' + (isCoin ? 'koin' : 'uang kertas') + ' ' + formatRupiah(value)}
    >
      {imageUrl ? (
        <span className={'cash-piece cash-piece--uploaded '+(isCoin?'cash-piece--uploaded-coin':'cash-piece--uploaded-note')} aria-hidden="true">
          <img loading="lazy" src={imageUrl} alt="" />
        </span>
      ) : (
      <span className={'cash-piece ' + (isCoin ? 'cash-piece--coin' : 'cash-piece--note')}
        style={{ '--cash-tone': color, '--cash-light': light }} aria-hidden="true">
        {isCoin ? (
          <span className="cash-coin-face">
            <span className="cash-coin-mark">LENTERA</span>
            <strong>{value.toLocaleString('id-ID')}</strong>
            <small>RUPIAH</small>
          </span>
        ) : (
          <>
            <span className="cash-note-top"><span>LENTERA</span><span>UANG LATIHAN</span></span>
            <span className="cash-note-middle">
              <span className="cash-note-flower">✦</span>
              <strong>{value.toLocaleString('id-ID')}</strong>
            </span>
            <span className="cash-note-bottom">RUPIAH</span>
          </>
        )}
      </span>)}
      <span className="cash-piece-caption">+ {formatRupiah(value)}</span>
    </button>
  )
}

export default function MoneyTray({ selected, paidAmount, busy, onChange, onConfirm, images = {}, compact = false }) {
  const total = totalCash(selected)
  const breakdown = cashBreakdown(selected)
  const count = selected.length
  const atLimit = count >= MAX_CASH_PIECES
  const add = amount => onChange(addCash(selected, amount, paidAmount))
  const available = compact ? CASH_DENOMINATIONS.filter(d => d.value <= paidAmount) : CASH_DENOMINATIONS

  return (
    <div className={'cash-tray' + (compact ? ' cash-tray--arcade' : '')}>
      <div className="cash-tray-heading flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-lg font-black">Laci Uang Latihan</h4>
          <p className="mt-1 text-sm text-slate-300">Ketuk uang untuk memasukkannya ke baki kembalian.</p>
        </div>
        <span className="cash-training-label">Hanya simulasi</span>
      </div>

      {compact && (
        <div className="cash-pocket-summary">
          <div>
            <span>Total kembalian disiapkan</span>
            <strong aria-live="polite">{formatRupiah(total)}</strong>
          </div>
          <div className="cash-pocket-actions">
            <button type="button" className="cash-pocket-submit" disabled={busy || count === 0} onClick={() => onConfirm(total)}>
              {busy ? 'Memeriksa...' : 'Serahkan Uang'}
            </button>
            <button type="button" disabled={busy} className="cash-pocket-zero"
              onClick={() => onConfirm(0)}>Uang pas (Rp0)</button>
          </div>
        </div>
      )}

      <p className="mt-5 text-sm font-bold text-slate-200">Uang kertas</p>
      <div className="cash-piece-grid mt-3" role="group" aria-label="Pilih pecahan uang kertas">
        {available.filter(d => d.type === 'note').map(d => (
          <MoneyPiece key={d.value} denomination={d} imageUrl={images[d.value]}
            disabled={busy || !canAddCash(selected, d.value, paidAmount)}
            onSelect={add}/>
        ))}
      </div>

      <p className="mt-5 text-sm font-bold text-slate-200">Uang logam</p>
      <div className="cash-piece-grid cash-piece-grid--coins mt-3" role="group" aria-label="Pilih pecahan uang logam">
        {available.filter(d => d.type === 'coin').map(d => (
          <MoneyPiece key={d.value} denomination={d} imageUrl={images[d.value]}
            disabled={busy || !canAddCash(selected, d.value, paidAmount)}
            onSelect={add}/>
        ))}
      </div>

      <section className={"cash-counting-area mt-6" + (compact ? " cash-counting-area--compact" : "")} aria-label="Baki uang kembalian">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="cash-counting-caption">
            {compact ? (
              <p className="text-sm font-bold text-slate-200">{count} uang dipilih</p>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-200">Uang yang kamu siapkan</p>
                <p className="mt-1 text-3xl font-black text-emerald-300" aria-live="polite">{formatRupiah(total)}</p>
                <p className="mt-1 text-sm text-slate-400">{count} lembar atau koin dipilih</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="cash-small-button"
              disabled={busy || count === 0}
              onClick={() => onChange(removeLastCash(selected))}>Batalkan Terakhir</button>
            <button type="button" className="cash-small-button"
              disabled={busy || count === 0}
              onClick={() => onChange([])}>Kosongkan Baki</button>
          </div>
        </div>

        {breakdown.length ? (
          <div className="cash-selected-grid mt-4" aria-label="Rincian uang kembalian">
            {breakdown.map(d => (
              <div className="cash-selected-piece" key={d.value}>
                <span className="font-bold">{formatRupiah(d.value)} <span className="text-cyan-200">× {d.count}</span></span>
                <button type="button" disabled={busy}
                  className="cash-remove-button"
                  onClick={() => onChange(removeCashValue(selected, d.value))}
                  aria-label={'Kurangi satu pecahan ' + formatRupiah(d.value)}>− 1</button>
              </div>
            ))}
          </div>
        ) : (
          <p className={compact ? 'cash-compact-empty' : 'mt-4 rounded-xl border border-dashed border-slate-600 p-4 text-center text-sm text-slate-400'}>
            {compact ? 'Pilih pecahan uang di atas untuk menyiapkan kembalian.' : 'Bakimu masih kosong. Pilih uang di atas.'}
          </p>
        )}

        {atLimit && <p className="mt-3 text-sm text-amber-200" role="status">
          Baki sudah penuh. Coba gunakan pecahan yang lebih besar.
        </p>}
        {!compact && (
          <p className="mt-3 text-xs text-slate-400">
            Pecahan yang melebihi uang pelanggan otomatis tidak dapat dipilih. Kamu bisa menghapus pilihan kapan saja.
          </p>
        )}

        <button type="button" className="primary-button cash-submit-button mt-5"
          disabled={busy || count === 0}
          onClick={() => onConfirm(total)}>
          {busy ? 'Memeriksa...' : 'Serahkan Kembalian · ' + formatRupiah(total)}
        </button>
        <button type="button" className="cash-zero-button mt-3"
          disabled={busy}
          onClick={() => onConfirm(0)}>
          Uang Pas — Tidak Perlu Kembalian (Rp0)
        </button>
      </section>
      {!compact && (
        <p className="mt-4 text-center text-xs text-slate-500">
          Gambar uang dan koin bisa diganti admin. Jika belum ada foto, tampil ilustrasi latihan bawaan.
        </p>
      )}
    </div>
  )
}
