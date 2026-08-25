import { requireAdmin } from '../../_lib/auth.js'
import { json, readJson } from '../../_lib/http.js'

export async function onRequestGet(context) {
  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  try {
    const categories = await auth.sql`
      SELECT id, name, description, is_active
      FROM categories
      WHERE is_active = true
      ORDER BY name ASC
    `

    return json({ ok: true, categories })
  } catch (error) {
    console.error('List categories failed', error)
    return json({ ok: false, error: 'Gagal mengambil kategori.' }, 500)
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  const body = await readJson(context.request)
  const name = String(body?.name || '').trim()
  const description = String(body?.description || '').trim()

  if (name.length < 2 || name.length > 60) {
    return json({ ok: false, error: 'Nama kategori harus 2–60 karakter.' }, 400)
  }

  try {
    const rows = await auth.sql`
      INSERT INTO categories(name, description)
      VALUES (${name}, ${description || null})
      RETURNING id, name, description, is_active
    `

    return json({ ok: true, category: rows[0] }, 201)
  } catch (error) {
    console.error('Create category failed', error)
    if (error?.code === '23505') {
      return json({ ok: false, error: 'Kategori tersebut sudah ada.' }, 409)
    }
    return json({ ok: false, error: 'Gagal membuat kategori.' }, 500)
  }
}
