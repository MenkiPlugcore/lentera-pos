import { useState } from 'react'

const milestones = [
  ['Neon project', true],
  ['Database schema', true],
  ['Admin account', false],
  ['CRUD produk', false],
  ['Generate LP000001', true],
  ['POS kasir', false],
  ['Transaksi', true],
  ['Stok otomatis', true],
  ['Barcode', true],
  ['Laporan', true],
  ['Mode praktik', true],
]

export default function App() {
  const [apiState, setApiState] = useState('idle')
  const [apiMessage, setApiMessage] = useState('Belum dites')

  async function testApi() {
    setApiState('loading')
    setApiMessage('Menguji koneksi Cloudflare → Neon...')

    try {
      const response = await fetch('/api/health')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'API gagal merespons')
      }

      setApiState('success')
      setApiMessage(`Terhubung • ${data.database}`)
    } catch (error) {
      setApiState('error')
      setApiMessage(error.message)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10 flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-7 shadow-2xl shadow-black/20 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold tracking-[0.25em] text-cyan-400">HOMESCHOOLING LENTERA</p>
            <h1 className="text-4xl font-black tracking-tight">LENTERA POS</h1>
            <p className="mt-2 max-w-2xl text-slate-400">Sistem kasir dan laboratorium praktik TKJ berbasis React, Cloudflare, dan Neon PostgreSQL.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Version</p>
            <p className="mt-1 text-xl font-bold">v0.1.0</p>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <Stat title="Database" value="Neon PostgreSQL" note="Schema v0.1 aktif" />
          <Stat title="Product Code" value="LP000001" note="Code 128 ready" />
          <Stat title="Deployment" value="Cloudflare Pages" note="GitHub repo ready" />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Milestone v0.1</h2>
                <p className="mt-1 text-sm text-slate-400">Pondasi sistem sebelum masuk UI kasir.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {milestones.map(([label, done]) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <span className={done ? 'text-emerald-400' : 'text-slate-600'}>{done ? '✓' : '○'}</span>
                  <span className={done ? 'text-slate-200' : 'text-slate-500'}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-7">
            <h2 className="text-xl font-bold">API Health Check</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Tes endpoint Cloudflare Pages Function yang membaca waktu dari Neon. DATABASE_URL hanya disimpan sebagai secret Cloudflare.</p>

            <button
              type="button"
              onClick={testApi}
              disabled={apiState === 'loading'}
              className="mt-6 w-full rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
            >
              {apiState === 'loading' ? 'Menguji...' : 'Tes Koneksi Database'}
            </button>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
              <span className={apiState === 'success' ? 'text-emerald-400' : apiState === 'error' ? 'text-rose-400' : 'text-slate-400'}>{apiMessage}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Stat({ title, value, note }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{note}</p>
    </div>
  )
}
