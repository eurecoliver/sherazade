import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  const body = await request.json()
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/2fa/verify/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }
    // Imposta i cookie JWT come nel login normale
    const response = NextResponse.json({
      role: data.role,
      user: data.user,
    })
    response.cookies.set('access_token', data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    })
    response.cookies.set('refresh_token', data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
