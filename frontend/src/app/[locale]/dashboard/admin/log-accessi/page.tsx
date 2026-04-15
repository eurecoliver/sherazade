'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface LogAccesso {
  id: number;
  timestamp: string;
  utente_email: string;
  utente_ruolo: string;
  azione: 'leggi' | 'crea' | 'modifica' | 'elimina';
  risorsa: string;
  oggetto_id: string;
  dettagli: string;
  ip_address: string | null;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LogAccesso[];
}

const AZIONE_COLOR: Record<string, string> = {
  leggi: '#0984E3',
  crea: '#00B894',
  modifica: '#FDCB6E',
  elimina: '#D63031',
};

const AZIONE_LABEL: Record<string, string> = {
  leggi: 'Lettura',
  crea: 'Creazione',
  modifica: 'Modifica',
  elimina: 'Eliminazione',
};

const RISORSE = [
  'bambino', 'famiglia', 'delega_ritiro',
  'registro_diario', 'media_diario',
  'presenza', 'consenso',
  'allergia', 'registro_pasto',
  'media_portfolio',
];

export default function LogAccessiPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogAccesso[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [dal, setDal] = useState('');
  const [al, setAl] = useState('');
  const [risorsa, setRisorsa] = useState('');
  const [azione, setAzione] = useState('');
  const [utente, setUtente] = useState('');

  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dal) params.set('dal', dal);
      if (al) params.set('al', al);
      if (risorsa) params.set('risorsa', risorsa);
      if (azione) params.set('azione', azione);
      if (utente) params.set('utente', utente);
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));

      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) {
        if (res.status === 403) { router.back(); return; }
        return;
      }
      const data: ApiResponse = await res.json();
      setLogs(data.results || []);
      setTotal(data.count || 0);
    } finally {
      setLoading(false);
    }
  }, [dal, al, risorsa, azione, utente, page, router]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6FA' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)',
        padding: '0',
      }}>
        <div style={{ maxWidth: 'min(1200px, 96vw)', margin: '0 auto', padding: '16px 20px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 20,
              color: 'white',
              padding: '6px 16px',
              cursor: 'pointer',
              fontSize: 14,
              marginBottom: 12,
            }}
          >
            ← Indietro
          </button>
          <h1 style={{ color: 'white', margin: 0, fontSize: 24, fontWeight: 700 }}>
            🔍 Log Accessi GDPR
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: 14 }}>
            Registro accessi ai dati personali dei minori — retention minima 6 mesi
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'min(1200px, 96vw)', margin: '0 auto', padding: '24px 20px' }}>
        {/* Filtri */}
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))',
          gap: 12,
          alignItems: 'end',
        }}>
          <div>
            <label style={labelStyle}>Dal</label>
            <input type="date" value={dal} onChange={e => { setDal(e.target.value); setPage(1); }} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Al</label>
            <input type="date" value={al} onChange={e => { setAl(e.target.value); setPage(1); }} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Risorsa</label>
            <select value={risorsa} onChange={e => { setRisorsa(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">Tutte</option>
              {RISORSE.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Azione</label>
            <select value={azione} onChange={e => { setAzione(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">Tutte</option>
              <option value="leggi">Lettura</option>
              <option value="crea">Creazione</option>
              <option value="modifica">Modifica</option>
              <option value="elimina">Eliminazione</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Utente (email)</label>
            <input
              type="text"
              placeholder="Cerca email…"
              value={utente}
              onChange={e => { setUtente(e.target.value); setPage(1); }}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setDal(''); setAl(''); setRisorsa(''); setAzione(''); setUtente(''); setPage(1); }}
              style={{ ...btnStyle, background: '#636E72', flex: 1 }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Contatore */}
        <div style={{ marginBottom: 12, color: '#636E72', fontSize: 14 }}>
          {loading ? 'Caricamento…' : `${total.toLocaleString('it-IT')} log trovati`}
          {totalPages > 1 && ` — pagina ${page} di ${totalPages}`}
        </div>

        {/* Tabella */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8F9FA' }}>
                  {['Timestamp', 'Utente', 'Ruolo', 'Azione', 'Risorsa', 'ID', 'Dettagli', 'IP'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#636E72' }}>
                      Nessun log trovato per i filtri selezionati
                    </td>
                  </tr>
                )}
                {logs.map((log, i) => (
                  <tr key={log.id} style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td style={tdStyle}>{formatDate(log.timestamp)}</td>
                    <td style={tdStyle}>{log.utente_email}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: '#EEF2FF',
                        color: '#4834D4',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {log.utente_ruolo}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        background: AZIONE_COLOR[log.azione] + '22',
                        color: AZIONE_COLOR[log.azione],
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {AZIONE_LABEL[log.azione] || log.azione}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <code style={{ fontSize: 11, background: '#F1F3F4', padding: '2px 6px', borderRadius: 4 }}>
                        {log.risorsa}
                      </code>
                    </td>
                    <td style={{ ...tdStyle, color: '#636E72' }}>{log.oggetto_id || '—'}</td>
                    <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.dettagli || '—'}
                    </td>
                    <td style={{ ...tdStyle, color: '#636E72', fontFamily: 'monospace', fontSize: 11 }}>
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginazione */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ ...btnStyle, opacity: page === 1 ? 0.5 : 1 }}
            >
              ← Precedente
            </button>
            <span style={{ padding: '8px 16px', color: '#636E72', fontSize: 14, lineHeight: '1' }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ ...btnStyle, opacity: page === totalPages ? 0.5 : 1 }}
            >
              Successiva →
            </button>
          </div>
        )}

        {/* Nota GDPR */}
        <div style={{
          marginTop: 24,
          padding: '12px 16px',
          background: '#EEF2FF',
          borderRadius: 8,
          borderLeft: '4px solid #6C5CE7',
          fontSize: 12,
          color: '#4834D4',
        }}>
          ℹ️ <strong>GDPR — Retention log:</strong> i log vengono conservati per almeno 6 mesi.
          Esegui periodicamente: <code>python manage.py cleanup_log_accessi</code>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#636E72',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #DFE6E9',
  borderRadius: 8,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  background: '#6C5CE7',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 11,
  color: '#636E72',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '1px solid #DFE6E9',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #F1F3F4',
  verticalAlign: 'middle',
};
