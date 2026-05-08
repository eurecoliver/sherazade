import { fetchBackend } from '@/lib/fetchBackend';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const insegnanteId = searchParams.get('insegnante_id');

  const params = new URLSearchParams();
  if (insegnanteId) params.append('insegnante_id', insegnanteId);

  try {
    const { res } = await fetchBackend(
      request as any,
      `/api/v1/presenze/storico-insegnanti/?${params}`,
      { cache: 'no-store' } as RequestInit
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return Response.json(error, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error('[storico-insegnanti]', error);
    return Response.json(
      { detail: 'Errore nel caricamento dello storico' },
      { status: 500 }
    );
  }
}
