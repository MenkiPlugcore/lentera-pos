import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CUSTOMERS, customerForChallenge, customerDialogue, changeChoices, formatRupiah,
} from './simulation/customerProfiles.js'
import { handleGameApi } from '../worker/game.js'

const id='e5db3e25-6a20-4071-870b-748880d013bc'
const sessionId='02107ddc-ede4-4ffb-9c86-5b4adca5d236'
const challenge={
  id,sessionId,itemName:'Pulpen',quantity:2,
  unitPrice:3000,totalAmount:6000,paidAmount:10000,
}
const req=value=>new Request('https://pos.cadera.site/api/game/challenge',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify(value),
})

test('visual customer remains stable for the same challenge',()=>{
  const a=customerForChallenge(id),b=customerForChallenge(id)
  assert.deepEqual(a,b)
  assert.ok(CUSTOMERS.some(customer=>customer.id===a.id))
  assert.ok(a.name)
})

test('three change options are unique, nonnegative and include correct answer',()=>{
  for(const ch of [
    challenge,
    {...challenge,id:'another',paidAmount:5000,totalAmount:5000,unitPrice:500},
    {...challenge,id:'third',paidAmount:20000,totalAmount:15000,unitPrice:6000},
  ]){
    const choices=changeChoices(ch)
    assert.equal(choices.length,3)
    assert.equal(new Set(choices).size,3)
    assert.ok(choices.every(value=>value>=0))
    assert.ok(choices.includes(ch.paidAmount-ch.totalAmount))
    assert.deepEqual(changeChoices(ch),choices)
  }
})
test('customer reacts with simple, supportive messages',()=>{
  const customer=customerForChallenge(challenge.id)
  assert.match(customerDialogue(customer,challenge,null),/2 Pulpen/)
  assert.match(customerDialogue(customer,challenge,{correct:false,resolved:false}),/Coba/)
  assert.match(customerDialogue(customer,challenge,{correct:true,resolved:true}),/Terima kasih/)
  assert.match(customerDialogue(customer,challenge,{correct:false,resolved:true}),/latihan lagi/)
  assert.match(formatRupiah(10000),/10.000/)
})

test('game API can return an existing challenge with progress round',async()=>{
  let queryCount=0
  const db={query:async sql=>{
    queryCount++
    if(sql.includes('FROM public.lentera_game_sessions WHERE'))return [{id:sessionId,level_no:1,status:'active'}]
    if(sql.includes('count(*)::int solved'))return [{solved:2}]
    if(sql.includes('WHERE session_id=$1::uuid AND resolved_at IS NULL'))return [{
      ...challenge,id,session_id:sessionId,item_name:'Pulpen',quantity:2,
      unit_price:3000,total_amount:6000,paid_amount:10000,attempts:0,resolved_at:null,
    }]
    throw new Error('Unexpected query: '+sql)
  }}
  const res=await handleGameApi({
    account:{role:'admin'},db,path:'/api/game/challenge',method:'POST',request:req({sessionId})
  })
  assert.equal(res.status,200)
  const data=await res.json()
  assert.equal(data.challenge.round,3)
  assert.equal(data.challenge.itemName,'Pulpen')
  assert.equal(queryCount,3)
})

test('invalid UUID session is rejected before database access',async()=>{
  let queried=false
  await assert.rejects(handleGameApi({
    account:{role:'admin'},db:{query:()=>{queried=true}},
    path:'/api/game/challenge',method:'POST',request:req({sessionId:'not-a-uuid'}),
  }),/ID tidak valid/)
  assert.equal(queried,false)
})
