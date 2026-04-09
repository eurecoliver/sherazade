import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { res, newAccessToken } = await fetchBackend(
      request,
      `/api/v1/circolari/${params.id}/segna-letta/`,
      { method: 'POST' },
    )
    const nextRes = NextResponse.json(await res.json(), { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
