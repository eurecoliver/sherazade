import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString()
  try {
    const { res, newAccessToken } = await fetchBackend(
      request,
      `/api/v1/presenze/storico-insegnanti/${params ? `?${params}` : ''}`,
      { cache: 'no-store' } as RequestInit,
    )
    const nextRes = NextResponse.json(await res.json(), { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore nel caricamento dello storico' }, { status: 503 })
  }
}
