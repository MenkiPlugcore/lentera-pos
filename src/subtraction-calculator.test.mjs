import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { calculateChange, MAX_CALCULATOR_AMOUNT } from './simulation/subtraction.js'

test('calculator subtraction Rp10.000 minus Rp6.000 is Rp4.000', () => {
  assert.deepEqual(calculateChange('10000','6000'),{
    ok:true,paid:10000,total:6000,insufficient:false,shortage:0,change:4000,
  })
})
test('calculator supports exact payment and zero rupiah amounts',()=>{
  assert.equal(calculateChange(5000,5000).change,0)
  assert.equal(calculateChange(0,0).change,0)
  assert.equal(calculateChange('0010000','06000').change,4000)
})
test('calculator reports insufficient cash rather than negative change',()=>{
  const result=calculateChange(5000,8000)
  assert.equal(result.ok,true)
  assert.equal(result.insufficient,true)
  assert.equal(result.shortage,3000)
  assert.equal(result.change,0)
})
test('invalid, negative, decimal, nonnumeric, and excessive amounts are rejected',()=>{
  for(const invalid of ['','-100','10.5','abc','1e4','1 000',null,MAX_CALCULATOR_AMOUNT+1]){
    assert.equal(calculateChange(invalid,2000).ok,false,JSON.stringify(invalid))
    assert.equal(calculateChange(10000,invalid).ok,false,JSON.stringify(invalid))
  }
  assert.equal(calculateChange(MAX_CALCULATOR_AMOUNT,0).change,MAX_CALCULATOR_AMOUNT)
})
test('sliding calculator never submits the game answer or changes backend data',()=>{
  const component=readFileSync(new URL('./simulation/SubtractionSlide.jsx',import.meta.url),'utf8')
  const page=readFileSync(new URL('./simulation/VisualCustomerPage.jsx',import.meta.url),'utf8')
  const style=readFileSync(new URL('./simulation/subtraction.css',import.meta.url),'utf8')
  assert.match(component,/calculateChange\(paid, total\)/)
  assert.match(component,/aria-modal=\{open \? 'true' : undefined\}/)
  assert.match(component,/event\.key === 'Escape'/)
  assert.match(component,/challengeId, paidAmount, totalAmount/)
  assert.match(page,/<SubtractionSlide open=\{calculatorOpen\}/)
  assert.match(page,/arcade-open-calculator/)
  assert.match(page,/arcade-calculator-trigger/)
  assert.match(style,/translateX\(103%\)/)
  assert.match(style,/translateY\(103%\)/)
  assert.doesNotMatch(component,/cloudApiFetch|\/api\/game\/answer|\/api\/checkout/)
})
