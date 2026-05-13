import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function POST(request: NextRequest) {
  const body = await request.json()

  let djangoRes: Response
  try {
    djangoRes = await fetch(`${BACKEND_URL}/api/v1/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json(
      { detail: 'Impossibile contattare il server.' },
      { status: 503 },
    )
  }

  const data = await djangoRes.json()

  if (!djangoRes.ok) {
    return NextResponse.json(data, { status: djangoRes.status })
  }

  // 2FA richiesto → passa il totp_session al frontend senza impostare cookie
  if (data.totp_required) {
    return NextResponse.json({ totp_required: true, totp_session: data.totp_session })
  }

  const response = NextResponse.json({
    role: data.role,
    user: data.user,
  })

  const cookieBase = {
    httpOnly: true,
    secure: false, // HTTP deployment — sicurezza garantita da httpOnly + sameSite
    sameSite: 'lax' as const,
    path: '/',
  }

  response.cookies.set('access_token', data.access, {
    ...cookieBase,
    maxAge: 60 * 60, // 1 hour
  })
  response.cookies.set('refresh_token', data.refresh, {
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return response
}
