import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const css=readFileSync(new URL('./simulation/mobileScene.css',import.meta.url),'utf8')
const arcade=readFileSync(new URL('./simulation/arcade.css',import.meta.url),'utf8')
const game=readFileSync(new URL('./simulation/VisualCustomerPage.jsx',import.meta.url),'utf8')

test('mobile scene uses a dedicated stylesheet imported after arcade rules',()=>{
  const imports=game.match(/import '\.\/(?:arcade|mobileScene)\.css'/g)
  assert.deepEqual(imports,["import './arcade.css'","import './mobileScene.css'"])
  assert.match(css,/@media \(max-width: 960px\)/)
  assert.doesNotMatch(arcade,/v1\.4\.1: Mobile UI is a vertical stack/)
})

test('storefront occupies its own region instead of an absolute overlay',()=>{
  assert.match(css,/\.arcade-play-layout \.arcade-stage > \.game-store-art\s*\{[^}]*position: relative;[^}]*height: auto;[^}]*aspect-ratio: 1\.25 \/ 1;/s)
  assert.match(css,/\.arcade-play-layout \.arcade-stage\s*\{[^}]*display: flex;[^}]*flex-direction: column;[^}]*height: auto;[^}]*aspect-ratio: auto;[^}]*overflow: visible;/s)
  assert.match(css,/\.arcade-play-layout \.arcade-stage > \.arcade-scene-vignette\s*\{[^}]*display: none;/s)
  assert.match(css,/\.game-store-background,[\s\S]*\.game-store-foreground\s*\{[^}]*transform: scale\(1\.23\);/s)
})

test('HUD, customer speech, basket and actions are normal-flow stacked elements',()=>{
  const flow=[['arcade-hud',0],['arcade-dialogue',2],['arcade-order-board',3],['arcade-scene-actions',4]]
  for(const [className,order] of flow){
    const pattern=new RegExp('\\.arcade-play-layout \\.arcade-stage > \\.'+className+'\\s*\\{([^}]+)\\}','s')
    const block=css.match(pattern)?.[1]
    assert.ok(block,className+' mobile style is present')
    assert.match(block,new RegExp('order:\\s*'+order+';'))
    assert.match(block,/position: relative;/)
  }
  assert.match(css,/\.arcade-play-layout \.arcade-stage > \.game-store-art\s*\{[^}]*order: 1;/s)
  assert.match(css,/\.arcade-play-layout \.arcade-stage > \.arcade-dialogue::after\s*\{[^}]*display: none;/s)
  assert.match(css,/\.arcade-play-layout \.arcade-order-board \.game-basket-list\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s)
})

test('money drawer and calculator remain functional in the mobile stack',()=>{
  assert.match(css,/\.arcade-play-layout \.arcade-scene-actions > \.arcade-open-drawer,/)
  assert.match(css,/\.arcade-play-layout \.arcade-scene-actions > \.arcade-open-calculator\s*\{[^}]*min-height: 56px;/s)
  assert.match(game,/aria-controls="arcade-money"/)
  assert.match(game,/aria-controls="arcade-subtraction-slide"/)
  assert.match(game,/onClick=\{\(\) => setCashDrawerOpen\(true\)\}/)
  assert.match(game,/onClick=\{\(\) => setCalculatorOpen\(true\)\}/)
  assert.match(game,/<BasketList items=\{items\} variant="scene"\/>/)
  assert.match(css,/@media \(max-width: 520px\)/)
  assert.match(css,/@media \(max-width: 350px\)/)
})

test('desktop original overlays are untouched',()=>{
  assert.match(arcade,/\.arcade-hud\s*\{[\s\S]*?position:absolute;/)
  assert.match(arcade,/\.arcade-order-board\s*\{[\s\S]*?position:absolute;/)
  assert.match(arcade,/\.arcade-dialogue\s*\{[\s\S]*?position:absolute;/)
  assert.ok(css.trimStart().startsWith('/* LENTERA POS v1.4.2'))
  assert.equal(css.includes('@media (min-width: 961px)'),false)
})
