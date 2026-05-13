import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const data = searchParams.get('data') ?? ''
  const qs = new URLSearchParams()
  if (data) qs.set('data', data)
  try {
    const { res } = await fetchBackend(
      request,
      `/api/v1/piatti/export-pdf-menu/${qs.toString() ? '?' + qs.toString() : ''}`,
    )
    if (!res.ok) return NextResponse.json(await res.json(), { status: res.status })
    const buf = await res.arrayBuffer()
    const disposition = res.headers.get('Content-Disposition') ?? 'attachment; filename="menu.pdf"'
    return new NextResponse(buf, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': disposition },
    })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
