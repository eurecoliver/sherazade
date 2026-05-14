import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

const BACKEND = process.env.BACKEND_URL || 'http://backend:8000'

export async function GET(request: NextRequest) {
  // Se l'utente ha il cookie (staff) → config completa; altrimenti → config pubblica
  const accessToken = request.cookies.get('access_token')?.value
  if (accessToken) {
    const { res, newAccessToken } = await fetchBackend(request, '/api/v1/iscrizioni/config/')
    const data = await res.json()
    const response = NextResponse.json(data, { status: res.status })
    if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
    return response
  }
  // Pubblico
  const res = await fetch(`${BACKEND}/api/v1/iscrizioni/richieste/config-pubblica/`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PATCH(request: NextRequest) {
  const { res, newAccessToken } = await fetchBackend(request,
    '/api/v1/iscrizioni/config/', { method: 'PATCH', body: await request.text(),
      headers: { 'Content-Type': 'application/json' } })
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
  return response
}
