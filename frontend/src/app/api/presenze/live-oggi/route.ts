import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  try {
    const { res, newAccessToken } = await fetchBackend(request, '/api/v1/presenze/live-oggi/', { method: 'GET' })
    const data = await res.json()
    const response = NextResponse.json(data, { status: res.status })
    if (newAccessToken) response.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return response
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
