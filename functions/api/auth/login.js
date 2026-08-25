import { getSql } from '../../_lib/db.js'
import { createSession, sessionCookie } from '../../_lib/auth.js'
import { json, readJson } from '../../_lib/http.js'

export async function onRequestPost(context) {
  const body = await readJson(context.request)
  const username = String(body?.username || '').trim()
  const password = String(body?.password || '')

  if (!username || !password) {
    return json({ ok: false, error: 'Username dan password wajib diisi.' }, 400)
  }

  try {
    const sql = getSql(context.env)
    const rows = await sql`
      SELECT
        p.id,
        p.username,
        p.full_name,
        p.role,
        p.is_active,
        c.locked_until,
        (c.password_hash = crypt(${password}, c.password_hash)) AS password_valid
      FROM profiles p
      JOIN admin_credentials c ON c.profile_id = p.id
      WHERE lower(p.username) = lower(${username})
        AND p.role = 'admin'
      LIMIT 1
    `

    const user = rows[0]
    if (!user || !user.is_active) {
      return json({ ok: false, error: 'Username atau password salah.' }, 401)
    }

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      return json({ ok: false, error: 'Login sementara dikunci karena terlalu banyak percobaan. Coba lagi beberapa menit.' }, 429)
    }

    if (!user.password_valid) {
      await sql`
        UPDATE admin_credentials
        SET
          failed_attempts = failed_attempts + 1,
          locked_until = CASE
            WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes'
            ELSE locked_until
          END,
          updated_at = now()
        WHERE profile_id = ${user.id}
      `

      return json({ ok: false, error: 'Username atau password salah.' }, 401)
    }

    await sql`
      UPDATE admin_credentials
      SET
        failed_attempts = 0,
        locked_until = NULL,
        last_login_at = now(),
        updated_at = now()
      WHERE profile_id = ${user.id}
    `

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
      200,
      { 'Set-Cookie': sessionCookie(session.token) },
    )
  } catch (error) {
    console.error('Admin login failed', error)
    return json({ ok: false, error: 'Login admin gagal diproses.' }, 500)
  }
}
