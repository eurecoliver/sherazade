import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const anno = searchParams.get('anno') ?? ''
  const mese = searchParams.get('mese') ?? ''
  const gruppo = searchParams.get('gruppo') ?? ''
  const qs = new URLSearchParams()
  if (anno) qs.set('anno', anno)
  if (mese) qs.set('mese', mese)
  if (gruppo) qs.set('gruppo', gruppo)
  try {
    const { res } = await fetchBackend(
      request,
      `/api/v1/presenze/export-pdf-presenze/${qs.toString() ? '?' + qs.toString() : ''}`,
    )
    if (!res.ok) return NextResponse.json(await res.json(), { status: res.status })
    const buf = await res.arrayBuffer()
    const disposition = res.headers.get('Content-Disposition') ?? 'attachment; filename="presenze.pdf"'
    return new NextResponse(buf, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': disposition },
    })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
