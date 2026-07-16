import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const params = new URLSearchParams()
  if (searchParams.get('bambino')) params.set('bambino', searchParams.get('bambino')!)

  const { res, newAccessToken } = await fetchBackend(
    request,
    `/api/v1/pappe/preferenze-menu/?${params}`,
    { method: 'GET' },
  )
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
  return response
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { res, newAccessToken } = await fetchBackend(
    request,
    '/api/v1/pappe/preferenze-menu/',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
  return response
}
