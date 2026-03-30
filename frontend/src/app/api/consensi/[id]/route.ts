import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

function authHeaders(request: NextRequest): Record<string, string> {
  const token = request.cookies.get('access_token')?.value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/consensi/${id}/`, {
      headers: authHeaders(request), cache: 'no-store',
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/consensi/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(request) },
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
