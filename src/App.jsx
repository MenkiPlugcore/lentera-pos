import { useEffect, useMemo, useState } from 'react'
import ProductBarcodeActions from './ProductBarcodeActions.jsx'
import LocalBackupPanel from './LocalBackupPanel.jsx'
import CloudAdminPanel from './CloudAdminPanel.jsx'
import { IS_CLOUD } from './cloudApi.js'
import { apiFetch, imageFileToDataUrl } from './localPos.js'

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

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default function App() {
  return <AdminApp />
}

function Brand() {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.28em] text-cyan-400">HOMESCHOOLING LENTERA</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-white">LENTERA POS</h1>
      <p className="mt-1 text-sm text-slate-400">Sistem Kasir, Smart Cafe & Learning Game</p>
    </div>
  )
}

function AdminApp() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-900 bg-slate-900 px-4 py-2 text-right">
              <p className="text-sm font-bold text-cyan-300">{IS_CLOUD ? 'NEON CLOUD' : 'MODE LOKAL'}</p>
              <p className="text-xs text-slate-500">{IS_CLOUD ? 'Database & login aktif' : 'Tanpa akun & server'}</p>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-7">{IS_CLOUD ? <CloudAdminPanel /> : <LocalBackupPanel />}<ProductManager /></div>
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
      const [productData, categoryData] = await Promise.all([apiFetch('/api/products'), apiFetch('/api/categories')])
      setProducts(productData.products || [])
      setCategories(categoryData.categories || [])
    } catch (error) {
      setNotice({ tone: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return products
    return products.filter((product) => [product.name, product.sku, product.barcode, product.category_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword)))
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
        await apiFetch(`/api/products/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) })
        setNotice({ tone: 'success', text: 'Produk berhasil diperbarui.' })
      } else {
        const data = await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) })
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
    if (!window.confirm(`Arsipkan produk ${product.name} (${product.sku})? Riwayat transaksi tetap aman.`)) return
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
      const data = await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name }) })
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

  async function uploadImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const data = await imageFileToDataUrl(file)
      setForm((current) => ({ ...current, imageUrl: data }))
      setNotice({ tone: 'success', text: 'Gambar lokal siap disimpan bersama produk.' })
    } catch (error) {
      setNotice({ tone: 'error', text: error.message })
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
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Produk</p><h2 className="mt-2 text-xl font-black">{editingId ? 'Edit Produk' : 'Tambah Produk'}</h2></div>
            {editingId && <button type="button" className="text-sm font-semibold text-slate-400 hover:text-white" onClick={resetForm}>Batal</button>}
          </div>

          <form className="space-y-4" onSubmit={saveProduct}>
            <Field label="Nama Produk"><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contoh: Air Mineral 600ml" required /></Field>
            <Field label="Kategori"><select className="input" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Tanpa kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Harga Beli"><input className="input" type="number" min="0" step="1" value={form.purchasePrice} onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })} /></Field>
              <Field label="Harga Jual"><input className="input" type="number" min="0" step="1" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} required /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stok"><input className="input" type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} required /></Field>
              <Field label="Stok Minimum"><input className="input" type="number" min="0" step="1" value={form.minimumStock} onChange={(event) => setForm({ ...form, minimumStock: event.target.value })} /></Field>
            </div>
            <Field label="Barcode / Kode Eksternal" hint="Kosongkan agar otomatis memakai LP000001, LP000002, dst."><input className="input font-mono" value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} placeholder="Kosong = otomatis" /></Field>
            {form.barcode && <Field label="Tipe Barcode"><select className="input" value={form.barcodeType} onChange={(event) => setForm({ ...form, barcodeType: event.target.value })}><option value="CODE128">Code 128</option><option value="EAN13">EAN-13</option><option value="UPC">UPC</option><option value="OTHER">Lainnya</option></select></Field>}
            <Field label="Foto Produk Lokal" hint="Opsional. Gambar akan dikompresi dan disimpan di browser.">
              <input className="input" type="file" accept="image/*" onChange={uploadImage} />
              {form.imageUrl && <div className="mt-2 flex items-center gap-3">
                <img src={form.imageUrl} alt="Pratinjau produk" className="h-16 w-16 rounded-lg object-cover" />
                <button type="button" className="table-button" onClick={() => setForm((current) => ({ ...current, imageUrl: '' }))}>Hapus Gambar</button>
              </div>}
            </Field>
            <Field label="Keterangan"><textarea className="input min-h-20 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            {editingId && <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Produk aktif dan tampil di kasir</label>}
            <button className="primary-button w-full" type="submit" disabled={busy}>{busy ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Produk'}</button>
          </form>

          <div className="my-6 border-t border-slate-800" />
          <form onSubmit={addCategory}>
            <Field label="Tambah Kategori Cepat"><div className="flex gap-2"><input className="input" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Contoh: Minuman" /><button type="submit" className="secondary-button shrink-0" disabled={categoryBusy}>{categoryBusy ? '...' : '+ Kategori'}</button></div></Field>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Inventory</p>
              <h2 className="mt-2 text-xl font-black">Daftar Produk</h2>
              <p className="mt-1 text-sm text-slate-400">SKU internal otomatis menjadi Code 128 untuk scan POS dan label produk.</p>
            </div>
            <div className="w-full md:w-72"><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, SKU, barcode..." /></div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center text-slate-400">Memuat produk...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-10 text-center"><p className="font-bold text-slate-200">Belum ada produk</p><p className="mt-2 text-sm text-slate-500">Tambahkan produk pertama. Sistem akan memberikan kode LP000001 secara otomatis.</p></div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-950/80 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3">Produk</th><th className="px-4 py-3">Kode & Label</th><th className="px-4 py-3 text-right">Harga</th><th className="px-4 py-3 text-right">Stok</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                  {filteredProducts.map((product) => {
                    const isLow = product.is_active && Number(product.stock) <= Number(product.minimum_stock)
                    return (
                      <tr key={product.id} className={!product.is_active ? 'opacity-55' : ''}>
                        <td className="px-4 py-4"><p className="font-bold text-white">{product.name}</p><p className="mt-1 text-xs text-slate-500">{product.category_name || 'Tanpa kategori'}</p></td>
                        <td className="px-4 py-4 align-top">
                          <p className="font-mono font-bold text-cyan-300">{product.sku}</p>
                          <p className="mt-1 max-w-52 truncate font-mono text-xs text-slate-500" title={product.barcode}>Barcode: {product.barcode || '-'}</p>
                          <ProductBarcodeActions product={product} />
                        </td>
                        <td className="px-4 py-4 text-right font-semibold">{formatRupiah(product.selling_price)}</td>
                        <td className="px-4 py-4 text-right"><span className={isLow ? 'font-black text-amber-300' : 'font-bold text-slate-200'}>{product.stock}</span><p className="mt-1 text-xs text-slate-600">min. {product.minimum_stock}</p></td>
                        <td className="px-4 py-4">{!product.is_active ? <Badge tone="muted">Arsip</Badge> : isLow ? <Badge tone="warning">Stok Menipis</Badge> : <Badge tone="success">Aktif</Badge>}</td>
                        <td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" className="table-button" onClick={() => editProduct(product)}>Edit</button>{product.is_active && <button type="button" className="table-button text-rose-300" onClick={() => archiveProduct(product)}>Arsipkan</button>}</div></td>
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
  return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-300">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs leading-5 text-slate-500">{hint}</span>}</label>
}

function Alert({ tone = 'success', children }) {
  const classes = tone === 'error' ? 'border-rose-900/70 bg-rose-950/40 text-rose-200' : 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200'
  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${classes}`}>{children}</div>
}

function Stat({ label, value, note, alert }) {
  return <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${alert ? 'text-amber-300' : 'text-white'}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>
}

function Badge({ tone, children }) {
  const classes = tone === 'success' ? 'border-emerald-900 bg-emerald-950/50 text-emerald-300' : tone === 'warning' ? 'border-amber-900 bg-amber-950/50 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-400'
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
