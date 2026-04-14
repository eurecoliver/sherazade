'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Figlio {
  id: number
  nome: string
  cognome: string
  sezione: string
}

interface Presenza {
  id: number
  data: string
  presente: boolean
  ora_arrivo: string | null
  ora_uscita: string | null
  minuti_ritardo_arrivo: number | null
  minuti_ritardo_uscita: number | null
  assenza_comunicata: boolean
  motivo_assenza: string
  note: string
}

interface StatsMese {
  anno: number
  mese: number
  giorni_presenti: number
  giorni_assenti: number
}

interface MioFiglioResp {
  presenze: Presenza[]
  stats_mese: StatsMese | null
}

const MOTIVI = [
  { value: 'malattia', label: '🤒 Malattia' },
  { value: 'famiglia', label: '🏠 Motivi familiari' },
  { value: 'vacanza', label: '✈️ Vacanza' },
  { value: 'altro', label: '📝 Altro' },
]

const MESI_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

function fmtDataIt(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

function oggi(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GenitorePresenzePage() {
  const router = useRouter()
  const locale = useLocale()

  const [figli, setFigli] = useState<Figlio[]>([])
  const [selectedFiglio, setSelectedFiglio] = useState<number | null>(null)
  const [dati, setDati] = useState<MioFiglioResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDati, setLoadingDati] = useState(false)
  const [error, setError] = useState('')

  // Comunicazione assenza
  const [showFormAssenza, setShowFormAssenza] = useState(false)
  const [motivo, setMotivo] = useState('malattia')
  const [noteAssenza, setNoteAssenza] = useState('')
  const [sendingAssenza, setSendingAssenza] = useState(false)
  const [assenzaOk, setAssenzaOk] = useState(false)

  // Carica figli
  useEffect(() => {
    fetch('/api/bambini')
      .then(res => {
        if (res.status === 401) { router.push(`/${locale}/login`); return null }
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => {
        if (!data) return
        const list = data.results ?? data
        setFigli(list)
        if (list.length === 1) setSelectedFiglio(list[0].id)
      })
      .catch(() => setError('Errore nel caricamento.'))
      .finally(() => setLoading(false))
  }, [locale, router])

  const fetchPresenze = useCallback(async (bambinoId: number) => {
    setLoadingDati(true)
    setError('')
    setAssenzaOk(false)
    try {
      const res = await fetch(`/api/presenze/mio-figlio?bambino=${bambinoId}`)
      if (!res.ok) throw new Error()
      setDati(await res.json())
    } catch {
      setError('Errore nel caricamento delle presenze.')
    } finally {
      setLoadingDati(false)
    }
  }, [])

  useEffect(() => {
    if (selectedFiglio !== null) fetchPresenze(selectedFiglio)
  }, [selectedFiglio, fetchPresenze])

  const comunicaAssenza = async () => {
    if (!selectedFiglio) return
    setSendingAssenza(true)
    setError('')
    try {
      const res = await fetch('/api/presenze/comunica-assenza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bambino_id: selectedFiglio, motivo_assenza: motivo, note: noteAssenza }),
      })
      const data = await res.json()
      if (res.status === 409) {
        setError(data.detail)
        return
      }
      if (!res.ok) throw new Error(data.detail)
      setAssenzaOk(true)
      setShowFormAssenza(false)
      fetchPresenze(selectedFiglio)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore nella comunicazione.')
    } finally {
      setSendingAssenza(false)
    }
  }

  const figlioSel = figli.find(f => f.id === selectedFiglio)
  const presenzaOggi = dati?.presenze.find(p => p.data === oggi())
  const stats = dati?.stats_mese

  // Ritardi totali del mese corrente (calcolati dai dati già scaricati)
  const meseCorrente = new Date().getMonth() + 1
  const annoCorrente = new Date().getFullYear()
  const presenzeMese = dati?.presenze.filter(p => {
    const d = new Date(p.data)
    return d.getMonth() + 1 === meseCorrente && d.getFullYear() === annoCorrente
  }) ?? []
  const totRitardoArrivo = presenzeMese.reduce((acc, p) => acc + (p.minuti_ritardo_arrivo ?? 0), 0)
  const totRitardoUscita = presenzeMese.reduce((acc, p) => acc + (p.minuti_ritardo_uscita ?? 0), 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F0F4FF' }}>
        <p style={{ color: '#6C63FF', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FF' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6C63FF 0%, #3F3D99 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(860px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button
              onClick={() => router.push(`/${locale}/dashboard/genitore`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
            📅 Presenze di {figlioSel?.nome ?? '...'}
          </h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            Registro presenze e comunicazione assenze
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'min(860px, 96vw)', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

        {/* Selettore figlio */}
        {figli.length > 1 && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '1rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(108,99,255,0.08)' }}>
            <p style={{ margin: '0 0 0.625rem', fontSize: '0.82rem', fontWeight: 700, color: '#555' }}>Seleziona figlio</p>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              {figli.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFiglio(f.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: selectedFiglio === f.id ? '#6C63FF' : '#F0F4FF',
                    color: selectedFiglio === f.id ? 'white' : '#6C63FF',
                    border: `2px solid ${selectedFiglio === f.id ? '#6C63FF' : '#C5BFFF'}`,
                    borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {f.nome} {f.cognome}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {assenzaOk && (
          <div style={{ background: '#D4EDDA', color: '#155724', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            ✓ Assenza comunicata con successo
          </div>
        )}

        {selectedFiglio === null ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👆</div>
            <p style={{ margin: 0 }}>Seleziona un bambino.</p>
          </div>
        ) : loadingDati ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6C63FF', fontWeight: 600 }}>Caricamento...</div>
        ) : (
          <>
            {/* Card comunicazione assenza */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', boxShadow: '0 4px 20px rgba(108,99,255,0.1)' }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 800, fontSize: '1rem', color: '#333' }}>
                Oggi
              </p>

              {presenzaOggi ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '12px',
                    background: presenzaOggi.presente ? '#F0FFF4' : '#FFF5F5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem',
                  }}>
                    {presenzaOggi.presente ? '✅' : '❌'}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: presenzaOggi.presente ? '#38A169' : '#C53030' }}>
                      {presenzaOggi.presente ? 'Presente' : 'Assente'}
                      {presenzaOggi.presente && presenzaOggi.ora_arrivo ? ` — arrivo ${presenzaOggi.ora_arrivo.slice(0, 5)}` : ''}
                    </p>
                    {!presenzaOggi.presente && presenzaOggi.motivo_assenza && (
                      <p style={{ margin: '0.1rem 0 0', fontSize: '0.82rem', color: '#888' }}>
                        {MOTIVI.find(m => m.value === presenzaOggi.motivo_assenza)?.label ?? presenzaOggi.motivo_assenza}
                        {presenzaOggi.assenza_comunicata ? ' — comunicata' : ''}
                      </p>
                    )}
                    {presenzaOggi.presente && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                        {(presenzaOggi.minuti_ritardo_arrivo ?? 0) > 0 && (
                          <span style={{ background: '#FFF3CD', color: '#856404', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                            ⏱ Arrivo +{presenzaOggi.minuti_ritardo_arrivo} min
                          </span>
                        )}
                        {(presenzaOggi.minuti_ritardo_uscita ?? 0) > 0 && (
                          <span style={{ background: '#FFF5F5', color: '#C53030', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                            ⏱ Uscita +{presenzaOggi.minuti_ritardo_uscita} min
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', color: '#888' }}>
                    Nessun registro per oggi. Se {figlioSel?.nome} è assente, comunicacelo.
                  </p>
                  {!showFormAssenza ? (
                    <button
                      onClick={() => setShowFormAssenza(true)}
                      style={{ padding: '0.75rem 1.5rem', background: '#6C63FF', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      📢 Comunica assenza oggi
                    </button>
                  ) : (
                    <div>
                      <p style={{ margin: '0 0 0.625rem', fontSize: '0.85rem', fontWeight: 700, color: '#555' }}>Motivo assenza</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.875rem' }}>
                        {MOTIVI.map(m => (
                          <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input
                              type="radio"
                              name="motivo"
                              value={m.value}
                              checked={motivo === m.value}
                              onChange={() => setMotivo(m.value)}
                            />
                            {m.label}
                          </label>
                        ))}
                      </div>
                      <textarea
                        placeholder="Note aggiuntive (opzionale)"
                        value={noteAssenza}
                        onChange={e => setNoteAssenza(e.target.value)}
                        rows={2}
                        style={{ width: '100%', padding: '0.625rem', border: '1px solid #C5BFFF', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.625rem' }}>
                        <button
                          onClick={comunicaAssenza}
                          disabled={sendingAssenza}
                          style={{ flex: 1, padding: '0.75rem', background: sendingAssenza ? '#A0AEC0' : '#6C63FF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: sendingAssenza ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        >
                          {sendingAssenza ? 'Invio...' : 'Invia comunicazione'}
                        </button>
                        <button
                          onClick={() => setShowFormAssenza(false)}
                          style={{ padding: '0.75rem 1rem', background: '#F7FAFC', color: '#555', border: '1px solid #E2E8F0', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Statistiche mese */}
            {stats && (
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', boxShadow: '0 4px 20px rgba(108,99,255,0.1)' }}>
                <p style={{ margin: '0 0 0.875rem', fontWeight: 800, fontSize: '0.95rem', color: '#555' }}>
                  {MESI_IT[stats.mese - 1]} {stats.anno}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: '#F0FFF4', borderRadius: '12px', padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38A169' }}>{stats.giorni_presenti}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38A169' }}>Giorni presenti</div>
                  </div>
                  <div style={{ background: '#FFF5F5', borderRadius: '12px', padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#C53030' }}>{stats.giorni_assenti}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#C53030' }}>Giorni assenti</div>
                  </div>
                  <div style={{ background: totRitardoArrivo > 0 ? '#FFFBEB' : '#F7FAFC', borderRadius: '12px', padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: totRitardoArrivo > 0 ? '#856404' : '#aaa' }}>{totRitardoArrivo}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: totRitardoArrivo > 0 ? '#856404' : '#aaa' }}>Min ritardo arrivo</div>
                  </div>
                  <div style={{ background: totRitardoUscita > 0 ? '#FFF5F5' : '#F7FAFC', borderRadius: '12px', padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: totRitardoUscita > 0 ? '#C53030' : '#aaa' }}>{totRitardoUscita}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: totRitardoUscita > 0 ? '#C53030' : '#aaa' }}>Min ritardo uscita</div>
                  </div>
                </div>
              </div>
            )}

            {/* Storico recente */}
            {dati && dati.presenze.length > 0 && (
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.25rem 1.5rem', boxShadow: '0 4px 20px rgba(108,99,255,0.1)' }}>
                <p style={{ margin: '0 0 0.875rem', fontWeight: 800, fontSize: '0.95rem', color: '#555' }}>Storico recente</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {dati.presenze.slice(0, 20).map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #F7FAFC' }}>
                      <span style={{
                        width: 32, height: 32, borderRadius: '8px',
                        background: p.presente ? '#F0FFF4' : '#FFF5F5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', flexShrink: 0,
                      }}>
                        {p.presente ? '✅' : '❌'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#333', textTransform: 'capitalize' }}>
                          {fmtDataIt(p.data)}
                        </span>
                        {!p.presente && p.motivo_assenza && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.775rem', color: '#888' }}>
                            {MOTIVI.find(m => m.value === p.motivo_assenza)?.label ?? p.motivo_assenza}
                          </span>
                        )}
                      </div>
                      {p.presente && p.ora_arrivo && (
                        <span style={{ fontSize: '0.775rem', color: '#38A169' }}>⏰ {p.ora_arrivo.slice(0, 5)}</span>
                      )}
                      {(p.minuti_ritardo_arrivo ?? 0) > 0 && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#856404', background: '#FFF3CD', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>
                          +{p.minuti_ritardo_arrivo}min
                        </span>
                      )}
                      {(p.minuti_ritardo_uscita ?? 0) > 0 && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#C53030', background: '#FFF5F5', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>
                          usc +{p.minuti_ritardo_uscita}min
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dati && dati.presenze.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                <p style={{ margin: 0 }}>Nessuna presenza registrata ancora.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
