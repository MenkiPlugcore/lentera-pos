// Smart Cafe API. Semua endpoint berada di belakang sesi admin Worker.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const response = (value,status=200)=>new Response(JSON.stringify(value),{
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
})
const invalid = (message) => {const e=new Error(message);e.status=400;throw e}
const input = async request => {
  if (!request.headers.get('content-type')?.startsWith('application/json')) invalid('Kirim JSON.')
  const raw=await request.text()
  if (raw.length>16000) invalid('Permintaan terlalu besar.')
  try {return JSON.parse(raw)} catch {invalid('JSON tidak valid.')}
}
function idOf(value) {const s=String(value||'');if(!UUID.test(s)) invalid('ID tidak valid.');return s}
const ORDER = [
 "SELECT o.id,o.order_code AS \"orderCode\",o.table_label AS \"tableLabel\",o.notes,",
 "o.status,o.total_amount AS \"totalAmount\",o.transaction_id AS \"transactionId\",",
 "o.created_at AS \"createdAt\",o.updated_at AS \"updatedAt\",",
 "COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id,",
 "'sku',i.sku,'name',i.name,'quantity',i.quantity,'unitPrice',i.unit_price,",
 "'subtotal',i.subtotal) ORDER BY i.created_at,i.id)",
 "FROM public.lentera_cafe_order_items i WHERE i.order_id=o.id),'[]'::jsonb) AS items",
 "FROM public.lentera_cafe_orders o"
].join(' ')

export async function handleCafeApi({db,path,method,request,account}) {
  if (!path.startsWith('/api/cafe/')) return null
  if (path==='/api/cafe/orders' && method==='GET') {
    const rows=await db.query(ORDER+" WHERE o.created_at>=now()-interval '30 days' ORDER BY o.created_at DESC LIMIT 150")
    return response({ok:true,orders:rows})
  }
  if (path==='/api/cafe/orders' && method==='POST') {
    const data=await input(request)
    const table=String(data?.tableLabel||'').trim()
    const notes=String(data?.notes||'').trim()
    if (!table || table.length>30 || notes.length>300) invalid('Meja atau catatan terlalu panjang.')
    if (!Array.isArray(data?.items) || data.items.length<1 || data.items.length>60) invalid('Pilih 1–60 menu.')
    for (const item of data.items) {
      idOf(item?.productId)
      if (!Number.isInteger(item?.quantity) || item.quantity<1 || item.quantity>999) invalid('Jumlah produk harus 1–999.')
    }
    const [result]=await db.query(
      'SELECT public.lentera_cafe_new($1,$2,$3::jsonb,$4::uuid) id',
      [table,notes,JSON.stringify(data.items),account.id])
    const [order]=await db.query(ORDER+' WHERE o.id=$1::uuid',[result.id])
    return response({ok:true,order},201)
  }
  const pay=path.match(/^\/api\/cafe\/orders\/([a-f0-9-]+)\/pay$/i)
  if (pay && method==='POST') {
    const id=idOf(pay[1])
    const data=await input(request)
    const paid=Number(data?.paidAmount)
    if (!Number.isSafeInteger(paid)||paid<0||paid>1000000000000) invalid('Nominal harus angka rupiah yang valid.')
    const [result]=await db.query(
      'SELECT public.lentera_cafe_pay($1::uuid,$2::numeric,$3::uuid) "transactionId"',
      [id,paid,account.id])
    const [order]=await db.query(ORDER+' WHERE o.id=$1::uuid',[id])
    return response({ok:true,order,transactionId:result.transactionId})
  }
  const status=path.match(/^\/api\/cafe\/orders\/([a-f0-9-]+)\/status$/i)
  if(status && method==='POST') {
    const id=idOf(status[1])
    const data=await input(request)
    const next=String(data?.status||'')
    if(!['preparing','ready','served','cancelled'].includes(next)) invalid('Status pesanan tidak valid.')
    await db.query('SELECT public.lentera_cafe_set_status($1::uuid,$2) AS status',[id,next])
    const [order]=await db.query(ORDER+' WHERE o.id=$1::uuid',[id])
    return response({ok:true,order})
  }
  return response({ok:false,error:'Endpoint cafe tidak ditemukan.'},404)
}
