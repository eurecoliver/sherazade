import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const body = await request.json()
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/consensi/revoca_tutti/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
