import { useEffect, useMemo, useState } from 'react'

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatShortDate(value) {
  if (!value) return '-'
  const [year, month, day] = String(value).slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

function dateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function currentMonthRange() {
  const now = new Date()
  return {
    from: dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: dateInputValue(now),
  }
}

async function apiFetch(url) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || 'Permintaan gagal diproses.')
  return data
}

function statusLabel(status) {
  if (status === 'completed') return 'Selesai'
  if (status === 'cancelled') return 'Dibatalkan'
  if (status === 'pending') return 'Pending'
  return status || '-'
}

function StatusBadge({ status }) {
  const classes = status === 'completed'
    ? 'border-emerald-900 bg-emerald-950/50 text-emerald-300'
    : status === 'cancelled'
      ? 'border-rose-900 bg-rose-950/50 text-rose-300'
      : 'border-amber-900 bg-amber-950/50 text-amber-300'

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${classes}`}>{statusLabel(status)}</span>
}

function SummaryCard({ label, value, note }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  )
}

export default function ReportsPanel() {
  const initialRange = useMemo(() => currentMonthRange(), [])
  const [authorized, setAuthorized] = useState(false)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('report')
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [query, setQuery] = useState('')
  const [report, setReport] = useState({ summary: {}, daily: [], products: [], cashiers: [] })
  const [transactions, setTransactions] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/auth/status')
      .then((data) => setAuthorized(Boolean(data.authenticated)))
      .catch(() => setAuthorized(false))
  }, [])

  async function loadData(nextFrom = from, nextTo = to, nextQuery = query) {
    setLoading(true)
    setError('')
    setExpandedId(null)

    const params = new URLSearchParams({ from: nextFrom, to: nextTo })
    const historyParams = new URLSearchParams({ from: nextFrom, to: nextTo, q: nextQuery.trim() })

    try {
      const [reportData, historyData] = await Promise.all([
        apiFetch(`/api/reports/sales?${params.toString()}`),
        apiFetch(`/api/transactions?${historyParams.toString()}`),
      ])
      setReport(reportData.report || { summary: {}, daily: [], products: [], cashiers: [] })
      setTransactions(historyData.transactions || [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  async function showPanel() {
    setOpen(true)
    await loadData()
  }

  async function applyPreset(days) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)
    const nextFrom = dateInputValue(start)
    const nextTo = dateInputValue(now)
    setFrom(nextFrom)
    setTo(nextTo)
    await loadData(nextFrom, nextTo, query)
  }

  async function applyCurrentMonth() {
    const range = currentMonthRange()
    setFrom(range.from)
    setTo(range.to)
    await loadData(range.from, range.to, query)
  }

  async function submitFilter(event) {
    event.preventDefault()
    await loadData(from, to, query)
  }

  if (!authorized) return null

  const summary = report.summary || {}
  const daily = report.daily || []
  const products = report.products || []
  const cashiers = report.cashiers || []
  const maxDailyRevenue = Math.max(...daily.map((item) => Number(item.revenue || 0)), 1)

  return (
    <>
      <button
        type="button"
        onClick={showPanel}
        className="fixed bottom-[72px] left-5 z-40 rounded-2xl border border-violet-800/80 bg-violet-950/90 px-5 py-3 text-sm font-black text-violet-200 shadow-xl shadow-black/30 hover:bg-violet-900"
      >
        Riwayat & Laporan
      </button>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-slate-100">
          <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">LENTERA POS</p>
                <h2 className="mt-1 text-2xl font-black">Riwayat Transaksi & Laporan Penjualan</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Kembali ke Admin</button>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-5 py-6">
            <div className="mb-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setTab('report')} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === 'report' ? 'bg-violet-500 text-slate-950' : 'border border-slate-700 bg-slate-900 text-slate-300'}`}>Laporan Penjualan</button>
              <button type="button" onClick={() => setTab('history')} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === 'history' ? 'bg-violet-500 text-slate-950' : 'border border-slate-700 bg-slate-900 text-slate-300'}`}>Riwayat Transaksi</button>
            </div>

            <form onSubmit={submitFilter} className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="grid gap-4 lg:grid-cols-[180px_180px_1fr_auto] lg:items-end">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">Dari</span>
                  <input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">Sampai</span>
                  <input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">Cari Riwayat</span>
                  <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Invoice, kasir, nama produk, SKU..." />
                </label>
                <button type="submit" className="primary-button" disabled={loading}>{loading ? 'Memuat...' : 'Terapkan'}</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="table-button" onClick={() => applyPreset(7)}>7 Hari</button>
                <button type="button" className="table-button" onClick={() => applyPreset(30)}>30 Hari</button>
                <button type="button" className="table-button" onClick={applyCurrentMonth}>Bulan Ini</button>
              </div>
            </form>

            {error && <div className="mb-6 rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm font-semibold text-rose-200">{error}</div>}

            {loading ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-12 text-center text-slate-400">Menyusun laporan...</div>
            ) : tab === 'report' ? (
              <div className="space-y-6">
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <SummaryCard label="Omzet" value={formatRupiah(summary.revenue)} note={`${summary.transactionCount || 0} transaksi`} />
                  <SummaryCard label="Transaksi" value={summary.transactionCount || 0} note="transaksi selesai" />
                  <SummaryCard label="Unit Terjual" value={summary.unitsSold || 0} note="total qty produk" />
                  <SummaryCard label="Rata-rata" value={formatRupiah(summary.averageTicket)} note="per transaksi" />
                  <SummaryCard label="Estimasi Laba" value={formatRupiah(summary.estimatedProfit)} note="harga jual - harga beli" />
                </section>

                <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Tren</p>
                    <h3 className="mt-1 text-xl font-black">Penjualan Harian</h3>
                  </div>
                  {daily.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-500">Belum ada transaksi selesai pada periode ini.</div>
                  ) : (
                    <div className="space-y-3">
                      {daily.map((item) => (
                        <div key={item.date} className="grid gap-2 md:grid-cols-[110px_1fr_150px_100px] md:items-center">
                          <span className="text-sm font-bold text-slate-300">{formatShortDate(item.date)}</span>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max((Number(item.revenue || 0) / maxDailyRevenue) * 100, 2)}%` }} />
                          </div>
                          <span className="text-right font-black">{formatRupiah(item.revenue)}</span>
                          <span className="text-right text-xs text-slate-500">{item.transactionCount} trx</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Produk</p>
                    <h3 className="mt-1 text-xl font-black">Produk Terlaris</h3>
                    <div className="mt-5 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="pb-3">Produk</th><th className="pb-3 text-right">Qty</th><th className="pb-3 text-right">Omzet</th></tr></thead>
                        <tbody className="divide-y divide-slate-800">
                          {products.length === 0 ? <tr><td colSpan="3" className="py-8 text-center text-slate-500">Belum ada data.</td></tr> : products.map((product) => (
                            <tr key={`${product.productId || 'deleted'}-${product.sku}`}>
                              <td className="py-3"><b>{product.name}</b><div className="font-mono text-xs text-cyan-300">{product.sku}</div></td>
                              <td className="py-3 text-right font-black">{product.unitsSold}</td>
                              <td className="py-3 text-right"><b>{formatRupiah(product.revenue)}</b><div className="text-xs text-slate-500">laba {formatRupiah(product.estimatedProfit)}</div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Kasir</p>
                    <h3 className="mt-1 text-xl font-black">Performa Kasir</h3>
                    <div className="mt-5 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="pb-3">Kasir</th><th className="pb-3 text-right">Trx</th><th className="pb-3 text-right">Omzet</th></tr></thead>
                        <tbody className="divide-y divide-slate-800">
                          {cashiers.length === 0 ? <tr><td colSpan="3" className="py-8 text-center text-slate-500">Belum ada data.</td></tr> : cashiers.map((cashier, index) => (
                            <tr key={cashier.cashierId || index}>
                              <td className="py-3 font-bold">{cashier.name}</td>
                              <td className="py-3 text-right font-black">{cashier.transactionCount}</td>
                              <td className="py-3 text-right font-black">{formatRupiah(cashier.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Riwayat</p>
                    <h3 className="mt-1 text-xl font-black">Daftar Transaksi</h3>
                    <p className="mt-1 text-sm text-slate-500">Maksimal 200 transaksi per pencarian.</p>
                  </div>
                  <p className="text-sm font-bold text-slate-400">{transactions.length} transaksi ditemukan</p>
                </div>

                {transactions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-500">Belum ada transaksi pada periode/pencarian ini.</div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction) => {
                      const expanded = expandedId === transaction.id
                      return (
                        <div key={transaction.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
                          <button type="button" onClick={() => setExpandedId(expanded ? null : transaction.id)} className="grid w-full gap-3 p-4 text-left md:grid-cols-[1.2fr_1fr_120px_150px_auto] md:items-center">
                            <div><p className="font-mono font-black text-cyan-300">{transaction.invoiceNo}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(transaction.completedAt || transaction.createdAt)}</p></div>
                            <div><p className="font-bold">{transaction.cashierName}</p><p className="mt-1 text-xs text-slate-500">{transaction.units} unit</p></div>
                            <div><StatusBadge status={transaction.status} /></div>
                            <div className="font-black">{formatRupiah(transaction.totalAmount)}</div>
                            <div className="text-sm font-bold text-violet-300">{expanded ? 'Tutup' : 'Detail'}</div>
                          </button>

                          {expanded && (
                            <div className="border-t border-slate-800 p-4">
                              <div className="overflow-x-auto rounded-xl border border-slate-800">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-slate-900 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Produk</th><th className="px-3 py-2 text-right">Harga</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Subtotal</th></tr></thead>
                                  <tbody className="divide-y divide-slate-800">
                                    {(transaction.items || []).map((item) => (
                                      <tr key={item.id || `${transaction.id}-${item.sku}`}>
                                        <td className="px-3 py-3"><b>{item.name}</b><div className="font-mono text-xs text-cyan-300">{item.sku}</div></td>
                                        <td className="px-3 py-3 text-right">{formatRupiah(item.unitPrice)}</td>
                                        <td className="px-3 py-3 text-right font-black">{item.quantity}</td>
                                        <td className="px-3 py-3 text-right font-black">{formatRupiah(item.subtotal)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-4 ml-auto grid max-w-sm grid-cols-2 gap-2 text-sm">
                                <span className="text-slate-500">Total</span><b className="text-right">{formatRupiah(transaction.totalAmount)}</b>
                                <span className="text-slate-500">Bayar</span><b className="text-right">{formatRupiah(transaction.paidAmount)}</b>
                                <span className="text-slate-500">Kembali</span><b className="text-right text-emerald-300">{formatRupiah(transaction.changeAmount)}</b>
                                <span className="text-slate-500">Metode</span><b className="text-right uppercase">{transaction.paymentMethod}</b>
                              </div>
                              {transaction.notes && <div className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-sm text-slate-400">Catatan: {transaction.notes}</div>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      )}
    </>
  )
}
