import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { res, newAccessToken } = await fetchBackend(request,
    `/api/v1/iscrizioni/richieste/${params.id}/`)
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
  return response
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { res, newAccessToken } = await fetchBackend(request,
    `/api/v1/iscrizioni/richieste/${params.id}/`, {
      method: 'PATCH', body: await request.text(),
      headers: { 'Content-Type': 'application/json' },
    })
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
  return response
}
