import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { res, newAccessToken } = await fetchBackend(request,
    `/api/v1/iscrizioni/richieste/${params.id}/approva/`, { method: 'POST', body: '{}',
      headers: { 'Content-Type': 'application/json' } })
  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  if (newAccessToken) response.cookies.set('access_token', newAccessToken, { httpOnly: true, path: '/' })
  return response
}
