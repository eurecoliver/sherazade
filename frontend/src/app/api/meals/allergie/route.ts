import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

function auth(req: NextRequest): Record<string, string> {
  const token = req.cookies.get('access_token')?.value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString()
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/meals/allergie/${params ? `?${params}` : ''}`,
      { headers: auth(request), cache: 'no-store' },
    )
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/meals/allergie/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(request) },
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
