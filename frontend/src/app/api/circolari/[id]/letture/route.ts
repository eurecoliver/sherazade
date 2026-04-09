import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { res } = await fetchBackend(
      request,
      `/api/v1/circolari/${params.id}/letture/`,
      { cache: 'no-store' } as RequestInit,
    )
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
