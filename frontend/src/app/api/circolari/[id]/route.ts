import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { res } = await fetchBackend(request, `/api/v1/circolari/${params.id}/`, { cache: 'no-store' } as RequestInit)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const contentType = request.headers.get('content-type') ?? ''
  try {
    let body: BodyInit
    let headers: Record<string, string> = {}

    if (contentType.includes('multipart/form-data')) {
      body = await request.formData()
    } else {
      body = JSON.stringify(await request.json())
      headers['Content-Type'] = 'application/json'
    }

    const { res, newAccessToken } = await fetchBackend(request, `/api/v1/circolari/${params.id}/`, {
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { res, newAccessToken } = await fetchBackend(request, `/api/v1/circolari/${params.id}/`, { method: 'DELETE' })
    const nextRes = NextResponse.json(
      res.status === 204 ? {} : await res.json(),
      { status: res.status },
    )
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
