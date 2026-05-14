import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { res, newAccessToken } = await fetchBackend(
      request,
      `/api/v1/colloqui/sessioni/${params.id}/toggle-aperto/`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    const nextRes = NextResponse.json(await res.json(), { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
