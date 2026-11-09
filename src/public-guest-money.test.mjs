import test from 'node:test'
import assert from 'node:assert/strict'
import { handlePublicApi } from '../worker/public.js'
import { getGuest } from '../worker/guest.js'
import { handleGameApi } from '../worker/game.js'
import { verifyProductImageUrl } from '../worker/index.js'

const guestId='ec3fdb07-a35e-44f2-8c8d-dfe0a808ee7d'
const sessionId='c136d521-c1a2-4e58-9d76-9f355acf4794'
const challengeId='4bd6e221-3e02-4c2c-8ba0-efeaeb2ecbad'
const request=body=>new Request('https://pos.cadera.site/api/game/sessions',{
  method:body?'POST':'GET',
  headers:body?{'content-type':'application/json'}:{},
  ...(body?{body:JSON.stringify(body)}:{}),
})

test('public catalog only retrieves safe product fields',async()=>{
  const db={query:async sql=>{
    assert.match(sql,/selling_price/)
    assert.doesNotMatch(sql,/purchase_price/)
    return [{id:sessionId,name:'Pensil',sellingPrice:1500,imageUrl:null,category:'Alat Tulis'}]
  }}
  const r=await handlePublicApi({db,path:'/api/public/catalog',method:'GET'})
  assert.equal((await r.json()).products[0].name,'Pensil')
})

test('public money is read only',async()=>{
  const db={query:async sql=>{assert.match(sql,/lentera_money_media/);return [{value:500,type:'coin',imageUrl:null}]}}
  assert.equal((await (await handlePublicApi({db,path:'/api/public/money',method:'GET'})).json()).denominations[0].value,500)
  assert.equal((await handlePublicApi({db,path:'/api/public/money',method:'POST'})).status,405)
})

test('guest identity creates safe HttpOnly cookie and stores token hash',async()=>{
  let hash
  const db={query:async(sql,args)=>{hash=args[0];return [{id:guestId}]}}
  const guest=await getGuest(db,request(),true)
  assert.equal(guest.id,guestId)
  assert.match(guest.setCookie,/HttpOnly; Secure; SameSite=Lax/)
  assert.equal(hash.length,64)
  assert.notEqual(hash,guest.setCookie.match(/lentera_guest=([0-9a-f]{64})/)[1])
})

test('guest list only includes sessions from its own id',async()=>{
  let query,params
  const db={query:async(sql,args)=>{query=sql;params=args;return []}}
  const r=await handleGameApi({db,path:'/api/game/sessions',method:'GET',request:request(),guestId,account:null})
  assert.equal(r.status,200)
  assert.match(query,/WHERE s\.guest_id=\$1::uuid/)
  assert.deepEqual(params,[guestId])
})

test('guest is denied other sessions and answers',async()=>{
  const db={query:async(sql,args)=>{
    assert.match(sql,/guest_id=\$2::uuid/)
    assert.equal(args[1],guestId)
    return []
  }}
  const c=await handleGameApi({db,path:'/api/game/challenge',method:'POST',request:request({sessionId}),guestId,account:null})
  assert.equal(c.status,404)
  const a=await handleGameApi({db,path:'/api/game/answer',method:'POST',request:request({challengeId,answer:1000}),guestId,account:null})
  assert.equal(a.status,404)
})

test('money Cloudinary URLs cannot masquerade as product photos or other folders',()=>{
  const env={CLOUDINARY_CLOUD_NAME:'jwuwqhjv'}
  const url='https://res.cloudinary.com/jwuwqhjv/image/upload/v123/lentera-pos/money/pecahan-500.png'
  const product='https://res.cloudinary.com/jwuwqhjv/image/upload/v123/lentera-pos/products/example.jpg'
  assert.equal(verifyProductImageUrl(url,env,null,'lentera-pos/money'),url)
  assert.throws(()=>verifyProductImageUrl(product,env,null,'lentera-pos/money'))
  assert.throws(()=>verifyProductImageUrl(url,env))
})
