import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { res, newAccessToken } = await fetchBackend(
      req,
      `/api/v1/presenze/elimina-presenza-insegnante/${params.id}/`,
      { method: 'DELETE' },
    )

    if (res.status === 204) {
      const nextRes = new NextResponse(null, { status: 204 })
      if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
      return nextRes
    }

    let payload: unknown
    try {
      payload = await res.json()
    } catch {
      payload = { detail: `Errore HTTP ${res.status}` }
    }
    const nextRes = NextResponse.json(payload, { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch (error) {
    return NextResponse.json(
      { detail: 'Errore nell\'eliminazione', error: error instanceof Error ? error.message : 'unknown' },
      { status: 503 },
    )
  }
}
