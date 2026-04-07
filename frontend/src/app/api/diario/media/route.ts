import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString()
  try {
    const { res } = await fetchBackend(
      request,
      `/api/v1/diario/media/${params ? `?${params}` : ''}`,
      { cache: 'no-store' } as RequestInit,
    )
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Passa il FormData direttamente (multipart/form-data per file upload)
    const formData = await request.formData()
    const { res, newAccessToken } = await fetchBackend(request, '/api/v1/diario/media/', {
      method: 'POST',
      body: formData,
    })
    const nextRes = NextResponse.json(await res.json(), { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
