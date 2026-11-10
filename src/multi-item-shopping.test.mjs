import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { basketSizeForRound,createPracticeBasket,challengeItems } from '../worker/multiItem.js'
import { handleGameApi } from '../worker/game.js'

const sessionId='c136d521-c1a2-4e58-9d76-9f355acf4794'
const challengeId='4bd6e221-3e02-4c2c-8ba0-efeaeb2ecbad'
const products=[
  {id:'1',name:'Pensil',selling_price:'1500.00',image_url:'https://res.cloudinary.com/example/image/upload/pen.jpg'},
  {id:'2',name:'Pulpen',selling_price:'3000.00',image_url:null},
  {id:'3',name:'Buku',selling_price:'6000.00',image_url:null},
  {id:'4',name:'Air Mineral',selling_price:'5000.00',image_url:null},
  {id:'5',name:'Tas Selempang',selling_price:'50000.00',image_url:null},
]
const post=value=>new Request('https://pos.cadera.site/api/game/challenge',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value),
})

test('difficulty progresses from 2 to 5 different products in five customers',()=>{
  assert.deepEqual([1,2,3,4,5].map(basketSizeForRound),[2,3,3,4,5])
  assert.equal(basketSizeForRound(0),2)
  assert.equal(basketSizeForRound(9),5)
  for(let round=1;round<=5;round++){
    const basket=createPracticeBasket(products,round,max=>0)
    assert.equal(basket.items.length,basketSizeForRound(round))
    assert.equal(new Set(basket.items.map(i=>i.name)).size,basket.items.length)
    assert.equal(basket.difficulty,round)
    assert.ok(basket.paidAmount>=basket.totalAmount)
    assert.equal(basket.correctChange,basket.paidAmount-basket.totalAmount)
    assert.equal(basket.correctChange%100,0)
    assert.equal(basket.totalAmount,basket.items.reduce((sum,i)=>sum+i.subtotal,0))
    for(const item of basket.items){
      assert.equal(item.subtotal,item.quantity*item.unitPrice)
      assert.ok(item.quantity>=1 && item.quantity<=3)
      assert.equal(item.unitPrice%100,0)
    }
  }
})

test('new orders do not mutate existing catalog or remove stock',()=>{
  const before=JSON.stringify(products)
  const basket=createPracticeBasket(products,5,max=>max-1)
  assert.equal(JSON.stringify(products),before)
  assert.equal(basket.items.length,5)
  assert.equal(basket.items[0].imageUrl,null)
  assert.equal(basket.items.some(x=>x.imageUrl?.startsWith('https://res.cloudinary.com/')),true)
  assert.equal('stock' in basket.items[0],false)
  assert.equal('purchasePrice' in basket.items[0],false)
})

test('fallback educational items cover low-stock catalog without changing it',()=>{
  const basket=createPracticeBasket([{name:'Pensil',selling_price:1500}],5,max=>0)
  assert.equal(basket.items.length,5)
  assert.equal(new Set(basket.items.map(i=>i.name)).size,5)
  assert.ok(basket.items.some(i=>i.productId===null))
  const empty=createPracticeBasket([],2,max=>0)
  assert.equal(empty.items.length,3)
})

test('legacy challenges without basket JSON continue as one-item orders',()=>{
  assert.deepEqual(challengeItems({item_name:'Pensil',quantity:2,unit_price:1500}),[
    {productId:null,name:'Pensil',quantity:2,unitPrice:1500,subtotal:3000,imageUrl:null},
  ])
})

test('challenge API stores snapshot of multi-item cart, with NO inventory write',async()=>{
  const queries=[]
  const db={query:async(sql,args=[])=>{
    queries.push({sql,args})
    if(sql.includes('SELECT id,level_no,status FROM public.lentera_game_sessions')){
      return [{id:sessionId,level_no:1,status:'active'}]
    }
    if(sql.includes('count(*)::int solved'))return [{solved:3}]
    if(sql.includes('SELECT * FROM public.lentera_game_challenges') && sql.includes('resolved_at IS NULL'))return []
    if(sql.includes('FROM public.products'))return products
    if(sql.includes('INSERT INTO public.lentera_game_challenges')){
      assert.match(sql,/,items\)/)
      const [sid,itemName,qty,unitPrice,total,paid,correct,snapshot]=args
      assert.equal(sid,sessionId)
      assert.match(itemName,/Keranjang 4 barang/)
      assert.equal(qty,1)
      const items=JSON.parse(snapshot)
      assert.equal(items.length,4)
      assert.equal(total,items.reduce((sum,row)=>sum+row.quantity*row.unitPrice,0))
      assert.equal(paid-total,correct)
      return [{
        id:challengeId,session_id:sid,item_name:itemName,quantity:qty,
        unit_price:unitPrice,total_amount:total,paid_amount:paid,correct_change:correct,
        items,attempts:0,resolved_at:null,is_correct:null,
      }]
    }
    throw new Error('Unexpected SQL: '+sql)
  }}
  const res=await handleGameApi({
    account:{role:'admin'},db,path:'/api/game/challenge',method:'POST',
    request:post({sessionId}),
  })
  assert.equal(res.status,200)
  const data=await res.json()
  assert.equal(data.challenge.round,4)
  assert.equal(data.challenge.difficulty,4)
  assert.equal(data.challenge.items.length,4)
  assert.equal(data.challenge.totalAmount,
    data.challenge.items.reduce((sum,i)=>sum+i.subtotal,0))
  assert.ok(queries.every(({sql})=>!/UPDATE\s+public\.products|INSERT\s+INTO\s+public\.transactions|stock_movements/i.test(sql)))
})

test('schema migration adds only training snapshot and keeps existing data',()=>{
  const sql=readFileSync(new URL('../db/004_game_multi_item.sql',import.meta.url),'utf8')
  assert.match(sql,/ADD COLUMN IF NOT EXISTS items jsonb/)
  assert.match(sql,/items IS NULL/)
  assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE|DELETE\s+FROM\s+public\.products|UPDATE\s+public\.products/)
})

test('visual simulation keeps its basket and calculator while public cashier handles multi-item sales',()=>{
  const visual=readFileSync(new URL('./simulation/VisualCustomerPage.jsx',import.meta.url),'utf8')
  const cashier=readFileSync(new URL('./PublicCashierPage.jsx',import.meta.url),'utf8')
  const basket=readFileSync(new URL('./simulation/BasketList.jsx',import.meta.url),'utf8')
  assert.match(visual,/<BasketList items=\{items\} variant="scene"\/>/)
  assert.match(visual,/<BasketList items=\{items\} variant="drawer"\/>/)
  assert.match(cashier,/cart\.map\(item=>/)
  assert.match(cashier,/checkoutDemo\(cart,paid/)
  assert.match(visual,/<SubtractionSlide open=\{calculatorOpen\}/)
  assert.match(visual,/<MoneyTray compact images=\{moneyImages\}/)
  assert.match(basket,/imageUrl/)
})
