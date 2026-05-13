import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const { res, newAccessToken } = await fetchBackend(request, '/api/v1/auth/2fa/setup/', { method: 'GET' })
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) {
    response.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
  }
  return response
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { res, newAccessToken } = await fetchBackend(request, '/api/v1/auth/2fa/setup/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) {
    response.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
  }
  return response
}
