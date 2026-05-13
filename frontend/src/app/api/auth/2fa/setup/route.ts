import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  return fetchBackend(request, '/api/v1/auth/2fa/setup/', { method: 'GET' })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return fetchBackend(request, '/api/v1/auth/2fa/setup/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
