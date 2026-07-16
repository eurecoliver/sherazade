import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { res, newAccessToken } = await fetchBackend(
    request,
    `/api/v1/pappe/preferenze-menu/${params.id}/`,
    { method: 'GET' },
  )
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
  return response
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const { res, newAccessToken } = await fetchBackend(
    request,
    `/api/v1/pappe/preferenze-menu/${params.id}/`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
  return response
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { res, newAccessToken } = await fetchBackend(
    request,
    `/api/v1/pappe/preferenze-menu/${params.id}/`,
    { method: 'DELETE' },
  )
  if (res.status === 204) {
    const response = new NextResponse(null, { status: 204 })
    if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
    return response
  }
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
  return response
}
