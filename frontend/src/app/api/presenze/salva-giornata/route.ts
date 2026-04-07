import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function POST(request: NextRequest) {
  const body = await request.json()
  try {
    const { res, newAccessToken } = await fetchBackend(
      request,
      '/api/v1/presenze/salva_giornata/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    const nextRes = NextResponse.json(await res.json(), { status: res.status })
    if (newAccessToken) {
      nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    }
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
