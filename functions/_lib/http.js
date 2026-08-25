export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = cookieHeader.split(';')

  for (const rawCookie of cookies) {
    const [rawName, ...rawValue] = rawCookie.trim().split('=')
    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='))
    }
  }

  return null
}

export function getPathParam(context, name) {
  return context?.params?.[name] || null
}
