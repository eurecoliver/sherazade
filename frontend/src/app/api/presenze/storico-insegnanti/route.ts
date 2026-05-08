import { fetchBackend } from '@/lib/fetchBackend';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const insegnanteId = searchParams.get('insegnante_id');

  const params = new URLSearchParams();
  if (insegnanteId) params.append('insegnante_id', insegnanteId);

  try {
    const response = await fetchBackend(
      `/presenze/storico-insegnanti/?${params}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return Response.json(error, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('[storico-insegnanti]', error);
    return Response.json(
      { detail: 'Errore nel caricamento dello storico' },
      { status: 500 }
    );
  }
}
