import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  TOTAL_LEVELS,ROUNDS_PER_LEVEL,MIN_CORRECT_TO_PASS,STORAGE_KEY,FALLBACK_PRODUCTS,
  difficultyForLevel,createProfile,startLevel,submitLocalAnswer,advanceLocalRound,
  saveProfiles,loadProfiles,sanitiseProfile,starsForCorrect,safeName,
} from './simulation/localLevels.js'

const rand=()=>0
const fresh=()=>createProfile('Siswa A','local-test-player')
const answer=(profile,correct=true)=>{
  const challenge=profile.active.challenge
  const expected=challenge.paidAmount-challenge.totalAmount
  let current=profile,result
  for(let i=0;i<(correct?1:3);i++){
    const graded=submitLocalAnswer(current,correct?expected:expected+100)
    current=graded.profile;result=graded.result
  }
  return {current,result}
}
const finish=(profile,correctCount)=>{
  let p=profile
  for(let round=1;round<=ROUNDS_PER_LEVEL;round++){
    const graded=answer(p,round<=correctCount)
    p=advanceLocalRound(graded.current,FALLBACK_PRODUCTS,rand)
  }
  return p
}

test('40 ordered selectable levels with 5 customers and difficulty tiers',()=>{
  assert.equal(TOTAL_LEVELS,40)
  assert.equal(ROUNDS_PER_LEVEL,5)
  assert.equal(MIN_CORRECT_TO_PASS,3)
  assert.equal(difficultyForLevel(1),1)
  assert.equal(difficultyForLevel(8),1)
  assert.equal(difficultyForLevel(9),2)
  assert.equal(difficultyForLevel(17),3)
  assert.equal(difficultyForLevel(25),4)
  assert.equal(difficultyForLevel(33),5)
  assert.equal(difficultyForLevel(40),5)
  assert.deepEqual([3,4,5].map(starsForCorrect),[1,2,3])
})
test('local profiles validate name and block locked levels',()=>{
  const p=fresh()
  assert.equal(safeName('  Siswa   A  '),'Siswa A')
  assert.equal(p.unlockedLevel,1)
  assert.throws(()=>createProfile('x','id'),/minimal 2/)
  assert.throws(()=>startLevel(p,2,FALLBACK_PRODUCTS,rand),/terkunci/)
  assert.throws(()=>startLevel(p,41,FALLBACK_PRODUCTS,rand),/terkunci/)
})
test('new level starts at customer 1 with 2–5 items and integer totals',()=>{
  let p=startLevel(fresh(),1,FALLBACK_PRODUCTS,rand)
  assert.equal(p.active.round,1)
  assert.equal(p.active.level,1)
  assert.equal(p.active.challenge.items.length,2)
  assert.equal(p.active.challenge.totalAmount,
    p.active.challenge.items.reduce((sum,item)=>sum+item.quantity*item.unitPrice,0))
  assert.ok(p.active.challenge.paidAmount>=p.active.challenge.totalAmount)
  assert.throws(()=>advanceLocalRound(p),/Selesaikan/)
  const result=answer(p)
  assert.equal(result.result.correct,true)
  assert.equal(result.result.attemptCount,1)
  assert.equal(result.result.score,20)
  p=advanceLocalRound(result.current,FALLBACK_PRODUCTS,rand)
  assert.equal(p.active.round,2)
  assert.equal(p.active.score,20)
})
test('wrong answers permit three attempts; below three correct does not unlock',()=>{
  const p=finish(startLevel(fresh(),1,FALLBACK_PRODUCTS,rand),2)
  assert.equal(p.active,null)
  assert.equal(p.unlockedLevel,1)
  assert.equal(p.records[1],undefined)
  const replay=startLevel(p,1,FALLBACK_PRODUCTS,rand)
  assert.equal(replay.active.score,0)
})
test('three or more correct unlocks next, with stars and best-score replay',()=>{
  let p=finish(startLevel(fresh(),1,FALLBACK_PRODUCTS,rand),3)
  assert.equal(p.unlockedLevel,2)
  assert.deepEqual(p.records[1],{stars:1,bestScore:60})
  p=finish(startLevel(p,1,FALLBACK_PRODUCTS,rand),5)
  assert.deepEqual(p.records[1],{stars:3,bestScore:100})
  assert.equal(p.unlockedLevel,2)
  p=finish(startLevel(p,2,FALLBACK_PRODUCTS,rand),4)
  assert.equal(p.unlockedLevel,3)
  assert.equal(p.records[2].stars,2)
})
test('all forty levels can be unlocked sequentially and stop at 40',()=>{
  let p=fresh()
  for(let level=1;level<=TOTAL_LEVELS;level++){
    p=finish(startLevel(p,level,FALLBACK_PRODUCTS,rand),5)
    assert.equal(p.unlockedLevel,Math.min(TOTAL_LEVELS,level+1))
  }
  assert.equal(Object.keys(p.records).length,40)
  assert.equal(Object.values(p.records).reduce((a,b)=>a+b.stars,0),120)
})
test('localStorage roundtrip supports separate profiles and in-progress round',()=>{
  const memory=new Map()
  const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)}
  let p=answer(startLevel(fresh(),1,FALLBACK_PRODUCTS,rand)).current
  p=advanceLocalRound(p,FALLBACK_PRODUCTS,rand)
  const second=createProfile('Siswa B','player-b')
  saveProfiles(storage,[p,second])
  assert.ok(memory.has(STORAGE_KEY))
  const restored=loadProfiles(storage)
  assert.equal(restored.length,2)
  assert.equal(restored[0].active.round,2)
  assert.equal(restored[0].active.score,20)
  assert.equal(restored[1].unlockedLevel,1)
  assert.equal(restored[1].active,null)
})
test('invalid local progress cannot unlock levels through a fake integer',()=>{
  const fake={...fresh(),unlockedLevel:40,records:{'39':{stars:3,bestScore:100}}}
  const restored=sanitiseProfile(fake)
  assert.equal(restored.unlockedLevel,1)
  assert.equal(loadProfiles({getItem:()=>'{broken-json'}).length,0)
})
test('simulation never posts accounts, games, scores or stock to Neon',()=>{
  const visual=readFileSync(new URL('./simulation/VisualCustomerPage.jsx',import.meta.url),'utf8')
  const engine=readFileSync(new URL('./simulation/localLevels.js',import.meta.url),'utf8')
  const selector=readFileSync(new URL('./simulation/LevelSelect.jsx',import.meta.url),'utf8')
  assert.match(visual,/saveProfiles\(window\.localStorage,profiles\)/)
  assert.match(visual,/startLevel\(profile,level,catalog\)/)
  assert.match(visual,/submitLocalAnswer\(profile,value\)/)
  assert.match(visual,/advanceLocalRound\(profile,catalog\)/)
  assert.match(selector,/Array\.from\(\{length:TOTAL_LEVELS\}/)
  assert.doesNotMatch(visual,/\/api\/game\/sessions|\/api\/game\/answer|\/api\/game\/challenge|\/api\/transactions/)
  assert.doesNotMatch(engine,/fetch\(|cloudApiFetch|\/api\/|neon\(|INSERT INTO|UPDATE products/)
})
