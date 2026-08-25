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

function isEditableTarget(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable
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
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraMessage, setCameraMessage] = useState('')
  const [lastCameraCode, setLastCameraCode] = useState('')

  const scanRef = useRef(null)
  const searchRef = useRef(null)
  const paidRef = useRef(null)
  const videoRef = useRef(null)
  const productsRef = useRef([])
  const cameraStreamRef = useRef(null)
  const cameraDetectorRef = useRef(null)
  const cameraActiveRef = useRef(false)
  const cameraBusyRef = useRef(false)
  const cameraTimerRef = useRef(null)
  const lastCameraSeenRef = useRef({ code: '', at: 0 })
  const scannerBurstRef = useRef({ chars: '', startedAt: 0, lastAt: 0, target: null, originalValue: '' })

  useEffect(() => {
    productsRef.current = products
  }, [products])

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
      return false
    }

    let added = true
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= Number(product.stock)) {
          added = false
          setNotice({ tone: 'error', text: `Qty ${product.name} sudah mencapai stok tersedia.` })
          return current
        }
        return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...current, { ...product, quantity: 1 }]
    })
    if (added) setNotice(null)
    return added
  }

  function findProductByCode(rawCode) {
    const code = String(rawCode || '').trim().toLowerCase()
    if (!code) return null
    return productsRef.current.find((item) => (
      String(item.barcode || '').trim().toLowerCase() === code
      || String(item.sku || '').trim().toLowerCase() === code
    )) || null
  }

  function processScannedCode(rawCode, source = 'scanner') {
    const code = String(rawCode || '').trim()
    if (!code) return false

    const product = findProductByCode(code)
    if (!product) {
      setNotice({ tone: 'error', text: `Kode ${code} tidak ditemukan.` })
      return false
    }

    const added = addProduct(product)
    if (added) {
      const sourceLabel = source === 'camera' ? 'Kamera' : source === 'global' ? 'Scanner global' : 'Scanner'
      setNotice({ tone: 'success', text: `${sourceLabel}: ${product.name} (${product.sku}) ditambahkan.` })
    }
    return added
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
    processScannedCode(scanCode, 'scanner')
    setScanCode('')
    scanRef.current?.focus()
  }

  function restoreBurstTarget(burst) {
    if (!burst?.target) return
    if (burst.target === scanRef.current) setScanCode(burst.originalValue)
    else if (burst.target === searchRef.current) setSearch(burst.originalValue)
    else if (burst.target === paidRef.current) setPaidAmount(burst.originalValue)
  }

  useEffect(() => {
    if (!open) return undefined

    function resetBurst() {
      scannerBurstRef.current = { chars: '', startedAt: 0, lastAt: 0, target: null, originalValue: '' }
    }

    function handleGlobalKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return

      const now = performance.now()
      const burst = scannerBurstRef.current

      if (event.key === 'Enter') {
        if (!burst.chars) return

        const duration = Math.max(now - burst.startedAt, 1)
        const averageGap = duration / Math.max(burst.chars.length - 1, 1)
        const scannerLike = burst.chars.length >= 4 && averageGap <= 55 && now - burst.lastAt <= 120

        if (scannerLike) {
          event.preventDefault()
          event.stopPropagation()
          restoreBurstTarget(burst)
          processScannedCode(burst.chars, 'global')
          setScanCode('')
        }
        resetBurst()
        return
      }

      if (event.key.length !== 1) return

      if (!burst.chars || now - burst.lastAt > 120) {
        const target = event.target
        scannerBurstRef.current = {
          chars: event.key,
          startedAt: now,
          lastAt: now,
          target: isEditableTarget(target) ? target : null,
          originalValue: isEditableTarget(target) ? String(target.value || '') : '',
        }
        return
      }

      burst.chars += event.key
      burst.lastAt = now
    }

    window.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true)
  }, [open])

  function stopCamera() {
    cameraActiveRef.current = false
    cameraBusyRef.current = false
    if (cameraTimerRef.current) {
      clearTimeout(cameraTimerRef.current)
      cameraTimerRef.current = null
    }
    if (cameraStreamRef.current) {
      for (const track of cameraStreamRef.current.getTracks()) track.stop()
      cameraStreamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
    setCameraStarting(false)
  }

  async function scanCameraFrame() {
    if (!cameraActiveRef.current) return

    const video = videoRef.current
    const detector = cameraDetectorRef.current
    if (!video || !detector || video.readyState < 2 || cameraBusyRef.current) {
      cameraTimerRef.current = setTimeout(scanCameraFrame, 180)
      return
    }

    cameraBusyRef.current = true
    try {
      const codes = await detector.detect(video)
      const rawValue = String(codes?.[0]?.rawValue || '').trim()
      if (rawValue) {
        const now = Date.now()
        const lastSeen = lastCameraSeenRef.current
        const repeatedTooSoon = lastSeen.code === rawValue && now - lastSeen.at < 1600

        if (!repeatedTooSoon) {
          lastCameraSeenRef.current = { code: rawValue, at: now }
          setLastCameraCode(rawValue)
          processScannedCode(rawValue, 'camera')
        }
      }
    } catch (error) {
      console.error('Camera barcode detect failed', error)
    } finally {
      cameraBusyRef.current = false
      if (cameraActiveRef.current) cameraTimerRef.current = setTimeout(scanCameraFrame, 180)
    }
  }

  async function startCamera() {
    setCameraStarting(true)
    setCameraMessage('')
    setLastCameraCode('')

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser ini tidak menyediakan akses kamera.')
      }
      if (!('BarcodeDetector' in window)) {
        throw new Error('Browser ini belum mendukung BarcodeDetector. Gunakan Chrome/Edge Android terbaru atau scanner USB/BT.')
      }

      const supported = typeof window.BarcodeDetector.getSupportedFormats === 'function'
        ? await window.BarcodeDetector.getSupportedFormats()
        : []
      const preferred = ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code']
      const formats = preferred.filter((format) => supported.length === 0 || supported.includes(format))

      cameraDetectorRef.current = formats.length > 0
        ? new window.BarcodeDetector({ formats })
        : new window.BarcodeDetector()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      cameraStreamRef.current = stream
      cameraActiveRef.current = true
      setCameraOpen(true)
      setCameraStarting(false)

      requestAnimationFrame(async () => {
        if (!videoRef.current || !cameraActiveRef.current) return
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
          setCameraMessage('Arahkan kamera ke barcode. Deteksi berjalan otomatis.')
          scanCameraFrame()
        } catch {
          setCameraMessage('Kamera aktif, tetapi preview belum dapat diputar. Coba tutup lalu buka lagi.')
        }
      })
    } catch (error) {
      stopCamera()
      setCameraMessage(error.message || 'Kamera tidak dapat dibuka.')
      setNotice({ tone: 'error', text: error.message || 'Kamera tidak dapat dibuka.' })
    }
  }

  useEffect(() => {
    if (open) return undefined
    stopCamera()
    return undefined
  }, [open])

  useEffect(() => () => stopCamera(), [])

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
                <h2 className="text-xl font-black">POS Kasir v0.5</h2>
                <p className="mt-1 text-xs text-slate-500">Global scanner listener aktif selama halaman POS terbuka.</p>
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

              <div className="mb-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <form className="flex-1" onSubmit={submitScan}>
                    <label className="mb-2 block text-sm font-bold text-slate-300">Scan / Ketik Barcode atau SKU</label>
                    <div className="flex gap-2">
                      <input ref={scanRef} className="input font-mono" value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder="Scan LP000001 lalu Enter" autoComplete="off" />
                      <button type="submit" className="primary-button shrink-0">Tambah</button>
                    </div>
                  </form>
                  <button type="button" className="secondary-button md:mb-0" onClick={cameraOpen ? stopCamera : startCamera} disabled={cameraStarting}>
                    {cameraStarting ? 'Membuka Kamera...' : cameraOpen ? 'Tutup Kamera' : 'Scan Kamera'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Scanner USB/BT tidak perlu fokus ke kolom scan. Tembak barcode dari area mana pun di POS lalu scanner mengirim Enter.</p>
              </div>

              {(cameraOpen || cameraMessage) && (
                <div className="mb-5 rounded-3xl border border-cyan-900/70 bg-cyan-950/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Camera Scanner</p>
                      <p className="mt-1 text-xs text-slate-400">{cameraMessage || 'Menyiapkan kamera...'}</p>
                    </div>
                    {lastCameraCode && <span className="rounded-xl bg-slate-950 px-3 py-2 font-mono text-xs text-cyan-200">{lastCameraCode}</span>}
                  </div>
                  {cameraOpen && (
                    <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-black">
                      <video ref={videoRef} playsInline muted className="aspect-video w-full object-cover" />
                      <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-cyan-400/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
                    </div>
                  )}
                </div>
              )}

              <div className="mb-5">
                <input ref={searchRef} className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk berdasarkan nama, SKU, barcode..." />
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
                  <input ref={paidRef} className="input text-xl font-black" type="number" min="0" step="1" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} placeholder="0" />
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
