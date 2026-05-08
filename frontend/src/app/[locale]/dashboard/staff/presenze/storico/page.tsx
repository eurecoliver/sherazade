'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const PILL_BACK = 'rgba(255,255,255,0.15)';

interface Presenza {
  id: number;
  data: string;
  presente: boolean;
  motivo_assenza?: string;
  motivo_assenza_display?: string;
  ora_entrata?: string;
  ora_uscita?: string;
  creato_at: string;
}

interface StatsMonth {
  mese: string;
  giorni_presenti: number;
  giorni_assenti: number;
  totale_giorni: number;
}

export default function StoricoInsegnantiPage() {
  const t = useTranslations();
  const router = useRouter();
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [stats, setStats] = useState<StatsMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const caricaStorico = async () => {
      try {
        const response = await fetch('/api/presenze/storico-insegnanti', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.detail || 'Errore nel caricamento');
        }

        const data = await response.json();
        setPresenze(data.presenze || []);
        setStats(data.stats_mese || null);
      } catch (err) {
        console.error('[StoricoInsegnanti]', err);
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
      }
    };

    caricaStorico();
  }, []);

  const formatData = (data: string) => {
    return new Date(data + 'T00:00:00').toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatOra = (ora?: string) => {
    if (!ora) return '—';
    return ora.slice(0, 5);
  };

  const getBadgeStato = (presenza: Presenza) => {
    if (presenza.presente) {
      return <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Presente</span>;
    } else {
      return (
        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
          Assente {presenza.motivo_assenza_display && `(${presenza.motivo_assenza_display})`}
        </span>
      );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #2D3436 0%, #636E72 100%)' }}>
      {/* Header */}
      <div className="text-white p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard/staff/presenze"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: PILL_BACK,
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            ← Indietro
          </Link>
          <h1 style={{ fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: '700', margin: 0 }}>
            📊 Storico Presenze
          </h1>
          <div style={{ width: '100px' }} />
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>{stats.mese}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{stats.totale_giorni} giorni</div>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>Presenti</div>
              <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{stats.giorni_presenti}</div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>Assenti</div>
              <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{stats.giorni_assenti}</div>
            </div>
          </div>
        )}
      </div>

      {/* Contenuto */}
      <div style={{ padding: '24px', maxWidth: 'min(900px, 96vw)', margin: '0 auto' }}>
        {loading && <p style={{ color: '#999', textAlign: 'center' }}>Caricamento...</p>}

        {error && (
          <div style={{ background: '#fee', color: '#c33', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {!loading && presenze.length === 0 && (
          <p style={{ color: '#999', textAlign: 'center' }}>Nessun record di presenze trovato.</p>
        )}

        {!loading && presenze.length > 0 && (
          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Data</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Entrata</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Uscita</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {presenze.map((p, idx) => (
                  <tr key={p.id} style={{ borderBottom: idx !== presenze.length - 1 ? '1px solid #eee' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatData(p.data)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatOra(p.ora_entrata)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatOra(p.ora_uscita)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{getBadgeStato(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
