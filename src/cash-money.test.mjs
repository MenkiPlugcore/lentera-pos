import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CASH_DENOMINATIONS, MAX_CASH_PIECES, addCash, canAddCash,
  cashBreakdown, removeCashValue, removeLastCash, totalCash, canBuildExactChange,
} from './simulation/cashMoney.js'

test('denominations include Indonesian note and coin values without duplicates', () => {
  const values = CASH_DENOMINATIONS.map(x => x.value)
  assert.deepEqual(values,[
    100000,50000,20000,10000,5000,2000,1000,500,200,100,
  ])
  assert.equal(new Set(values).size,values.length)
  assert.equal(CASH_DENOMINATIONS.filter(x=>x.type==='coin').length,3)
  assert.equal(CASH_DENOMINATIONS.filter(x=>x.type==='note').length,7)
})

test('Rp 20.000 paid for Rp 13.000: count Rp 5.000 + Rp 2.000', () => {
  const paid=20000
  const first=addCash([],5000,paid)
  const selected=addCash(first,2000,paid)
  assert.deepEqual(first,[5000])
  assert.deepEqual(selected,[5000,2000])
  assert.equal(totalCash(selected),7000)
  assert.deepEqual(cashBreakdown(selected).map(x=>({value:x.value,count:x.count})),[
    {value:5000,count:1},{value:2000,count:1},
  ])
  assert.deepEqual(removeLastCash(selected),[5000])
  assert.deepEqual(removeCashValue(selected,5000),[2000])
})

test('coins can make Rp 1.500 change with banknote and coin', () => {
  const selected=[1000,500]
  assert.equal(totalCash(selected),1500)
  assert.equal(canBuildExactChange(1500),true)
  assert.equal(canBuildExactChange(50),false)
  assert.equal(canBuildExactChange(-100),false)
  assert.equal(canBuildExactChange(0),true)
  assert.equal(canBuildExactChange(1200),true)
})

test('cash pieces cannot be invalid, negative, greater than money paid or excessive', () => {
  const paid=10000
  const selected=[5000,2000]
  assert.equal(canAddCash(selected,5000,paid),false)
  assert.equal(canAddCash(selected,2000,paid),true)
  assert.strictEqual(addCash(selected,5000,paid),selected)
  assert.strictEqual(addCash(selected,1234,paid),selected)
  assert.strictEqual(addCash(selected,100,NaN),selected)
  assert.strictEqual(addCash(selected,100,-1),selected)
  assert.equal(totalCash([5000,999,2000]),7000)
  const full=Array(MAX_CASH_PIECES).fill(100)
  assert.equal(canAddCash(full,100,100000),false)
  assert.strictEqual(addCash(full,100,100000),full)
  assert.equal(totalCash(removeCashValue(full,100)),5900)
  assert.equal(totalCash(removeCashValue(full,200)),6000)
  assert.deepEqual(removeLastCash([]),[])
  assert.deepEqual(cashBreakdown([]),[])
})

test('basket remains immutable when removing last occurrence of denomination',()=>{
  const selected=[1000,500,200,500]
  assert.deepEqual(removeCashValue(selected,500),[1000,500,200])
  assert.deepEqual(selected,[1000,500,200,500])
  assert.equal(totalCash(selected),2200)
})
