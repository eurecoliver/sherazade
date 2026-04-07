import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { res } = await fetchBackend(request, `/api/v1/bambini/${id}/`, { cache: 'no-store' } as RequestInit)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const contentType = request.headers.get('content-type') ?? ''
  try {
    const isMultipart = contentType.includes('multipart/form-data')
    const body = isMultipart ? await request.formData() : JSON.stringify(await request.json())
    const headers: Record<string, string> = isMultipart ? {} : { 'Content-Type': 'application/json' }
    const { res, newAccessToken } = await fetchBackend(request, `/api/v1/bambini/${id}/`, {
      method: 'PATCH',
      headers,
      body,
    })
    const nextRes = NextResponse.json(await res.json(), { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { res, newAccessToken } = await fetchBackend(request, `/api/v1/bambini/${id}/`, { method: 'DELETE' })
    if (res.status === 204) {
      const nextRes = new NextResponse(null, { status: 204 })
      if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
      return nextRes
    }
    const nextRes = NextResponse.json(await res.json(), { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
