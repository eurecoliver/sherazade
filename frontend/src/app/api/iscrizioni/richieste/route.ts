import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

const BACKEND = process.env.BACKEND_URL || 'http://backend:8000'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const qs = searchParams.toString()
  const { res, newAccessToken } = await fetchBackend(request,
    `/api/v1/iscrizioni/richieste/${qs ? '?' + qs : ''}`)
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
  return response
}

export async function POST(request: NextRequest) {
  // POST pubblico — niente auth
  const body = await request.text()
  const res = await fetch(`${BACKEND}/api/v1/iscrizioni/richieste/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
