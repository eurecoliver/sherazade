import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, COOKIE_OPTIONS } from '@/lib/fetchBackend'

export async function POST(request: NextRequest) {
  const body = await request.json()
  try {
    const { res, newAccessToken } = await fetchBackend(request, '/api/v1/presenze/salva-insegnante-manuale/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // Compatibility fallback: se il backend non ha ancora l'action nuova,
    // supportiamo almeno la registrazione assenze usando l'endpoint legacy.
    if ((res.status === 404 || res.status === 405) && body?.presente === false) {
      const legacy = await fetchBackend(request, '/api/v1/presenze/crea-assenza-insegnante/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const legacyPayload = await legacy.res.json().catch(() => ({ detail: 'Errore legacy assenza' }))
      const legacyRes = NextResponse.json(legacyPayload, { status: legacy.res.status })
      if (legacy.newAccessToken) legacyRes.cookies.set('access_token', legacy.newAccessToken, COOKIE_OPTIONS)
      return legacyRes
    }

    let payload: unknown
    try {
      payload = await res.json()
    } catch {
      const text = await res.text().catch(() => '')
      payload = { detail: text || 'Errore non JSON dal backend' }
    }

    if ((res.status === 404 || res.status === 405) && body?.presente === true) {
      return NextResponse.json(
        {
          detail: 'Backend non aggiornato: endpoint manuale insegnanti non disponibile. Ricostruisci anche il container backend.',
          backend_status: res.status,
        },
        { status: 409 },
      )
    }

    const nextRes = NextResponse.json(payload, { status: res.status })
    if (newAccessToken) nextRes.cookies.set('access_token', newAccessToken, COOKIE_OPTIONS)
    return nextRes
  } catch (error) {
    return NextResponse.json(
      { detail: 'Errore nel salvataggio manuale', error: error instanceof Error ? error.message : 'unknown' },
      { status: 503 },
    )
  }
}
