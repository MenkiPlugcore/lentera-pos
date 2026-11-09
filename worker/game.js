// Learning Game API. Tidak menulis tabel penjualan dan tidak mengurangi stok.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const response=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
})
function invalid(message){const e=new Error(message);e.status=400;throw e}
function idOf(value){const s=String(value||'');if(!UUID.test(s))invalid('ID tidak valid.');return s}
const body=async request=>{
  if(!request.headers.get('content-type')?.startsWith('application/json'))invalid('Kirim JSON.')
  const raw=await request.text()
  if(raw.length>8000)invalid('Permintaan terlalu besar.')
  try{return JSON.parse(raw)}catch{invalid('JSON tidak valid.')}
}
const randomInt=(max)=>crypto.getRandomValues(new Uint32Array(1))[0]%max
const challengeOutput=(row)=>({
  id:row.id,sessionId:row.session_id,itemName:row.item_name,
  quantity:row.quantity,unitPrice:row.unit_price,totalAmount:row.total_amount,
  paidAmount:row.paid_amount,attempts:row.attempts,
  resolved:Boolean(row.resolved_at),wasCorrect:row.is_correct,
  expectedChange:row.resolved_at?row.correct_change:null,
})
export async function handleGameApi({db,path,method,request,guestId=null,account={role:'admin'}}) {
  // In production the Worker always passes an explicit account or a verified guest cookie.
  if (!account && !guestId) return response({ok:false,error:'Sesi pengunjung diperlukan. Muat ulang halaman.'},401)
  if (!path.startsWith('/api/game/')) return null
  if (path==='/api/game/summary' && method==='GET') {
    if (!account) return response({ok:false,error:'Hanya untuk admin.'},403)
    const [summary]=await db.query('SELECT count(*)::int sessions, COALESCE(sum(score),0)::int total_score FROM public.lentera_game_sessions')
    return response({ok:true,summary})
  }
  if (path==='/api/game/sessions' && method==='GET') {
    const sql='SELECT s.id,s.player_label AS "playerLabel",s.role,s.level_no AS level,s.score,s.experience AS xp,s.status,s.created_at AS "createdAt",s.completed_at AS "completedAt",(SELECT count(*)::int FROM public.lentera_game_challenges c WHERE c.session_id=s.id AND c.resolved_at IS NOT NULL) AS "completedCount" FROM public.lentera_game_sessions s'
    const rows=account
      ? await db.query(sql+' ORDER BY s.created_at DESC LIMIT 50')
      : await db.query(sql+' WHERE s.guest_id=$1::uuid ORDER BY s.created_at DESC LIMIT 50',[guestId])
    return response({ok:true,sessions:rows})
  }
  if (path==='/api/game/sessions' && method==='POST') {
    const data=await body(request)
    const playerLabel=String(data?.playerLabel||'').trim()
    if(playerLabel.length<2||playerLabel.length>60)invalid('Nama panggilan 2–60 karakter.')
    if (!account) {
      const [limits]=await db.query(
        "SELECT count(*)::int today FROM public.lentera_game_sessions WHERE guest_id=$1::uuid AND created_at>now()-interval '24 hours'",
        [guestId])
      if (limits.today>=100) return response({ok:false,error:'Batas 100 sesi latihan per perangkat per hari tercapai.'},429)
    }
    const [session]=await db.query(
      'INSERT INTO public.lentera_game_sessions(player_label,role,guest_id) VALUES($1,\'kasir\',$2::uuid) RETURNING id,player_label AS "playerLabel",role,level_no AS level,score,experience AS xp,status,0 AS "completedCount"',
      [playerLabel,account?null:guestId])
    return response({ok:true,session},201)
  }
  if (path==='/api/game/challenge' && method==='POST') {
    const data=await body(request)
    const sessionId=idOf(data?.sessionId)
    const [session]=await db.query(
      'SELECT id,level_no,status FROM public.lentera_game_sessions WHERE id=$1::uuid AND ($2::uuid IS NULL OR guest_id=$2::uuid)',
      [sessionId,account?null:guestId])
    if(!session) return response({ok:false,error:'Sesi latihan tidak ditemukan.'},404)
    if(session.status!=='active') return response({ok:false,error:'Sesi latihan sudah selesai.'},409)
    const [progress]=await db.query(
      'SELECT count(*)::int solved FROM public.lentera_game_challenges WHERE session_id=$1::uuid AND resolved_at IS NOT NULL',[sessionId])
    const [pending]=await db.query(
      'SELECT * FROM public.lentera_game_challenges WHERE session_id=$1::uuid AND resolved_at IS NULL LIMIT 1',[sessionId])
    if(pending) return response({ok:true,challenge:{...challengeOutput(pending),round:Math.min(5,progress.solved+1)}})
    if(progress.solved>=5) return response({ok:false,error:'Semua soal sesi ini sudah selesai.'},409)
    const menu=await db.query(
      'SELECT name,selling_price FROM public.products WHERE is_active AND selling_price BETWEEN 1000 AND 100000 AND mod(selling_price, 100) = 0 ORDER BY name LIMIT 100')
    const item=menu.length ? menu[randomInt(menu.length)] : {name:'Roti',selling_price:5000}
    const unitPrice=Math.round(Number(item.selling_price))
    const qty=1+randomInt(Math.min(3,Math.max(1,Math.ceil(session.level_no/2))))
    const total=unitPrice*qty
    const paid=[10000,20000,50000,100000,200000,500000,1000000].find(v=>v>=total+500)
      || Math.ceil((total+500)/50000)*50000
    const rows=await db.query(
      'INSERT INTO public.lentera_game_challenges (session_id,item_name,quantity,unit_price,total_amount,paid_amount,correct_change) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING *',
      [sessionId,item.name,qty,unitPrice,total,paid,paid-total])
    const challenge=rows[0] || (await db.query(
      'SELECT * FROM public.lentera_game_challenges WHERE session_id=$1::uuid AND resolved_at IS NULL LIMIT 1',[sessionId]))[0]
    if(!challenge)return response({ok:false,error:'Sesi sedang diproses. Coba ulangi.'},409)
    return response({ok:true,challenge:{...challengeOutput(challenge),round:Math.min(5,progress.solved+1)}})
  }
  if(path==='/api/game/answer' && method==='POST'){
    const data=await body(request)
    const id=idOf(data?.challengeId)
    const answer=Number(data?.answer)
    if(!Number.isSafeInteger(answer)||answer<0||answer>2147483647)invalid('Jawaban harus nominal rupiah yang valid.')
    if (!account) {
      const [owned]=await db.query(
        'SELECT c.id FROM public.lentera_game_challenges c JOIN public.lentera_game_sessions s ON s.id=c.session_id WHERE c.id=$1::uuid AND s.guest_id=$2::uuid',
        [id,guestId])
      if (!owned) return response({ok:false,error:'Soal latihan tidak ditemukan pada perangkat ini.'},404)
    }
    const [result]=await db.query(
      'SELECT * FROM public.lentera_game_answer($1::uuid,$2::integer)',[id,answer])
    return response({ok:true,result:{
      correct:result.correct,attemptCount:result.attempt_count,resolved:result.resolved,
      expectedChange:result.expected_change,score:result.session_score,xp:result.session_xp,
      level:result.session_level,status:result.session_status,
    }})
  }
  return response({ok:false,error:'Endpoint latihan tidak ditemukan.'},404)
}
