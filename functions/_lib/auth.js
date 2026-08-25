import { getSql } from './db.js'
import { getCookie, json } from './http.js'

const SESSION_COOKIE = 'lp_session'
const SESSION_DAYS = 7
const PASSWORD_ITERATIONS = 210000

function bytesToBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function randomBytes(length) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

async function derivePasswordHash(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    key,
    256,
  )

  return new Uint8Array(bits)
}

async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToBase64Url(new Uint8Array(digest))
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false
  let result = 0
  for (let index = 0; index < left.length; index += 1) {
    result |= left[index] ^ right[index]
  }
  return result === 0
}

export async function hashPassword(password) {
  const saltBytes = randomBytes(16)
  const hashBytes = await derivePasswordHash(password, saltBytes, PASSWORD_ITERATIONS)

  return {
    hash: bytesToBase64Url(hashBytes),
    salt: bytesToBase64Url(saltBytes),
    iterations: PASSWORD_ITERATIONS,
  }
}

export async function verifyPassword(password, storedHash, storedSalt, iterations) {
  const expected = base64UrlToBytes(storedHash)
  const actual = await derivePasswordHash(password, base64UrlToBytes(storedSalt), iterations)
  return timingSafeEqual(actual, expected)
}

export async function createSession(sql, profileId) {
  const token = bytesToBase64Url(randomBytes(32))
  const tokenHash = await sha256Base64Url(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await sql`DELETE FROM auth_sessions WHERE expires_at <= now()`
  await sql`
    INSERT INTO auth_sessions(profile_id, token_hash, expires_at)
    VALUES (${profileId}, ${tokenHash}, ${expiresAt})
  `

  return { token, expiresAt }
}

export function sessionCookie(token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

export async function deleteCurrentSession(request, sql) {
  const token = getCookie(request, SESSION_COOKIE)
  if (!token) return
  const tokenHash = await sha256Base64Url(token)
  await sql`DELETE FROM auth_sessions WHERE token_hash = ${tokenHash}`
}

export async function getCurrentAdmin(request, env, existingSql = null) {
  const token = getCookie(request, SESSION_COOKIE)
  if (!token) return null

  const sql = existingSql || getSql(env)
  const tokenHash = await sha256Base64Url(token)
  const rows = await sql`
    SELECT
      p.id,
      p.username,
      p.full_name,
      p.role,
      s.id AS session_id,
      s.expires_at
    FROM auth_sessions s
    JOIN profiles p ON p.id = s.profile_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > now()
      AND p.is_active = true
      AND p.role = 'admin'
    LIMIT 1
  `

  return rows[0] || null
}

export async function requireAdmin(context) {
  try {
    const sql = getSql(context.env)
    const profile = await getCurrentAdmin(context.request, context.env, sql)

    if (!profile) {
      return { error: json({ ok: false, error: 'Sesi admin tidak valid atau sudah berakhir.' }, 401) }
    }

    return { sql, profile }
  } catch (error) {
    console.error('Admin auth check failed', error)
    return { error: json({ ok: false, error: 'Gagal memverifikasi sesi admin.' }, 500) }
  }
}
