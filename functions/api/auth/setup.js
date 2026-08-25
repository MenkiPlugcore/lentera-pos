import { getSql } from '../../_lib/db.js'
import { createSession, hashPassword, sessionCookie } from '../../_lib/auth.js'
import { json, readJson } from '../../_lib/http.js'

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/

export async function onRequestPost(context) {
  const body = await readJson(context.request)
  const fullName = String(body?.fullName || '').trim()
  const username = String(body?.username || '').trim()
  const password = String(body?.password || '')

  if (fullName.length < 3 || fullName.length > 80) {
    return json({ ok: false, error: 'Nama admin harus 3–80 karakter.' }, 400)
  }

  if (!USERNAME_PATTERN.test(username)) {
    return json({ ok: false, error: 'Username harus 3–32 karakter dan hanya memakai huruf, angka, titik, garis bawah, atau strip.' }, 400)
  }

  if (password.length < 10 || password.length > 128) {
    return json({ ok: false, error: 'Password admin minimal 10 karakter.' }, 400)
  }

  try {
    const sql = getSql(context.env)
    const passwordData = await hashPassword(password)

    const rows = await sql`
      WITH bootstrap_claim AS (
        INSERT INTO app_settings(key, value)
        SELECT 'admin_initialized', jsonb_build_object('created_at', now())
        WHERE NOT EXISTS (SELECT 1 FROM admin_credentials)
        ON CONFLICT (key) DO NOTHING
        RETURNING key
      ),
      new_profile AS (
        INSERT INTO profiles(username, full_name, role, is_active)
        SELECT ${username}, ${fullName}, 'admin', true
        FROM bootstrap_claim
        RETURNING id, username, full_name, role
      ),
      new_credential AS (
        INSERT INTO admin_credentials(
          profile_id,
          password_hash,
          password_salt,
          password_iterations
        )
        SELECT
          id,
          ${passwordData.hash},
          ${passwordData.salt},
          ${passwordData.iterations}
        FROM new_profile
        RETURNING profile_id
      )
      SELECT p.id, p.username, p.full_name, p.role
      FROM new_profile p
      JOIN new_credential c ON c.profile_id = p.id
    `

    const user = rows[0]
    if (!user) {
      return json({ ok: false, error: 'Admin pertama sudah pernah dibuat. Silakan login.' }, 409)
    }

    const session = await createSession(sql, user.id)

    return json(
      {
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
        },
      },
      201,
      { 'Set-Cookie': sessionCookie(session.token) },
    )
  } catch (error) {
    console.error('Initial admin setup failed', error)

    if (error?.code === '23505') {
      return json({ ok: false, error: 'Username tersebut sudah digunakan.' }, 409)
    }

    return json({ ok: false, error: 'Gagal membuat admin pertama.' }, 500)
  }
}
