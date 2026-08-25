import { useEffect, useState } from 'react'

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'Permintaan gagal diproses.')
  }

  return data
}

export default function HardDeletePanel() {
  const [authorized, setAuthorized] = useState(false)
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false

    requestJson('/api/auth/status')
      .then((data) => {
        if (!cancelled) setAuthorized(Boolean(data.authenticated))
      })
      .catch(() => {
        if (!cancelled) setAuthorized(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function loadProducts() {
    setLoading(true)
    setMessage(null)

    try {
      const data = await requestJson('/api/products')
      setProducts(data.products || [])
    } catch (error) {
      setMessage({ tone: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function showPanel() {
    setOpen(true)
    await loadProducts()
  }

  async function hardDelete(product) {
    const typedSku = window.prompt(
      `HAPUS PERMANEN ${product.name}\n\nKetik kode ${product.sku} untuk melanjutkan.`,
    )

    if (typedSku === null) return
    if (typedSku.trim() !== product.sku) {
      setMessage({ tone: 'error', text: `Konfirmasi gagal. Ketik persis ${product.sku}.` })
      return
    }

    const confirmed = window.confirm(
      `Produk ${product.name} (${product.sku}) akan dihapus permanen dari database beserta riwayat stoknya. Tindakan ini tidak dapat dibatalkan. Lanjutkan?`,
    )
    if (!confirmed) return

    setDeletingId(product.id)
    setMessage(null)

    try {
      const data = await requestJson(`/api/products/${product.id}/hard-delete`, {
        method: 'DELETE',
      })

      setProducts((current) => current.filter((item) => item.id !== product.id))
      setMessage({ tone: 'success', text: `${data.deleted.name} (${data.deleted.sku}) sudah dihapus permanen.` })

      window.setTimeout(() => {
        window.location.reload()
      }, 900)
    } catch (error) {
      setMessage({ tone: 'error', text: error.message })
    } finally {
      setDeletingId(null)
    }
  }

  if (!authorized) return null

  return (
    <>
      <button
        type="button"
        onClick={showPanel}
        className="fixed bottom-5 right-5 z-40 rounded-2xl border border-rose-900/80 bg-rose-950/90 px-4 py-3 text-sm font-black text-rose-200 shadow-2xl shadow-black/40 hover:bg-rose-900"
      >
        Hapus Produk
      </button>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-8 w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-300">Danger Zone</p>
                <h2 className="mt-2 text-2xl font-black">Hapus Produk Permanen</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Produk yang belum pernah dipakai dalam transaksi dapat dihapus total dari database. Riwayat stok produk tersebut ikut terhapus. Produk yang sudah pernah masuk transaksi wajib diarsipkan agar laporan kasir tetap konsisten.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>

            {message && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${message.tone === 'error' ? 'border-rose-900 bg-rose-950/50 text-rose-200' : 'border-emerald-900 bg-emerald-950/50 text-emerald-200'}`}>
                {message.text}
              </div>
            )}

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-400">Memuat produk...</div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">Tidak ada produk untuk dihapus.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {products.map((product) => (
                    <div key={product.id} className="flex flex-col gap-3 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-black text-white">{product.name}</p>
                        <p className="mt-1 font-mono text-xs text-cyan-300">{product.sku} · {product.barcode || 'tanpa barcode'}</p>
                        <p className="mt-1 text-xs text-slate-500">Stok {product.stock} · {product.is_active ? 'Aktif' : 'Arsip'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => hardDelete(product)}
                        disabled={deletingId === product.id}
                        className="rounded-xl border border-rose-900 bg-rose-950/60 px-4 py-2 text-sm font-black text-rose-200 hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === product.id ? 'Menghapus...' : 'Hapus Permanen'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
