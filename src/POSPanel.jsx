import { useEffect, useMemo, useRef, useState } from 'react'

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || 'Permintaan gagal diproses.')
  return data
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export default function POSPanel() {
  const [authenticated, setAuthenticated] = useState(false)
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [scanCode, setScanCode] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const scanRef = useRef(null)

  useEffect(() => {
    apiFetch('/api/auth/status')
      .then((data) => setAuthenticated(Boolean(data.authenticated)))
      .catch(() => setAuthenticated(false))
  }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const data = await apiFetch('/api/products')
      setProducts((data.products || []).filter((product) => product.is_active))
    } catch (error) {
      setNotice({ tone: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    loadProducts()
    setTimeout(() => scanRef.current?.focus(), 50)
  }, [open])

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return products
    return products.filter((product) => [product.name, product.sku, product.barcode, product.category_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword)))
  }, [products, search])

  const total = cart.reduce((sum, item) => sum + Number(item.selling_price) * item.quantity, 0)
  const paid = Number(paidAmount || 0)
  const change = Math.max(paid - total, 0)

  function addProduct(product) {
    if (Number(product.stock) <= 0) {
      setNotice({ tone: 'error', text: `${product.name} sedang habis.` })
      return
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= Number(product.stock)) {
          setNotice({ tone: 'error', text: `Qty ${product.name} sudah mencapai stok tersedia.` })
          return current
        }
        return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...current, { ...product, quantity: 1 }]
    })
    setNotice(null)
  }

  function changeQuantity(productId, nextQuantity) {
    const product = products.find((item) => item.id === productId)
    const maxStock = Number(product?.stock || 0)
    if (nextQuantity <= 0) {
      setCart((current) => current.filter((item) => item.id !== productId))
      return
    }
    if (nextQuantity > maxStock) {
      setNotice({ tone: 'error', text: 'Qty melebihi stok tersedia.' })
      return
    }
    setCart((current) => current.map((item) => item.id === productId ? { ...item, quantity: nextQuantity } : item))
  }

  function submitScan(event) {
    event.preventDefault()
    const code = scanCode.trim().toLowerCase()
    if (!code) return

    const product = products.find((item) => String(item.barcode || '').toLowerCase() === code || String(item.sku || '').toLowerCase() === code)
    if (!product) {
      setNotice({ tone: 'error', text: `Kode ${scanCode.trim()} tidak ditemukan.` })
    } else {
      addProduct(product)
    }
    setScanCode('')
    scanRef.current?.focus()
  }

  async function checkout() {
    if (cart.length === 0) {
      setNotice({ tone: 'error', text: 'Keranjang masih kosong.' })
      return
    }
    if (!Number.isFinite(paid) || paid < total) {
      setNotice({ tone: 'error', text: 'Nominal pembayaran masih kurang.' })
      return
    }

    setCheckoutBusy(true)
    setNotice(null)
    try {
      const data = await apiFetch('/api/pos/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
          paidAmount: paid,
        }),
      })
      setReceipt(data.transaction)
      setCart([])
      setPaidAmount('')
      await loadProducts()
      setNotice({ tone: 'success', text: `Transaksi ${data.transaction.invoiceNo} berhasil.` })
    } catch (error) {
      setNotice({ tone: 'error', text: error.message })
      await loadProducts()
    } finally {
      setCheckoutBusy(false)
    }
  }

  function printReceipt() {
    if (!receipt) return
    const popup = window.open('', '_blank', 'width=420,height=720')
    if (!popup) {
      setNotice({ tone: 'error', text: 'Popup diblokir browser. Izinkan popup untuk mencetak struk.' })
      return
    }

    const rows = (receipt.items || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.name)} × ${item.quantity}</td>
        <td style="text-align:right">${escapeHtml(formatRupiah(item.subtotal))}</td>
      </tr>
      <tr><td colspan="2" style="font-size:11px;color:#555">${escapeHtml(item.sku)} @ ${escapeHtml(formatRupiah(item.unitPrice))}</td></tr>
    `).join('')

    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(receipt.invoiceNo)}</title><style>
      body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;width:72mm;margin:0 auto;padding:12px;color:#000}
      h1,p{margin:0;text-align:center} table{width:100%;border-collapse:collapse;margin-top:14px} td{padding:3px 0;vertical-align:top}
      .line{border-top:1px dashed #000;margin:10px 0}.total{font-size:18px;font-weight:700}.right{text-align:right}
      @media print{body{width:auto;padding:0}}
    </style></head><body>
      <h1 style="font-size:18px">LENTERA POS</h1>
      <p style="font-size:12px">Homeschooling Lentera</p>
      <div class="line"></div>
      <div>${escapeHtml(receipt.invoiceNo)}</div>
      <div style="font-size:11px">${escapeHtml(new Date(receipt.completedAt).toLocaleString('id-ID'))}</div>
      <table>${rows}</table>
      <div class="line"></div>
      <table>
        <tr class="total"><td>TOTAL</td><td class="right">${escapeHtml(formatRupiah(receipt.totalAmount))}</td></tr>
        <tr><td>BAYAR</td><td class="right">${escapeHtml(formatRupiah(receipt.paidAmount))}</td></tr>
        <tr><td>KEMBALI</td><td class="right">${escapeHtml(formatRupiah(receipt.changeAmount))}</td></tr>
      </table>
      <div class="line"></div><p style="font-size:11px">Terima kasih</p>
      <script>window.onload=()=>window.print()<\/script>
    </body></html>`)
    popup.document.close()
  }

  if (!authenticated) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-40 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-cyan-950/40 hover:bg-cyan-400"
      >
        Buka POS Kasir
      </button>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-slate-100">
          <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-xs font-bold tracking-[0.22em] text-cyan-400">LENTERA POS</p>
                <h2 className="text-xl font-black">POS Kasir v0.2</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Kembali ke Admin</button>
            </div>
          </header>

          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 xl:grid-cols-[1fr_430px]">
            <section>
              {notice && (
                <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.tone === 'error' ? 'border-rose-900 bg-rose-950/40 text-rose-200' : 'border-emerald-900 bg-emerald-950/40 text-emerald-200'}`}>
                  {notice.text}
                </div>
              )}

              <form className="mb-4" onSubmit={submitScan}>
                <label className="mb-2 block text-sm font-bold text-slate-300">Scan / Ketik Barcode atau SKU</label>
                <div className="flex gap-2">
                  <input ref={scanRef} className="input font-mono" value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder="Scan LP000001 lalu Enter" autoComplete="off" />
                  <button type="submit" className="primary-button shrink-0">Tambah</button>
                </div>
                <p className="mt-2 text-xs text-slate-500">USB barcode scanner yang bertindak sebagai keyboard bisa langsung dipakai di kolom ini.</p>
              </form>

              <div className="mb-5">
                <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk berdasarkan nama, SKU, barcode..." />
              </div>

              {loading ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-10 text-center text-slate-400">Memuat produk...</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts.map((product) => {
                    const stock = Number(product.stock || 0)
                    return (
                      <button
                        key={product.id}
                        type="button"
                        disabled={stock <= 0}
                        onClick={() => addProduct(product)}
                        className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 text-left transition hover:border-cyan-800 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <p className="font-black text-white">{product.name}</p>
                        <p className="mt-1 font-mono text-xs text-cyan-300">{product.sku}</p>
                        <p className="mt-3 text-lg font-black">{formatRupiah(product.selling_price)}</p>
                        <p className="mt-1 text-xs text-slate-500">Stok: {stock}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            <aside className="xl:sticky xl:top-24 xl:self-start">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Keranjang</p>
                    <h3 className="mt-1 text-xl font-black">{cart.reduce((sum, item) => sum + item.quantity, 0)} item</h3>
                  </div>
                  {cart.length > 0 && <button type="button" className="text-xs font-bold text-rose-300" onClick={() => setCart([])}>Kosongkan</button>}
                </div>

                <div className="max-h-[38vh] space-y-3 overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Belum ada produk.</div>
                  ) : cart.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-bold">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.sku} · {formatRupiah(item.selling_price)}</p>
                        </div>
                        <p className="font-black">{formatRupiah(Number(item.selling_price) * item.quantity)}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button type="button" className="table-button" onClick={() => changeQuantity(item.id, item.quantity - 1)}>−</button>
                        <span className="min-w-10 text-center font-black">{item.quantity}</span>
                        <button type="button" className="table-button" onClick={() => changeQuantity(item.id, item.quantity + 1)}>+</button>
                        <button type="button" className="ml-auto text-xs font-bold text-rose-300" onClick={() => changeQuantity(item.id, 0)}>Hapus</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="my-5 border-t border-slate-800" />
                <div className="flex items-end justify-between gap-4">
                  <span className="text-sm font-bold text-slate-400">TOTAL</span>
                  <span className="text-3xl font-black text-white">{formatRupiah(total)}</span>
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">Uang Dibayar</span>
                  <input className="input text-xl font-black" type="number" min="0" step="1" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} placeholder="0" />
                </label>

                <div className="mt-4 flex justify-between rounded-2xl bg-slate-950 px-4 py-3">
                  <span className="text-sm font-bold text-slate-400">Kembalian</span>
                  <span className="font-black text-emerald-300">{formatRupiah(change)}</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[10000, 20000, 50000].map((amount) => (
                    <button key={amount} type="button" className="table-button" onClick={() => setPaidAmount(String(amount))}>{amount / 1000}K</button>
                  ))}
                </div>

                <button type="button" className="primary-button mt-5 w-full py-4 text-base" disabled={checkoutBusy || cart.length === 0 || paid < total} onClick={checkout}>
                  {checkoutBusy ? 'Memproses...' : 'Selesaikan Transaksi'}
                </button>
              </div>

              {receipt && (
                <div className="mt-4 rounded-3xl border border-emerald-900 bg-emerald-950/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Transaksi Terakhir</p>
                  <p className="mt-2 font-mono text-lg font-black">{receipt.invoiceNo}</p>
                  <div className="mt-3 flex justify-between text-sm"><span>Total</span><b>{formatRupiah(receipt.totalAmount)}</b></div>
                  <div className="mt-1 flex justify-between text-sm"><span>Kembali</span><b>{formatRupiah(receipt.changeAmount)}</b></div>
                  <button type="button" className="secondary-button mt-4 w-full" onClick={printReceipt}>Cetak Struk</button>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </>
  )
}
