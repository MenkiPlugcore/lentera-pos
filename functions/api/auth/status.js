import { getSql } from '../../_lib/db.js'
import { getCurrentAdmin } from '../../_lib/auth.js'
import { json } from '../../_lib/http.js'

export async function onRequestGet(context) {
  try {
    const sql = getSql(context.env)
    const [countRow] = await sql`
      SELECT count(*)::int AS total
      FROM admin_credentials c
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.role = 'admin'
    `

    const user = await getCurrentAdmin(context.request, context.env, sql)

    return json({
      ok: true,
      setupRequired: countRow.total === 0,
      authenticated: Boolean(user),
      user: user
        ? {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
          }
        : null,
    })
  } catch (error) {
    console.error('Auth status failed', error)
    return json({ ok: false, error: 'Gagal membaca status admin.' }, 500)
  }
}
