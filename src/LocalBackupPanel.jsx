import { useRef, useState } from 'react'
import { exportBackup, getLocalStats, restoreBackup } from './localPos.js'

export default function LocalBackupPanel() {
  const pickerRef = useRef(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(false)
  const [stats, setStats] = useState(() => {
    try { return getLocalStats() } catch { return null }
  })

  function downloadBackup() {
    try {
      const json = exportBackup()
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'lentera-pos-backup-' + new Date().toISOString().slice(0, 10) + '.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 3000)
      setError(false)
      setNotice('File cadangan JSON berhasil disiapkan. Simpan di folder yang aman.')
    } catch (problem) {
      setError(true)
      setNotice(problem.message)
    }
  }

  async function uploadBackup(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      setError(true)
      setNotice('File terlalu besar (maksimal 8 MB).')
      return
    }
    if (!window.confirm('Impor cadangan akan MENGGANTI seluruh produk, stok, dan riwayat transaksi yang ada di browser ini. Lanjutkan?')) return
    try {
      const result = restoreBackup(await file.text())
      setError(false)
      setStats(getLocalStats())
      setNotice('Cadangan dipulihkan: ' + result.products + ' produk dan ' + result.transactions + ' transaksi. Memuat ulang halaman...')
      window.location.reload()
    } catch (problem) {
      setError(true)
      setNotice(problem.message)
    }
  }

  return (
    <section className="mb-6 rounded-3xl border border-cyan-900/60 bg-slate-900/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Mode Lokal · Tanpa Login</p>
          <h2 className="mt-1 text-lg font-black">Data tersimpan di browser perangkat ini</h2>
          <p className="mt-1 text-sm text-slate-400">
            Tidak terhubung ke database atau server API. Perangkat/browser lain memiliki data terpisah.
            Jangan hapus data situs sebelum membuat cadangan.
          </p>
          {stats && <p className="mt-2 text-xs text-slate-500">Saat dibuka: {stats.products} produk · {stats.categories} kategori · {stats.transactions} transaksi</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="primary-button" type="button" onClick={downloadBackup}>Ekspor Cadangan JSON</button>
          <button className="secondary-button" type="button" onClick={() => pickerRef.current?.click()}>Impor Cadangan</button>
          <input ref={pickerRef} type="file" accept=".json,application/json" className="hidden" onChange={uploadBackup} />
        </div>
      </div>
      {notice && <p role="status" className={'mt-3 text-sm font-semibold ' + (error ? 'text-rose-300' : 'text-emerald-300')}>{notice}</p>}
    </section>
  )
}
