import { useEffect, useMemo, useState } from 'react'

const emptyProduct = {
  name: '',
  categoryId: '',
  purchasePrice: '0',
  sellingPrice: '0',
  stock: '0',
  minimumStock: '0',
  barcode: '',
  barcodeType: 'CODE128',
  imageUrl: '',
  description: '',
  isActive: true,
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
  if (!response.ok) {
    throw new Error(data?.error || 'Permintaan gagal diproses.')
  }

  return data
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default function App() {
  const [auth, setAuth] = useState({ loading: true, error: '', setupRequired: false, user: null })

  async function refreshAuth() {
    setAuth((current) => ({ ...current, loading: true, error: '' }))

    try {
      const data = await apiFetch('/api/auth/status')
      setAuth({
        loading: false,
        error: '',
        setupRequired: data.setupRequired,
        user: data.authenticated ? data.user : null,
      })
    } catch (error) {
      setAuth({ loading: false, error: error.message, setupRequired: false, user: null })
    }
  }

  useEffect(() => {
    refreshAuth()
  }, [])

  if (auth.loading) {
    return <CenteredMessage title="LENTERA POS" message="Memuat sistem admin..." />
  }

  if (auth.error) {
    return <CenteredMessage title="Koneksi admin gagal" message={auth.error} action="Coba Lagi" onAction={refreshAuth} />
  }

  if (auth.setupRequired) {
    return <SetupAdmin onSuccess={refreshAuth} />
  }

  if (!auth.user) {
    return <Login onSuccess={refreshAuth} />
  }

  return <AdminApp user={auth.user} onLogout={refreshAuth} />
}

function Brand() {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.28em] text-cyan-400">HOMESCHOOLING LENTERA</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-white">LENTERA POS</h1>
      <p className="mt-1 text-sm text-slate-400">Sistem Kasir & Laboratorium Praktik TKJ</p>
    </div>
  )
}

function SetupAdmin({ onSuccess }) {
  const [form, setForm] = useState({ fullName: '', username: 'admin', password: '', confirmPassword: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak sama.')
      return
    }

    setBusy(true)
    try {
      await apiFetch('/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName,
          username: form.username,
          password: form.password,
        }),
      })
      await onSuccess()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl shadow-black/30">
        <div className="mb-6">
          <span className="rounded-full border border-cyan-900 bg-cyan-950/40 px-3 py-1 text-xs font-bold text-cyan-300">SETUP PERTAMA</span>
          <h2 className="mt-4 text-2xl font-black">Buat Admin Pertama</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Akun ini akan mengelola produk, stok, transaksi, laporan, dan akun kasir. Setup hanya dapat dilakukan satu kali.</p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <Field label="Nama Admin">
            <input className="input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Contoh: Admin Lentera" required />
          </Field>
          <Field label="Username">
            <input className="input" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoComplete="username" required />
          </Field>
          <Field label="Password">
            <input className="input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" minLength={10} required />
          </Field>
          <Field label="Ulangi Password">
            <input className="input" type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} autoComplete="new-password" minLength={10} required />
          </Field>

          {error && <Alert tone="error">{error}</Alert>}

          <button className="primary-button w-full" type="submit" disabled={busy}>
            {busy ? 'Membuat admin...' : 'Buat Admin & Masuk'}
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}

function Login({ onSuccess }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      await onSuccess()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl shadow-black/30">
        <h2 className="text-2xl font-black">Login Admin</h2>
        <p className="mt-2 text-sm text-slate-400">Masuk untuk mengelola LENTERA POS.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Field label="Username">
            <input className="input" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoComplete="username" required autoFocus />
          </Field>
          <Field label="Password">
            <input className="input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="current-password" required />
          </Field>

          {error && <Alert tone="error">{error}</Alert>}

          <button className="primary-button w-full" type="submit" disabled={busy}>
            {busy ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}

function AuthLayout({ children }) {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100">
      <div className="mx-auto grid min-h-[80vh] max-w-5xl items-center gap-10 lg:grid-cols-[1fr_440px]">
        <div className="hidden lg:block">
          <Brand />
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            <Feature text="Neon PostgreSQL" />
            <Feature text="Cloudflare Pages" />
            <Feature text="Kode LP000001" />
            <Feature text="Stok & laporan otomatis" />
          </div>
        </div>
        <div>
          <div className="mb-6 lg:hidden"><Brand /></div>
          {children}
        </div>
      </div>
    </main>
  )
}

function Feature({ text }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">✓ {text}</div>
}

function AdminApp({ user, onLogout }) {
  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    setLoggingOut(true)
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', body: '{}' })
    } finally {
      setLoggingOut(false)
      await onLogout()
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-right">
              <p className="text-sm font-bold text-white">{user.fullName}</p>
              <p className="text-xs text-slate-500">@{user.username} · Admin</p>
            </div>
            <button type="button" className="secondary-button" onClick={logout} disabled={loggingOut}>
              {loggingOut ? 'Keluar...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-7">
        <ProductManager />
      </div>
    </main>
  )
}

function ProductManager() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [categoryBusy, setCategoryBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  async function loadData() {
    setLoading(true)
    try {
      const [productData, categoryData] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/categories'),
      ])
      setProducts(productData.products)
      setCategories(categoryData.categories)
    } catch (error) {
      setNotice({ tone: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return products

    return products.filter((product) => {
      return [product.name, product.sku, product.barcode, product.category_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    })
  }, [products, search])

  const activeProducts = products.filter((product) => product.is_active)
  const lowStock = activeProducts.filter((product) => Number(product.stock) <= Number(product.minimum_stock))
  const totalStock = activeProducts.reduce((total, product) => total + Number(product.stock || 0), 0)

  function resetForm() {
    setEditingId(null)
    setForm(emptyProduct)
  }

  function editProduct(product) {
    setEditingId(product.id)
    setForm({
      name: product.name || '',
      categoryId: product.category_id || '',
      purchasePrice: String(product.purchase_price ?? 0),
      sellingPrice: String(product.selling_price ?? 0),
      stock: String(product.stock ?? 0),
      minimumStock: String(product.minimum_stock ?? 0),
      barcode: product.barcode_generated ? '' : (product.barcode || ''),
      barcodeType: product.barcode_type || 'CODE128',
      imageUrl: product.image_url || '',
      description: product.description || '',
      isActive: Boolean(product.is_active),
    })
    setNotice(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveProduct(event) {
    event.preventDefault()
    setBusy(true)
    setNotice(null)

    const payload = {
      ...form,
      purchasePrice: Number(form.purchasePrice || 0),
      sellingPrice: Number(form.sellingPrice || 0),
      stock: Number(form.stock || 0),
      minimumStock: Number(form.minimumStock || 0),
    }

    try {
      if (editingId) {
        await apiFetch(`/api/products/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        setNotice({ tone: 'success', text: 'Produk berhasil diperbarui.' })
      } else {
        const data = await apiFetch('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setNotice({ tone: 'success', text: `Produk berhasil dibuat dengan kode ${data.product.sku}.` })
      }

      resetForm()
      await loadData()
    } catch (error) {
      setNotice({ tone: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  async function archiveProduct(product) {
    const confirmed = window.confirm(`Arsipkan produk ${product.name} (${product.sku})? Riwayat transaksi tetap aman.`)
    if (!confirmed) return

    setNotice(null)
    try {
      await apiFetch(`/api/products/${product.id}`, { method: 'DELETE' })
      setNotice({ tone: 'success', text: `${product.name} berhasil diarsipkan.` })
      if (editingId === product.id) resetForm()
      await loadData()
    } catch (error) {
      setNotice({ tone: 'error', text: error.message })
    }
  }

  async function addCategory(event) {
    event.preventDefault()
    const name = categoryName.trim()
    if (!name) return

    setCategoryBusy(true)
    setNotice(null)
    try {
      const data = await apiFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      setCategories((current) => [...current, data.category].sort((a, b) => a.name.localeCompare(b.name)))
      setForm((current) => ({ ...current, categoryId: data.category.id }))
      setCategoryName('')
      setNotice({ tone: 'success', text: `Kategori ${data.category.name} ditambahkan.` })
    } catch (error) {
      setNotice({ tone: 'error', text: error.message })
    } finally {
      setCategoryBusy(false)
    }
  }

  return (
    <>
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Produk Aktif" value={activeProducts.length} note={`${products.length - activeProducts.length} diarsipkan`} />
        <Stat label="Total Stok" value={totalStock} note="unit tersimpan" />
        <Stat label="Stok Menipis" value={lowStock.length} note="perlu diperiksa" alert={lowStock.length > 0} />
        <Stat label="Kode Berikutnya" value="LPxxxxxx" note="otomatis saat produk dibuat" />
      </section>

      {notice && <div className="mb-6"><Alert tone={notice.tone}>{notice.text}</Alert></div>}

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 xl:sticky xl:top-6 xl:self-start">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Produk</p>
              <h2 className="mt-2 text-xl font-black">{editingId ? 'Edit Produk' : 'Tambah Produk'}</h2>
            </div>
            {editingId && <button type="button" className="text-sm font-semibold text-slate-400 hover:text-white" onClick={resetForm}>Batal</button>}
          </div>

          <form className="space-y-4" onSubmit={saveProduct}>
            <Field label="Nama Produk">
              <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contoh: Air Mineral 600ml" required />
            </Field>

            <Field label="Kategori">
              <select className="input" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                <option value="">Tanpa kategori</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Harga Beli">
                <input className="input" type="number" min="0" step="1" value={form.purchasePrice} onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })} />
              </Field>
              <Field label="Harga Jual">
                <input className="input" type="number" min="0" step="1" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} required />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Stok">
                <input className="input" type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} required />
              </Field>
              <Field label="Stok Minimum">
                <input className="input" type="number" min="0" step="1" value={form.minimumStock} onChange={(event) => setForm({ ...form, minimumStock: event.target.value })} />
              </Field>
            </div>

            <Field label="Barcode / Kode Eksternal" hint="Kosongkan agar otomatis memakai LP000001, LP000002, dst.">
              <input className="input font-mono" value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} placeholder="Kosong = otomatis" />
            </Field>

            {form.barcode && (
              <Field label="Tipe Barcode">
                <select className="input" value={form.barcodeType} onChange={(event) => setForm({ ...form, barcodeType: event.target.value })}>
                  <option value="CODE128">Code 128</option>
                  <option value="EAN13">EAN-13</option>
                  <option value="UPC">UPC</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </Field>
            )}

            <Field label="URL Gambar" hint="Opsional untuk versi awal.">
              <input className="input" type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://..." />
            </Field>

            <Field label="Keterangan">
              <textarea className="input min-h-20 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </Field>

            {editingId && (
              <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                Produk aktif dan tampil di kasir
              </label>
            )}

            <button className="primary-button w-full" type="submit" disabled={busy}>
              {busy ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
          </form>

          <div className="my-6 border-t border-slate-800" />

          <form onSubmit={addCategory}>
            <Field label="Tambah Kategori Cepat">
              <div className="flex gap-2">
                <input className="input" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Contoh: Minuman" />
                <button type="submit" className="secondary-button shrink-0" disabled={categoryBusy}>{categoryBusy ? '...' : '+ Kategori'}</button>
              </div>
            </Field>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Inventory</p>
              <h2 className="mt-2 text-xl font-black">Daftar Produk</h2>
              <p className="mt-1 text-sm text-slate-400">SKU internal dibuat otomatis dan tidak dipakai ulang.</p>
            </div>
            <div className="w-full md:w-72">
              <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, SKU, barcode..." />
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center text-slate-400">Memuat produk...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-10 text-center">
              <p className="font-bold text-slate-200">Belum ada produk</p>
              <p className="mt-2 text-sm text-slate-500">Tambahkan produk pertama. Sistem akan memberikan kode LP000001 secara otomatis.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-950/80 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Produk</th>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3 text-right">Stok</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                  {filteredProducts.map((product) => {
                    const isLow = product.is_active && Number(product.stock) <= Number(product.minimum_stock)
                    return (
                      <tr key={product.id} className={!product.is_active ? 'opacity-55' : ''}>
                        <td className="px-4 py-4">
                          <p className="font-bold text-white">{product.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{product.category_name || 'Tanpa kategori'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-mono font-bold text-cyan-300">{product.sku}</p>
                          <p className="mt-1 max-w-44 truncate font-mono text-xs text-slate-500" title={product.barcode}>{product.barcode}</p>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold">{formatRupiah(product.selling_price)}</td>
                        <td className="px-4 py-4 text-right">
                          <span className={isLow ? 'font-black text-amber-300' : 'font-bold text-slate-200'}>{product.stock}</span>
                          <p className="mt-1 text-xs text-slate-600">min. {product.minimum_stock}</p>
                        </td>
                        <td className="px-4 py-4">
                          {!product.is_active ? <Badge tone="muted">Arsip</Badge> : isLow ? <Badge tone="warning">Stok Menipis</Badge> : <Badge tone="success">Aktif</Badge>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" className="table-button" onClick={() => editProduct(product)}>Edit</button>
                            {product.is_active && <button type="button" className="table-button text-rose-300" onClick={() => archiveProduct(product)}>Arsipkan</button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-5 text-slate-500">{hint}</span>}
    </label>
  )
}

function Alert({ tone = 'success', children }) {
  const classes = tone === 'error'
    ? 'border-rose-900/70 bg-rose-950/40 text-rose-200'
    : 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200'

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${classes}`}>{children}</div>
}

function Stat({ label, value, note, alert }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${alert ? 'text-amber-300' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  )
}

function Badge({ tone, children }) {
  const classes = tone === 'success'
    ? 'border-emerald-900 bg-emerald-950/50 text-emerald-300'
    : tone === 'warning'
      ? 'border-amber-900 bg-amber-950/50 text-amber-300'
      : 'border-slate-700 bg-slate-800 text-slate-400'

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classes}`}>{children}</span>
}

function CenteredMessage({ title, message, action, onAction }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-7 text-center">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
        {action && <button type="button" className="primary-button mt-6" onClick={onAction}>{action}</button>}
      </div>
    </main>
  )
}
