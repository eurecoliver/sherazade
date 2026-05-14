import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const { res } = await fetchBackend(
      request,
      `/api/v1/bambini/${id}/export-gdpr/`,
      { cache: 'no-store' } as RequestInit,
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({ detail: 'Errore server.' }))
      return NextResponse.json(data, { status: res.status })
    }
    const buf = await res.arrayBuffer()
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': res.headers.get('Content-Disposition') ?? 'attachment; filename="gdpr_export.pdf"',
      },
    })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
