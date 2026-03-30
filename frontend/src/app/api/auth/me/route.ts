import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ detail: 'Non autenticato.' }, { status: 401 })
  }

  let djangoRes: Response
  try {
    djangoRes = await fetch(`${BACKEND_URL}/api/v1/auth/me/`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json(
      { detail: 'Impossibile contattare il server.' },
      { status: 503 },
    )
  }

  const data = await djangoRes.json()
  return NextResponse.json(data, { status: djangoRes.status })
}
