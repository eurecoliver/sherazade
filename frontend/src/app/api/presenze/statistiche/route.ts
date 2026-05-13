import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const anno = searchParams.get('anno') ?? ''
  const gruppo = searchParams.get('gruppo') ?? ''
  const qs = new URLSearchParams()
  if (anno) qs.set('anno', anno)
  if (gruppo) qs.set('gruppo', gruppo)

  try {
    const { res, newAccessToken } = await fetchBackend(
      request,
      `/api/v1/presenze/statistiche/${qs.toString() ? '?' + qs.toString() : ''}`,
      { method: 'GET' },
    )
    const data = await res.json()
    const response = NextResponse.json(data, { status: res.status })
    if (newAccessToken) response.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return response
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
