import { NextResponse } from 'next/server';

/**
 * GET /api/notifiche/vapid-key
 * Restituisce la chiave pubblica VAPID per la sottoscrizione push del browser.
 * La chiave viene letta dalla variabile d'ambiente server-side VAPID_PUBLIC_KEY.
 */
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY || '';
  return NextResponse.json({ key });
}
