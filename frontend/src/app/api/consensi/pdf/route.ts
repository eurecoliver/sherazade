import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/fetchBackend'

export async function GET(request: NextRequest) {
  const bambinoId = request.nextUrl.searchParams.get('bambino')
  if (!bambinoId) {
    return NextResponse.json({ detail: 'Parametro "bambino" obbligatorio.' }, { status: 400 })
  }
  try {
    const { res } = await fetchBackend(request, `/api/v1/consensi/pdf/?bambino=${bambinoId}`)
    if (!res.ok) {
      return NextResponse.json(await res.json(), { status: res.status })
    }
    const pdfBuffer = await res.arrayBuffer()
    const contentDisposition = res.headers.get('Content-Disposition') ?? 'attachment; filename="consensi.pdf"'
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDisposition,
      },
    })
  } catch {
    return NextResponse.json({ detail: 'Errore server.' }, { status: 503 })
  }
}
