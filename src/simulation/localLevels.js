// LENTERA POS Simulasi Lokal v1.7
// Data pemain hanya disimpan di browser ini, tanpa login, cookie akun, atau Neon.
import { createPracticeBasket } from '../../worker/multiItem.js'

export const TOTAL_LEVELS=40
export const ROUNDS_PER_LEVEL=5
export const MIN_CORRECT_TO_PASS=3
export const STORAGE_KEY='lentera-pos-simulasi-local-v1'
export const FALLBACK_PRODUCTS=Object.freeze([
  {name:'Pensil',sellingPrice:1500},
  {name:'Pulpen',sellingPrice:3000},
  {name:'Buku Tulis',sellingPrice:6000},
  {name:'Air Mineral',sellingPrice:5000},
  {name:'Penghapus',sellingPrice:2000},
  {name:'Roti',sellingPrice:5000},
  {name:'Susu Kotak',sellingPrice:7000},
  {name:'Biskuit',sellingPrice:8000},
  {name:'Jus Buah',sellingPrice:9000},
  {name:'Penggaris',sellingPrice:2500},
])

const int=(value,min,max,fallback=min)=>{
  const n=Number(value)
  return Number.isInteger(n)&&n>=min&&n<=max?n:fallback
}
export function difficultyForLevel(level) {
  return Math.min(5,Math.max(1,Math.ceil(int(level,1,40)/8)))
}
export function starsForCorrect(correct) {
  return correct===5?3:correct===4?2:correct>=3?1:0
}
export function safeName(value) {
  return String(value??'').trim().replace(/\s+/g,' ').slice(0,32)
}
function cleanRecords(raw) {
  const records={}
  if(!raw||typeof raw!=='object')return records
  for(let level=1;level<=TOTAL_LEVELS;level++){
    const record=raw[String(level)]
    if(!record)continue
    const stars=int(record.stars,0,3,0)
    const bestScore=int(record.bestScore,0,10000,0)
    if(stars>0)records[level]={stars,bestScore}
  }
  return records
}
export function createProfile(name,id) {
  const label=safeName(name)
  if(label.length<2)throw new Error('Nama panggilan minimal 2 karakter.')
  if(!id||typeof id!=='string')throw new Error('ID pemain tidak valid.')
  return {id,name:label,unlockedLevel:1,records:{},active:null,createdAt:new Date().toISOString()}
}
export function sanitiseProfile(raw) {
  if(!raw || typeof raw!=='object'||typeof raw.id!=='string')return null
  const name=safeName(raw.name)
  if(name.length<2)return null
  const records=cleanRecords(raw.records)
  let unlockedLevel=1
  // Jangan percaya angka unlock yang korup / dimodifikasi saja:
  // level terbuka dari catatan kelulusan yang berurutan.
  while(unlockedLevel<TOTAL_LEVELS && records[unlockedLevel]?.stars>0)unlockedLevel++
  const profile={id:raw.id.slice(0,100),name,unlockedLevel,records,
    createdAt:typeof raw.createdAt==='string'?raw.createdAt:new Date().toISOString(),
    active:null}
  const a=raw.active
  if(a && typeof a==='object' && int(a.level,1,TOTAL_LEVELS,0) &&
     a.level<=unlockedLevel && int(a.round,1,ROUNDS_PER_LEVEL,0) &&
     int(a.correctCount,0,ROUNDS_PER_LEVEL,-1)>=0 &&
     int(a.score,0,10000,-1)>=0 && validateChallenge(a.challenge)){
    profile.active={
      level:a.level,round:a.round,score:a.score,correctCount:a.correctCount,
      challenge:a.challenge,feedback:a.feedback&&typeof a.feedback==='object'?a.feedback:null
    }
  }
  return profile
}
export function loadProfiles(storage) {
  try {
    const raw=JSON.parse(storage.getItem(STORAGE_KEY)||'[]')
    if(!Array.isArray(raw))return []
    const seen=new Set()
    return raw.slice(0,30).map(sanitiseProfile).filter(profile=>{
      if(!profile||seen.has(profile.id))return false
      seen.add(profile.id);return true
    })
  } catch {return []}
}
export function saveProfiles(storage,profiles) {
  storage.setItem(STORAGE_KEY,JSON.stringify(profiles))
}
export function validateChallenge(challenge) {
  if(!challenge||!Array.isArray(challenge.items)||challenge.items.length<2||challenge.items.length>5)return false
  const total=challenge.items.reduce((sum,item)=>{
    if(!item||typeof item.name!=='string'||!Number.isSafeInteger(item.unitPrice)||
       !Number.isSafeInteger(item.quantity)||item.unitPrice<100||
       item.quantity<1||item.quantity>3||
       item.subtotal!==item.unitPrice*item.quantity)return NaN
    return sum+item.subtotal
  },0)
  return Number.isSafeInteger(total)&&total===challenge.totalAmount&&
    Number.isSafeInteger(challenge.paidAmount)&&challenge.paidAmount>=total&&
    challenge.paidAmount<=2000000
}
export function createChallenge(level,round,catalog=FALLBACK_PRODUCTS,random) {
  const stage=difficultyForLevel(level)
  const basket=createPracticeBasket(catalog,stage,random)
  const id=(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')
    ?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2)
  return {id,round,level,difficulty:stage,items:basket.items,
    itemName:basket.items[0].name,
    quantity:basket.items[0].quantity,unitPrice:basket.items[0].unitPrice,
    totalAmount:basket.totalAmount,paidAmount:basket.paidAmount,
    attempts:0,resolved:false,expectedChange:null,wasCorrect:null}
}
export function startLevel(profile,level,catalog=FALLBACK_PRODUCTS,random) {
  if(!profile||!Number.isInteger(level)||level<1||level>TOTAL_LEVELS||
     level>profile.unlockedLevel)throw new Error('Level ini masih terkunci.')
  return {...profile,active:{level,round:1,score:0,correctCount:0,
    challenge:createChallenge(level,1,catalog,random),feedback:null}}
}
export function submitLocalAnswer(profile,answer) {
  const a=profile?.active,ch=a?.challenge
  if(!ch||ch.resolved||!Number.isSafeInteger(answer)||answer<0)
    throw new Error('Jawaban tidak valid.')
  const correct=answer===ch.paidAmount-ch.totalAmount
  const attempts=ch.attempts+1
  const resolved=correct||attempts>=3
  const points=correct?Math.max(5,20-(attempts-1)*5):0
  const result={
    correct,attemptCount:attempts,resolved,
    expectedChange:resolved?ch.paidAmount-ch.totalAmount:null,
    score:a.score+points,level:a.level,status:'active'
  }
  const nextChallenge={...ch,attempts,resolved,wasCorrect:resolved?correct:null,
    expectedChange:result.expectedChange}
  return {profile:{...profile,active:{...a,score:a.score+points,
    correctCount:a.correctCount+(correct?1:0),challenge:nextChallenge,feedback:result}},
    result}
}
export function advanceLocalRound(profile,catalog=FALLBACK_PRODUCTS,random) {
  const a=profile?.active
  if(!a||!a.challenge?.resolved)throw new Error('Selesaikan pelanggan ini dahulu.')
  if(a.round<ROUNDS_PER_LEVEL)return {...profile,active:{...a,round:a.round+1,
    challenge:createChallenge(a.level,a.round+1,catalog,random),feedback:null}}
  const passed=a.correctCount>=MIN_CORRECT_TO_PASS
  const stars=starsForCorrect(a.correctCount)
  const records={...profile.records}
  if(passed){
    const previous=records[a.level]
    records[a.level]={stars:Math.max(previous?.stars||0,stars),
      bestScore:Math.max(previous?.bestScore||0,a.score)}
  }
  const unlockedLevel=passed&&a.level===profile.unlockedLevel
    ?Math.min(TOTAL_LEVELS,a.level+1):profile.unlockedLevel
  return {...profile,unlockedLevel,records,active:null}
}
