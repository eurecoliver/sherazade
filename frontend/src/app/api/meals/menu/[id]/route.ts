import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'
const auth = (req: NextRequest): Record<string, string> => {
  const t = req.cookies.get('access_token')?.value
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/meals/menu/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth(request) },
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
