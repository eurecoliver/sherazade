import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  const body = await request.json()
  // Usa NEXTAUTH_URL come URL pubblico (evita porta interna Docker nel link email)
  const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || request.headers.get('origin') || request.nextUrl.origin
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/password-reset/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, frontend_url: origin }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
