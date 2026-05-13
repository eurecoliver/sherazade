import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const data = searchParams.get('data') ?? ''
  const gruppo = searchParams.get('gruppo') ?? ''
  const qs = new URLSearchParams()
  if (data) qs.set('data', data)
  if (gruppo) qs.set('gruppo', gruppo)

  try {
    const { res, newAccessToken } = await fetchBackend(
      request,
      `/api/v1/presenze/storico-qr/${qs.toString() ? '?' + qs.toString() : ''}`,
      { method: 'GET' },
    )
    const nextRes = NextResponse.json(await res.json(), { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
