import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CUSTOMERS } from './customerProfiles.js'

test('all three game customer artworks use transparent Cloudinary derivatives', () => {
  assert.equal(CUSTOMERS.length, 3)
  assert.equal(new Set(CUSTOMERS.map(c => c.imageUrl)).size, 3)
  for (const customer of CUSTOMERS) {
    assert.match(customer.imageUrl, /^https:\/\/res\.cloudinary\.com\/dvds41ivm\/image\/upload\/e_make_transparent:15\/f_png\/v\d+\/lentera-pos\/customers\//)
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
