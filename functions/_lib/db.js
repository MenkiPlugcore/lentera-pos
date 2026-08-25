import { neon } from '@neondatabase/serverless'

export function getSql(env) {
  if (!env?.DATABASE_URL) {
    throw new Error('DATABASE_URL belum dikonfigurasi di Cloudflare.')
  }

  return neon(env.DATABASE_URL)
}
