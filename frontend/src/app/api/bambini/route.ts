import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

function authHeaders(request: NextRequest): Record<string, string> {
  const token = request.cookies.get('access_token')?.value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString()
  const url = `${BACKEND_URL}/api/v1/bambini/${params ? `?${params}` : ''}`

  try {
    const res = await fetch(url, {
      headers: authHeaders(request),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/bambini/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(request) },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
