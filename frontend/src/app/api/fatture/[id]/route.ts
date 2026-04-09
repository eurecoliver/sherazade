import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { res, newAccessToken } = await fetchBackend(request, `/api/v1/fatture/${id}/`)
    const data = await res.json()
    const nextRes = NextResponse.json(data, { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { res, newAccessToken } = await fetchBackend(request, `/api/v1/fatture/${id}/`, { method: 'DELETE' })
    const nextRes = new NextResponse(null, { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
