import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const visual = readFileSync(new URL('./simulation/VisualCustomerPage.jsx',import.meta.url),'utf8')
const tray = readFileSync(new URL('./simulation/MoneyTray.jsx',import.meta.url),'utf8')
const css = readFileSync(new URL('./simulation/arcade.css',import.meta.url),'utf8')

test('gameplay shows only compact critical information and keeps screen-reader heading',()=>{
  assert.match(visual, /\{!session && <header className="arcade-page-heading">/)
  assert.match(visual, /session && <h1 className="sr-only">Simulasi Pelanggan<\/h1>/)
  assert.match(visual, /<div className="arcade-order-title">/)
  assert.match(visual, /Total belanja/)
  assert.match(visual, /Uang diterima/)
  assert.doesNotMatch(visual, /LANGKAH 1 · LIHAT PESANAN|SUDUT PANDANG KASIR · TOKO LENTERA|Mode latihan saja\. Tidak ada pengurangan stok/)
})
test('speech bubble does not duplicate transaction amount before feedback',()=>{
  assert.match(visual, /feedback \? customerDialogue\(customer, challenge, feedback\) : customer\.greeting/)
})
test('mobile cash drawer has transaction summary, desktop keeps scene summary',()=>{
  assert.match(visual, /arcade-essentials arcade-essentials--mobile-only/)
  assert.match(css, /\.arcade-play-layout \.arcade-essentials--mobile-only \{ display: none; \}/)
  assert.match(css, /@media \(max-width: 960px\)[\s\S]*?\.arcade-play-layout \.arcade-essentials--mobile-only \{\s*display: grid;/)
})
test('compact tray keeps undo and submission, hides empty basket box',()=>{
  assert.match(tray, /\(!compact \|\| count > 0\) && <section/)
  assert.match(tray, /'Urungkan' : 'Batalkan Terakhir'/)
  assert.match(tray, /'Serahkan'/)
  assert.match(tray, /aria-label="Uang pas tanpa kembalian, Rp0"/)
})
