import { NextRequest, NextResponse } from 'next/server';
import { fetchBackend } from '@/lib/fetchBackend';

/**
 * POST /api/notifiche/subscribe
 * Registra la sottoscrizione push del dispositivo corrente nel backend Django.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { res } = await fetchBackend(request, '/api/v1/notifiche/subscribe/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
