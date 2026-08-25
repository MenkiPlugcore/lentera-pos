import { neon } from '@neondatabase/serverless'

export async function onRequestGet(context) {
  const databaseUrl = context.env.DATABASE_URL

  if (!databaseUrl) {
    return Response.json(
      { ok: false, error: 'DATABASE_URL belum dikonfigurasi di Cloudflare.' },
      { status: 500 },
    )
  }

  try {
    const sql = neon(databaseUrl)
    const [row] = await sql`
      SELECT
        current_database() AS database,
        now() AS server_time
    `

    return Response.json({
      ok: true,
      database: row.database,
      serverTime: row.server_time,
    })
  } catch (error) {
    console.error('Database health check failed', error)

    return Response.json(
      { ok: false, error: 'Gagal terhubung ke database.' },
      { status: 500 },
    )
  }
}
