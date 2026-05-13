import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function POST(request: NextRequest) {
  const body = await request.json()
  return fetchBackend(request, '/api/v1/auth/2fa/disable/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
