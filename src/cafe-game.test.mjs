import test from 'node:test'
import assert from 'node:assert/strict'
import { handleCafeApi } from '../worker/cafe.js'
import { handleGameApi } from '../worker/game.js'

const jsonRequest = (value) => new Request('https://pos.cadera.site/api/test',{
 method:'POST',
 headers:{'content-type':'application/json'},
 body:JSON.stringify(value),
})
const actor={id:'91f6480e-878c-471e-b66b-ee3e73f5e33e'}
const uid='2520975c-1794-4ce6-9cb7-1d0416e5fd9a'

test('cafe rejects invalid quantities without touching database', async()=>{
 let touched=false
 const db={query:()=>{touched=true;return []}}
 await assert.rejects(handleCafeApi({
  db,path:'/api/cafe/orders',method:'POST',request:jsonRequest({
    tableLabel:'Meja 1',items:[{productId:uid,quantity:-1}],
  }),account:actor
 }),/Jumlah produk/)
 assert.equal(touched,false)
})

test('cafe order writes via database transaction function', async()=>{
 const calls=[]
 const db={query:async (q,params)=>{
  calls.push({q,params})
  return calls.length===1 ? [{id:uid}] : [{id:uid,orderCode:'CAFE-123'}]
 }}
 const res=await handleCafeApi({
  db,path:'/api/cafe/orders',method:'POST',request:jsonRequest({
    tableLabel:'Meja 2',notes:'tanpa gula',items:[{productId:uid,quantity:2}],
  }),account:actor
 })
 assert.equal(res.status,201)
 assert.equal((await res.json()).order.orderCode,'CAFE-123')
 assert.match(calls[0].q,/lentera_cafe_new/)
 assert.equal(calls[0].params[0],'Meja 2')
})

test('cafe payment delegates to atomic database pay function', async()=>{
 const calls=[]
 const db={query:async(q,args)=>{calls.push(q);return calls.length===1?[{transactionId:uid}]:[{id:uid}]}}
 const res=await handleCafeApi({
  db,path:'/api/cafe/orders/'+uid+'/pay',method:'POST',
  request:jsonRequest({paidAmount:10000}),account:actor
 })
 assert.equal((await res.json()).transactionId,uid)
 assert.match(calls[0],/lentera_cafe_pay/)
})

test('game validates answer and returns server-issued score',async()=>{
 const db={query:async()=>[{
  correct:true,attempt_count:1,resolved:true,expected_change:2000,
  session_score:20,session_xp:20,session_level:1,session_status:'active',
 }]}
 const res=await handleGameApi({
  account:{role:'admin'},db,path:'/api/game/answer',method:'POST',
  request:jsonRequest({challengeId:uid,answer:2000})
 })
 const {result}=await res.json()
 assert.equal(result.score,20)
 assert.equal(result.expectedChange,2000)
})

test('game rejects noninteger answers',async()=>{
 let touched=false
 await assert.rejects(handleGameApi({
  account:{role:'admin'},db:{query:()=>{touched=true;return []}},
  path:'/api/game/answer',method:'POST',
  request:jsonRequest({challengeId:uid,answer:'2.5'})
 }),/Jawaban harus nominal/)
 assert.equal(touched,false)
})
