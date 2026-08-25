import { clearSessionCookie, deleteCurrentSession } from '../../_lib/auth.js'
import { getSql } from '../../_lib/db.js'
import { json } from '../../_lib/http.js'

export async function onRequestPost(context) {
  try {
    const sql = getSql(context.env)
    await deleteCurrentSession(context.request, sql)

    return json(
      { ok: true },
      200,
      { 'Set-Cookie': clearSessionCookie() },
    )
  } catch (error) {
    console.error('Admin logout failed', error)
    return json({ ok: false, error: 'Logout gagal diproses.' }, 500)
  }
}
