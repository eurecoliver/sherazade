import { NextRequest } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60,
}

/**
 * Chiama il backend Django con il token JWT dal cookie.
 * Se riceve 401 e il refresh_token è valido, rinnova automaticamente
 * l'access_token e riprova la richiesta originale.
 *
 * Restituisce { res, newAccessToken? } — se newAccessToken è presente
 * il chiamante deve settarlo come cookie sulla risposta NextResponse.
 */
export async function fetchBackend(
  request: NextRequest,
  path: string,
  options: RequestInit = {},
): Promise<{ res: Response; newAccessToken?: string }> {
  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  const call = (token: string | undefined) =>
    fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

  let res = await call(accessToken)

  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${BACKEND_URL}/api/v1/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    if (refreshRes.ok) {
      const { access } = await refreshRes.json()
      res = await call(access)
      return { res, newAccessToken: access }
    }
  }

  return { res }
}

export { COOKIE_OPTIONS }
