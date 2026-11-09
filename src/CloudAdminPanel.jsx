import { useEffect, useRef, useState } from 'react'
import { cloudApiFetch } from './cloudApi.js'
import { exportBackup, getLocalStats } from './localPos.js'

export default function CloudAdminPanel() {
  const [stats, setStats] = useState(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [localStats, setLocalStats] = useState(null)
  const picker = useRef(null)

  useEffect(() => {
    cloudApiFetch('/api/dashboard').then(result => setStats(result.stats)).catch(error => setNotice(error.message))
    try { setLocalStats(getLocalStats()) } catch { /* belum ada data lokal */ }
  }, [])

  function downloadLocalBackup() {
    const data = exportBackup()
    const blob = new Blob([data], { type: 'application/json' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'lentera-pos-local-backup-' + new Date().toISOString().slice(0,10) + '.json'
    a.click()
    URL.revokeObjectURL(href)
  }

  async function doImport(backup) {
    if (!window.confirm('Impor HANYA kategori dan produk dari cadangan lokal ke Neon. Data database yang ada tidak ditimpa; nama/SKU/barcode duplikat dilewati. Riwayat transaksi lokal TIDAK ikut diimpor. Lanjutkan?')) return
    setBusy(true)
    setNotice('')
    try {
      const result = await cloudApiFetch('/api/migration/catalog', {
        method: 'POST', body: JSON.stringify({ backup }),
      })
      setNotice('Impor berhasil: ' + result.categoriesAdded + ' kategori, ' + result.productsAdded + ' produk baru; ' + result.skipped + ' duplikat dilewati. Muat ulang untuk melihat menu.')
      const refreshed = await cloudApiFetch('/api/dashboard')
      setStats(refreshed.stats)
    } catch (error) {
      setNotice('Impor terhenti: ' + error.message + '. Periksa katalog sebelum mengulang; impor tidak menghapus data sebelumnya.')
    } finally {
      setBusy(false)
    }
  }

  async function selectFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 1000000) { setNotice('Cadangan maksimal 1 MB untuk import cloud.'); return }
    try { await doImport(JSON.parse(await file.text())) }
    catch { setNotice('File cadangan tidak valid.') }
  }

  return (
    <section className="mb-6 rounded-3xl border border-cyan-900/60 bg-slate-900/70 p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Cloud Dashboard · Administrator</p>
      <h2 className="mt-1 text-xl font-black">Database LENTERA POS</h2>
      <p className="mt-1 text-sm text-slate-400">Menu, stok, dan transaksi tersimpan di Neon, bukan terpisah antar-browser. Data lama tidak otomatis dipindahkan.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Produk',stats?.products],
          ['Kategori',stats?.categories],
          ['Transaksi',stats?.transactions],
          ['Stok menipis',stats?.low_stock],
          ['Sesi game',stats?.game_sessions],
        ].map(([name,value]) => (
          <div key={name} className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-4">
            <p className="text-xs text-slate-400">{name}</p>
            <p className="mt-1 text-2xl font-black">{value ?? '—'}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-slate-800 pt-4">
        <h3 className="font-black">Migrasi menu dari browser lama</h3>
        <p className="mt-1 text-sm text-slate-400">Ekspor cadangan JSON sebelum migrasi. Impor bersifat tambah saja, tanpa menghapus stok atau riwayat pada Neon.</p>
        {localStats && <p className="mt-2 text-xs text-slate-500">Browser ini: {localStats.products} produk · {localStats.categories} kategori · {localStats.transactions} transaksi lokal.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="secondary-button" type="button" onClick={downloadLocalBackup}>Unduh cadangan lokal</button>
          <button className="secondary-button" type="button" disabled={busy || !localStats?.products} onClick={()=>doImport(JSON.parse(exportBackup()))}>Impor menu dari browser ini</button>
          <button className="secondary-button" type="button" disabled={busy} onClick={()=>picker.current?.click()}>Impor dari file JSON</button>
          <input className="hidden" ref={picker} type="file" accept=".json,application/json" onChange={selectFile}/>
        </div>
        {notice && <p role="status" className="mt-3 text-sm text-cyan-300">{notice}</p>}
      </div>
    </section>
  )
}
