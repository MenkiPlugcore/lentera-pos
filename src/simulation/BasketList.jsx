import { formatRupiah } from './customerProfiles.js'
import './basket.css'

// Selalu menggunakan snapshot pesanan dari Neon, bukan stok produk saat ini.
// Jika sesi lama hanya punya satu item, tetap bisa ditampilkan.
export function basketLines(challenge) {
  if (Array.isArray(challenge?.items) && challenge.items.length) return challenge.items
  if (!challenge) return []
  const quantity=Number(challenge.quantity)||1
  const unitPrice=Number(challenge.unitPrice)||0
  return [{productId:null,name:challenge.itemName||'Produk',quantity,unitPrice,
    subtotal:quantity*unitPrice,imageUrl:null}]
}
export default function BasketList({items=[],variant='scene'}) {
  const lines=Array.isArray(items)?items:[]
  return <div className={'game-basket game-basket--'+variant}>
    <div className="game-basket-heading">
      <strong>Keranjang</strong>
      <span>{lines.length} jenis barang</span>
    </div>
    <div className="game-basket-list" role="list" aria-label="Rincian barang belanja">
      {lines.map((item,i) => (
        <div role="listitem" className="game-basket-row" key={item.productId || item.name+'-'+i}>
          <div className="game-basket-thumb" aria-hidden="true">
            {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy"/> : <span>▣</span>}
          </div>
          <div className="game-basket-info">
            <strong>{item.name}</strong>
            <small>{item.quantity} × {formatRupiah(item.unitPrice)}</small>
          </div>
          <strong className="game-basket-subtotal">{formatRupiah(item.subtotal)}</strong>
        </div>
      ))}
    </div>
    {lines.length>2 && variant==='scene' && (
      <p className="game-basket-more">+{lines.length-2} barang lainnya · lihat di laci uang</p>
    )}
  </div>
}
