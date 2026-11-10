// Scene visual menggunakan gambar toko dan tujuh karakter pilihan pengguna dari Cloudinary.
// Aset karakter transparan diolah Cloudinary (e_make_transparent) untuk menghindari latar putih.
// Foreground memakai latar toko yang sama agar meja kasir terlihat di depan karakter.
export const STORE_IMAGE = 'https://res.cloudinary.com/dvds41ivm/image/upload/v1794236695/lentera-pos/customers/toko-kosong-v1.png'
export const DEFAULT_CUSTOMER_IMAGE = 'https://res.cloudinary.com/dvds41ivm/image/upload/e_make_transparent:15/f_png/v1794236652/lentera-pos/customers/pelanggan-ungu-v1.png'

export default function StoreScene({customer, mood='neutral', empty=false}) {
  const characterImage = customer?.imageUrl || DEFAULT_CUSTOMER_IMAGE
  return (
    <div className={'game-store-art game-store-art--custom' + (empty?' game-store-art--empty':'')}
      role="img" aria-label={empty ? 'Toko Lentera siap menerima pelanggan' : 'Pelanggan '+(customer?.name||'virtual')+' di depan meja kasir'}>
      <img className="game-store-background" src={STORE_IMAGE} alt=""
        aria-hidden="true" fetchPriority="high" />
      {!empty && <div className={'game-store-character game-store-character--'+mood} key={characterImage}>
        <img src={characterImage} alt="" aria-hidden="true" fetchPriority="high"/>
      </div>}
      {!empty && <img className="game-store-foreground" src={STORE_IMAGE} alt=""
        aria-hidden="true" loading="eager" />}
    </div>
  )
}
