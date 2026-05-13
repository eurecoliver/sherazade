import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const bambino = searchParams.get('bambino') ?? ''
  const anno = searchParams.get('anno') ?? ''
  const mese = searchParams.get('mese') ?? ''
  if (!bambino) return NextResponse.json({ detail: 'Parametro "bambino" obbligatorio.' }, { status: 400 })
  const qs = new URLSearchParams({ bambino })
  if (anno) qs.set('anno', anno)
  if (mese) qs.set('mese', mese)
  try {
    const { res } = await fetchBackend(request, `/api/v1/diario/export-pdf-diario/?${qs}`)
    if (!res.ok) return NextResponse.json(await res.json(), { status: res.status })
    const buf = await res.arrayBuffer()
    const disposition = res.headers.get('Content-Disposition') ?? 'attachment; filename="diario.pdf"'
    return new NextResponse(buf, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': disposition },
    })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
