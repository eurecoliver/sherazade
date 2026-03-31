import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const params = request.nextUrl.searchParams.toString()
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/presenze/report_mensile/${params ? `?${params}` : ''}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' },
    )
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
