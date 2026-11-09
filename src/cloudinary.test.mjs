import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cloudinaryUpload, verifyProductImageUrl } from '../worker/index.js'

const env = {
  CLOUDINARY_CLOUD_NAME: 'jwuwqhjv',
  CLOUDINARY_API_KEY: 'test-api-key',
  CLOUDINARY_API_SECRET: 'test-api-secret',
}
const mediaUrl = 'https://res.cloudinary.com/jwuwqhjv/image/upload/v123456789/lentera-pos/products/example.jpg'

test('accepts matching Cloudinary product URLs and unchanged legacy images', () => {
  assert.equal(verifyProductImageUrl(mediaUrl, env), mediaUrl)
  assert.equal(verifyProductImageUrl('data:image/png;base64,SGk=', env), 'data:image/png;base64,SGk=')
  const external = 'https://example.com/legacy-product-image.png'
  assert.equal(verifyProductImageUrl(external,env,external),external)
})

test('rejects arbitrary URLs, other Cloudinary clouds and untrusted image protocols', () => {
  for (const url of [
    'http://res.cloudinary.com/jwuwqhjv/image/upload/v123/lentera-pos/products/x.png',
    'https://example.com/xxx.jpg',
    'https://res.cloudinary.com/othercloud/image/upload/v123/lentera-pos/products/x.jpg',
    'https://res.cloudinary.com/jwuwqhjv/image/upload/v123/other-folder/x.jpg',
    'data:image/svg+xml;base64,SGk=',
  ]) assert.throws(() => verifyProductImageUrl(url,env))
})

test('creates a signed backend request without revealing API Secret or uploading to other folders', async () => {
  const originalFetch = globalThis.fetch
  let called = false
  globalThis.fetch = async (url, init) => {
    called = true
    assert.equal(url,'https://api.cloudinary.com/v1_1/jwuwqhjv/image/upload')
    assert.equal(init.method,'POST')
    assert.equal(init.body.get('file'),'data:image/jpeg;base64,SGVsbG8=')
    assert.equal(init.body.get('api_key'),env.CLOUDINARY_API_KEY)
    const signed = ['folder','overwrite','timestamp','unique_filename']
      .map(k => k+'='+init.body.get(k)).join('&')
    assert.equal(init.body.get('folder'),'lentera-pos/products')
    assert.equal(init.body.get('overwrite'),'false')
    assert.equal(init.body.get('unique_filename'),'true')
    assert.equal(init.body.get('signature'),
      createHash('sha1').update(signed+env.CLOUDINARY_API_SECRET).digest('hex'))
    assert.ok(![...init.body.values()].includes(env.CLOUDINARY_API_SECRET))
    return new Response(JSON.stringify({secure_url:mediaUrl,public_id:'lentera-pos/products/example'}), {
      status:200,
      headers:{'content-type':'application/json'},
    })
  }
  try {
    const result=await cloudinaryUpload(env,'data:image/jpeg;base64,SGVsbG8=')
    assert.equal(called,true)
    assert.deepEqual(result,{imageUrl:mediaUrl,publicId:'lentera-pos/products/example'})
  } finally {
    globalThis.fetch=originalFetch
  }
})

test('rejects uploads when Cloudinary secrets are missing', async () => {
  await assert.rejects(
    cloudinaryUpload({ CLOUDINARY_CLOUD_NAME:'jwuwqhjv'},'data:image/png;base64,SGk='),
    /belum siap/
  )
})
