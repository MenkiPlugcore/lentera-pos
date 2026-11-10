import { useEffect, useState } from 'react'
import { cloudApiFetch } from './cloudApi.js'
import './landing.css'

const rupiah = value => new Intl.NumberFormat('id-ID',{
  style:'currency',currency:'IDR',maximumFractionDigits:0,
}).format(Number(value)||0)

const modules = [
  {
    id:'simulasi',
    label:'Simulasi Pelanggan',
    href:'/simulasi',
    eyebrow:'BELAJAR MELAYANI',
    description:'Sambut pembeli, lihat pesanannya, lalu susun uang kembalian memakai gambar uang dan koin.',
    icon:'customer',
    duration:'5 pelanggan per sesi',
  },
  {
    id:'cashier',
    label:'Kasir Biasa',
    href:'/kasir-umum',
    eyebrow:'LATIHAN TRANSAKSI',
    description:'Pilih produk, scan kode barang, atur keranjang, terima pembayaran, dan buat struk latihan. Stok terisi otomatis.',
    icon:'calculator',
    duration:'Transaksi tanpa batas',
  },
]

function IllustrationIcon({ name, size=28 }) {
  const shared={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round', 'aria-hidden':true}
  if(name==='customer')return <svg {...shared}><circle cx="12" cy="7" r="3.5"/><path d="M4 20v-2a8 8 0 0 1 16 0v2"/><path d="M17.5 5.2h4M19.5 3.2v4"/></svg>
  if(name==='calculator')return <svg {...shared}><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M8 7h8M8.5 11h1M14.5 11h1M8.5 15h1M14.5 15h1M8.5 19h1M14.5 19h1"/></svg>
  if(name==='arrow')return <svg {...shared}><path d="M4 12h16M14 6l6 6-6 6"/></svg>
  if(name==='check')return <svg {...shared}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>
  if(name==='book')return <svg {...shared}><path d="M12 6.5C9 4.6 5.5 4.5 3 5v13c3-.8 6.3-.5 9 1 2.7-1.5 6-1.8 9-1V5c-2.5-.5-6-.4-9 1.5Z"/><path d="M12 6.5V19"/></svg>
  return <svg {...shared}><path d="M4 7h16v10H4zM8 11h8M8 14h5"/></svg>
}

function PreviewCard() {
  return <div className="landing-preview" aria-label="Ilustrasi contoh transaksi latihan">
    <div className="landing-preview-top">
      <span className="landing-preview-status"><span/> CONTOH SIMULASI</span>
      <span className="landing-preview-steps">01 / 05</span>
    </div>
    <div className="landing-customer-line">
      <div className="landing-customer-avatar" aria-hidden="true">☺</div>
      <div className="landing-customer-speech">
        <span>PELANGGAN</span>
        <p>Halo! Saya mau belanja. Bantu hitung kembaliannya, ya!</p>
      </div>
    </div>
    <div className="landing-preview-order">
      <div className="landing-order-heading"><span>Pesanan pembeli</span><span>1 item</span></div>
      <div className="landing-preview-product"><span className="landing-bag-icon" aria-hidden="true">▣</span><span>Alat tulis & kebutuhan sekolah</span><strong>Rp13.000</strong></div>
      <div className="landing-order-summary"><span>Total belanja</span><strong>Rp13.000</strong></div>
      <div className="landing-order-summary landing-order-cash"><span>Uang diterima</span><strong>Rp20.000</strong></div>
      <div className="landing-order-change"><span><IllustrationIcon name="check" size={20}/> Kembalian tepat</span><strong>Rp7.000</strong></div>
    </div>
    <div className="landing-preview-bottom"><span>✓</span> Simulasi belajar · Bukan pembayaran asli</div>
    <div className="landing-spark landing-spark-one" aria-hidden="true">✳</div>
    <div className="landing-spark landing-spark-two" aria-hidden="true">✳</div>
  </div>
}

export default function PublicHomePage() {
  const [products,setProducts]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [retry,setRetry]=useState(0)

  useEffect(()=>{
    let active=true
    setLoading(true)
    setError('')
    cloudApiFetch('/api/public/catalog')
      .then(result=>{if(active)setProducts((result.products||[]).slice(0,8))})
      .catch(problem=>{if(active)setError(problem.message)})
      .finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[retry])

  return <main id="konten-utama" className="landing-page">
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-container landing-hero-grid">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow"><span className="landing-eyebrow-dot"/> HOMESCHOOLING LENTERA HATI</div>
          <h1 id="landing-title">Belajar jual beli jadi <span>lebih mudah & menyenangkan.</span></h1>
          <p className="landing-hero-description">
            Latihan menjadi kasir bersama pelanggan virtual. Pilih produk,
            hitung uang, dan pelajari kembalian dengan langkah sederhana,
            langsung dari HP atau komputer.
          </p>
          <div className="landing-actions">
            <a className="landing-btn landing-btn-primary" href="/simulasi">
              Mulai Simulasi <IllustrationIcon name="arrow" size={20}/>
            </a>
            <a className="landing-btn landing-btn-secondary" href="/game">Coba Kasir Biasa</a>
          </div>
          <div className="landing-reassurance">
            <span><IllustrationIcon name="check" size={18}/> Tanpa login</span>
            <span><IllustrationIcon name="check" size={18}/> Tanpa batas waktu</span>
            <span><IllustrationIcon name="check" size={18}/> Ramah HP</span>
          </div>
        </div>
        <div className="landing-preview-wrap"><PreviewCard/></div>
      </div>
    </section>

    <section className="landing-section" id="aktivitas" aria-labelledby="activities-title">
      <div className="landing-container">
        <div className="landing-section-heading">
          <div><span className="landing-kicker">PILIH KEGIATAN</span><h2 id="activities-title">Mau belajar apa hari ini?</h2></div>
          <p>Pilih aktivitas yang sesuai. Mulai dari pelanggan visual hingga praktik kasir dengan keranjang, pembayaran, dan struk.</p>
        </div>
        <div className="landing-module-grid">
          {modules.map(module=><a href={module.href} key={module.id} className={'landing-module landing-module-'+module.id}>
            <div className="landing-module-top">
              <span className="landing-module-icon"><IllustrationIcon name={module.icon} size={32}/></span>
              <span className="landing-module-arrow"><IllustrationIcon name="arrow" size={20}/></span>
            </div>
            <span className="landing-module-eyebrow">{module.eyebrow}</span>
            <h3>{module.label}</h3>
            <p>{module.description}</p>
            <div className="landing-module-footer"><span>{module.duration}</span><span>Mulai belajar <IllustrationIcon name="arrow" size={17}/></span></div>
          </a>)}
        </div>
      </div>
    </section>

    <section className="landing-section landing-how-section" id="cara-belajar" aria-labelledby="how-title">
      <div className="landing-container">
        <div className="landing-section-heading">
          <div><span className="landing-kicker">MUDAH DIIKUTI</span><h2 id="how-title">Tiga langkah untuk mulai</h2></div>
          <p>Alurnya sederhana, sehingga siswa bisa belajar mandiri atau didampingi guru dan orang tua.</p>
        </div>
        <ol className="landing-steps">
          <li><span className="landing-step-number">01</span><div><h3>Pilih permainan</h3><p>Buka Simulasi Pelanggan atau Kasir Biasa.</p></div></li>
          <li><span className="landing-step-number">02</span><div><h3>Ikuti petunjuk</h3><p>Baca pesanan, hitung total dan pilih uang kembalian.</p></div></li>
          <li><span className="landing-step-number">03</span><div><h3>Lihat hasil belajar</h3><p>Terima umpan balik positif, poin, dan pengalaman belajar.</p></div></li>
        </ol>
      </div>
    </section>

    <section className="landing-section" id="menu-latihan" aria-labelledby="products-title">
      <div className="landing-container">
        <div className="landing-section-heading">
          <div><span className="landing-kicker">KATALOG LATIHAN</span><h2 id="products-title">Kenali produk dan harganya</h2></div>
          <p>Contoh produk yang digunakan sebagai bahan belajar berhitung. Ini bukan toko online.</p>
        </div>
        {error && <div className="landing-catalog-notice" role="status">
          <p>Katalog belum berhasil dimuat: {error}</p>
          <button type="button" onClick={()=>setRetry(n=>n+1)}>Coba lagi</button>
        </div>}
        <div className="landing-product-grid" aria-busy={loading}>
          {loading && Array.from({length:4},(_,i)=><div key={'skeleton-'+i} className="landing-product-skeleton" aria-hidden="true"><div/><span/><span/></div>)}
          {!loading && !error && products.map(product=><article className="landing-product" key={product.id}>
            <div className="landing-product-image">
              {product.imageUrl
                ? <img src={product.imageUrl} loading="lazy" alt={'Gambar '+product.name}/>
                : <span aria-hidden="true"><IllustrationIcon name="book" size={38}/></span>}
            </div>
            <div className="landing-product-detail"><p>{product.category || 'Produk latihan'}</p><h3>{product.name}</h3><strong>{rupiah(product.sellingPrice)}</strong></div>
          </article>)}
        </div>
        {!loading && !error && products.length===0 && <p className="landing-catalog-empty">Belum ada produk latihan yang ditampilkan. Admin dapat menambahkan produk melalui dashboard.</p>}
      </div>
    </section>

    <section className="landing-cta-section" aria-label="Mulai latihan sekarang">
      <div className="landing-container">
        <div className="landing-bottom-cta">
          <div><span className="landing-kicker">SIAP BELAJAR?</span><h2>Satu langkah kecil, banyak keterampilan baru.</h2><p>Latihan berhitung, komunikasi, dan pelayanan dalam satu tempat.</p></div>
          <a href="/simulasi" className="landing-btn landing-btn-primary">Ayo mulai <IllustrationIcon name="arrow" size={20}/></a>
        </div>
      </div>
    </section>

    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <span>© LENTERA POS · Media pembelajaran Homeschooling Lentera Hati</span>
        <a href="/admin">Masuk Admin</a>
      </div>
    </footer>
  </main>
}
