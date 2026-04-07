import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString()
  try {
    const { res } = await fetchBackend(
      request,
      `/api/v1/bambini/${params ? `?${params}` : ''}`,
      { cache: 'no-store' } as RequestInit,
    )
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''
  try {
    const isMultipart = contentType.includes('multipart/form-data')
    const body = isMultipart ? await request.formData() : JSON.stringify(await request.json())
    const headers = isMultipart ? {} : { 'Content-Type': 'application/json' }
    const { res, newAccessToken } = await fetchBackend(request, '/api/v1/bambini/', {
      method: 'POST',
      headers,
      body,
    })
    const nextRes = NextResponse.json(await res.json(), { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
