import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString()
  try {
    const { res, newAccessToken } = await fetchBackend(
      request, `/api/v1/fatture/${params ? `?${params}` : ''}`,
    )
    const data = await res.json()
    const nextRes = NextResponse.json(data, { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const { res, newAccessToken } = await fetchBackend(request, '/api/v1/fatture/', {
      method: 'POST',
      body: formData,
    })
    const data = res.status === 204 ? null : await res.json()
    const nextRes = NextResponse.json(data, { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
