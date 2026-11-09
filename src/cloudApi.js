// Cloud mode: React and API share one Worker origin. Database URL is never exposed.
export const IS_CLOUD = import.meta.env?.VITE_POS_MODE === 'cloud'

export async function cloudApiFetch(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  let result = null
  try { result = await response.json() } catch { /* server/hosting not ready */ }
  if (!response.ok) {
    throw new Error(result?.error || (response.status === 404
      ? 'API cloud belum tersedia. Pastikan situs di-deploy melalui Cloudflare Worker.'
      : 'Permintaan ke server gagal (' + response.status + ').'))
  }
  return result
}
