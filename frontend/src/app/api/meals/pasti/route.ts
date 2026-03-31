import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'
const auth = (req: NextRequest): Record<string, string> => {
  const t = req.cookies.get('access_token')?.value
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString()
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/meals/pasti/${params ? `?${params}` : ''}`,
      { headers: auth(request), cache: 'no-store' },
    )
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
