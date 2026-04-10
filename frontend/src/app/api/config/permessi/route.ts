import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString()
  try {
    const { res } = await fetchBackend(
      request,
      `/api/v1/config/permessi/${params ? `?${params}` : ''}`,
      { cache: 'no-store' } as RequestInit,
    )
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
