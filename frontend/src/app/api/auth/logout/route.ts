import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  if (refreshToken && accessToken) {
    try {
      await fetch(`${BACKEND_URL}/api/v1/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh: refreshToken }),
      })
    } catch {
      // Continua anche se Django non risponde — i cookie vengono comunque cancellati
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('access_token')
  response.cookies.delete('refresh_token')
  return response
}
