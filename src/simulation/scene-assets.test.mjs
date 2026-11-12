import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CUSTOMERS } from './customerProfiles.js'

test('eleven customers include four new guest characters with transparent assets', () => {
  assert.equal(CUSTOMERS.length, 11)
  assert.equal(new Set(CUSTOMERS.map(c => c.imageUrl)).size, 11)
  const fantasy=new Set(['milo','boo','rubi','aura','wiwi','buahlul','mulyana','megamom'])
  for (const customer of CUSTOMERS) {
    assert.match(customer.imageUrl, /^https:\/\/res\.cloudinary\.com\/dvds41ivm\/image\/upload\/e_(?:make_transparent:15|background_removal)\/f_png\/v\d+\/lentera-pos\/customers\//)
    if (fantasy.has(customer.id)) {
      assert.ok(customer.imageUrl.includes('/e_background_removal/f_png/'), customer.id+' must use subject-aware background extraction')
      assert.ok(!customer.imageUrl.includes('e_make_transparent'),customer.id+' should not key out white costume/body parts')
    }
  }
})

test('store scene layers desk in front of customer instead of flattening the art', () => {
  const code=readFileSync(new URL('./StoreScene.jsx', import.meta.url), 'utf8')
  assert.match(code, /className="game-store-background"/)
  assert.match(code, /game-store-character--/)
  assert.match(code, /className="game-store-foreground"/)
  const stylesheet=readFileSync(new URL('./arcade.css', import.meta.url), 'utf8')
  assert.match(stylesheet, /\.game-store-art--custom \.game-store-character img\s*\{[\s\S]*?mix-blend-mode: normal/)
  assert.match(stylesheet, /\.game-store-art--custom \.game-store-foreground\s*\{/)
})

test('customer is positioned behind the foreground counter on desktop and mobile', () => {
  const stylesheet=readFileSync(new URL('./arcade.css', import.meta.url), 'utf8')
  assert.match(stylesheet, /v1\.3\.2 — Customer stands BEHIND the checkout counter/)
  const tail=stylesheet.split('v1.3.2 — Customer stands BEHIND the checkout counter')[1]
  assert.match(tail, /\.arcade-play-layout \.game-store-art--custom \.game-store-character\s*\{[^}]*bottom:\s*25%;[^}]*height:\s*55%/s)
  assert.match(tail, /\.game-store-art--custom \.game-store-foreground\s*\{[^}]*mask-image:\s*linear-gradient\(to bottom,[^;]*transparent 59%, black 70%/s)
  assert.match(tail, /@media \(max-width:\s*520px\)/)
})
