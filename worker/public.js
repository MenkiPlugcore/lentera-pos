// These endpoints are intentionally read-only and safe for visitors.
const json=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=60','x-content-type-options':'nosniff'}
})
export async function handlePublicApi({db,path,method}) {
  if (!path.startsWith('/api/public/')) return null
  if (method!=='GET') return json({ok:false,error:'Metode tidak diizinkan.'},405)
  if(path==='/api/public/catalog') {
    const rows=await db.query(
      "SELECT p.id,p.name,p.selling_price AS \"sellingPrice\",p.image_url AS \"imageUrl\",c.name AS category FROM public.products p LEFT JOIN public.categories c ON c.id=p.category_id WHERE p.is_active ORDER BY c.name NULLS LAST,p.name LIMIT 100")
    return json({ok:true,products:rows})
  }
  if(path==='/api/public/money') {
    const rows=await db.query(
      "SELECT denomination AS value,kind AS type,image_url AS \"imageUrl\" FROM public.lentera_money_media ORDER BY denomination DESC")
    return json({ok:true,denominations:rows})
  }
  return json({ok:false,error:'Endpoint publik tidak ditemukan.'},404)
}
