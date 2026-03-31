import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const params = request.nextUrl.searchParams.toString()
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/diario/media/${params ? `?${params}` : ''}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      },
    )
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  try {
    // Passa il FormData direttamente (multipart/form-data per file upload)
    const formData = await request.formData()
    const res = await fetch(`${BACKEND_URL}/api/v1/diario/media/`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
