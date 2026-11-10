import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  addToCart,checkoutDemo,normalizeCashInput,displayCashInput,
  getCashChange,formatRupiah,
} from './publicCashier.js'
import { createReceiptPdf,receiptPdfFilename } from './receiptPdf.js'

const book={id:'book',name:'Buku Tulis',sellingPrice:6000}
const drink={id:'mineral',name:'Air Mineral',sellingPrice:5000}
const receipt=()=>{
  let cart=[]
  for(let i=0;i<5;i++)cart=addToCart(cart,drink)
  cart=addToCart(cart,book)
  return checkoutDemo(cart,50000,new Date('2026-11-10T02:05:00Z'),'LAT-001')
}

test('formatted Rupiah 50.000 passes numeric cashier calculations',()=>{
  assert.equal(normalizeCashInput('50.000'),'50000')
  assert.equal(normalizeCashInput('Rp 50.000'),'50000')
  assert.equal(normalizeCashInput('50,000'),'50000')
  assert.equal(displayCashInput('50000'),'50.000')
  assert.equal(displayCashInput('Rp 50.000'),'50.000')
  assert.equal(getCashChange(25000,Number(normalizeCashInput('50.000'))).change,25000)
})
test('payment input uses text + numeric keyboard, without incompatible HTML pattern',()=>{
  const page=readFileSync(new URL('./PublicCashierPage.jsx',import.meta.url),'utf8')
  const payment=page.match(/<input id="pc-payment"[\s\S]*?\/>/)
  assert.ok(payment)
  assert.match(payment[0],/type="text" inputMode="numeric"/)
  assert.match(payment[0],/value=\{displayCashInput\(paidRaw\)\}/)
  assert.match(payment[0],/setPaidRaw\(normalizeCashInput\(e\.target\.value\)\)/)
  assert.doesNotMatch(payment[0],/\bpattern=/)
  assert.match(page,/Selesaikan\s*<\/button>/)
})
test('receipt PDF uses correct 80mm printable page, contains total cash change',()=>{
  const r=receipt()
  assert.equal(r.totalAmount,31000)
  assert.equal(r.paidAmount,50000)
  assert.equal(r.changeAmount,19000)
  const bytes=createReceiptPdf(r)
  assert.ok(bytes instanceof Uint8Array)
  const src=new TextDecoder().decode(bytes)
  assert.match(src,/^%PDF-1\.4/)
  assert.match(src,/\/MediaBox \[0 0 226\.77 \d+\]/)
  assert.match(src,/LENTERA POS/)
  assert.match(src,/STRUK LATIHAN/)
  assert.match(src,/BUKAN TRANSAKSI ASLI/)
  assert.match(src,/Buku Tulis/)
  assert.match(src,/Air Mineral/)
  assert.match(src,/50\.000/)
  assert.match(src,/31\.000/)
  assert.match(src,/19\.000/)
  assert.match(src,/\/BaseFont \/Courier-Bold/)
  assert.match(src,/%%EOF\s*$/)
  assert.equal(receiptPdfFilename(r),'LenteraPOS-Struk-LAT-001.pdf')
})
test('PDF xref offsets point to real PDF objects and byte lengths match',()=>{
  const data=createReceiptPdf(receipt())
  const content=new TextDecoder().decode(data)
  const xrefStart=Number(content.match(/startxref\n(\d+)/)[1])
  assert.equal(content.slice(xrefStart,xrefStart+5),'xref\n')
  const offsets=Array.from(content.matchAll(/^(\d{10}) 00000 n $/gm),m=>Number(m[1]))
  assert.equal(offsets.length,6)
  for(let i=0;i<offsets.length;i++){
    const prefix=new TextDecoder().decode(data.slice(offsets[i],offsets[i]+12))
    assert.match(prefix,new RegExp('^'+(i+1)+' 0 obj'))
  }
  const size=Number(content.match(/<< \/Length (\d+) >>\nstream\n/)[1])
  const streamStart=content.indexOf('stream\n')+'stream\n'.length
  const streamEnd=content.indexOf('endstream',streamStart)
  assert.ok(streamStart>0 && streamEnd>streamStart)
  const raw=content.slice(streamStart,streamEnd)
  assert.equal(new TextEncoder().encode(raw).length,size)
})
test('long names and parentheses are encoded safely in PDF receipt',()=>{
  const r=checkoutDemo([{
    id:'a',name:'Biskuit (Cokelat) \\ Edisi Panjang Sangat Panjang',
    qty:1,unitPrice:4000,
  }],10000,new Date('2026-11-10T01:00:00Z'),'LAT-(02)')
  const src=new TextDecoder().decode(createReceiptPdf(r))
  assert.match(src,/Biskuit \\\(Cokelat\\\)/)
  assert.match(src,/6\.000/)
  assert.equal(receiptPdfFilename(r),'LenteraPOS-Struk-LAT--02-.pdf')
})
test('receipt preview and actions are built from the same completed transaction',()=>{
  const page=readFileSync(new URL('./PublicCashierPage.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('./publicCashierGallery.css',import.meta.url),'utf8')
  assert.match(page,/function ReceiptDetails\(\{receipt\}\)/)
  assert.match(page,/<ReceiptDetails receipt=\{receipt\}\/>/)
  assert.match(page,/className="pc-print-stage"/)
  assert.match(page,/onClick=\{printReceipt\}>Cetak struk/)
  assert.match(page,/onClick=\{downloadReceipt\}>Unduh PDF/)
  assert.match(page,/onClick=\{copyReceipt\}>Salin/)
  assert.match(page,/window\.print\(\)/)
  assert.match(page,/createReceiptPdf\(receipt\)/)
  assert.match(page,/new Blob\(\[pdf\],\{type:'application\/pdf'\}\)/)
  assert.match(page,/anchor\.download=receiptPdfFilename\(receipt\)/)
  assert.match(css,/@media print/)
  assert.match(css,/\.pc-print-stage \{\s*display:block!important;/)
  assert.doesNotMatch(page,/\/api\/checkout|\/api\/transactions/)
})
