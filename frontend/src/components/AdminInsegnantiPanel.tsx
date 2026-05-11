'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import RegistroInsegnantiPanel from '@/components/RegistroInsegnantiPanel'

interface InsegnanteRiga {
  insegnante_id: number
  nome: string
  cognome: string
  email: string
}

interface StoricoPresenza {
  id: number
  data: string
  insegnante_nome?: string
  presente: boolean
  motivo_assenza: string
  motivo_assenza_display: string
  ora_entrata: string | null
  ora_uscita: string | null
}

interface StoricoStats {
  mese: string
  giorni_presenti: number
  giorni_assenti: number
  totale_giorni: number
}

const MOTIVI = [
  { value: 'malattia', label: 'Malattia' },
  { value: 'ferie', label: 'Ferie' },
  { value: 'permesso', label: 'Permesso' },
  { value: 'altro', label: 'Altro' },
]

const CONTROL_STYLE: CSSProperties = {
  padding: '0.4rem 0.7rem',
  border: '1px solid #CBD5E0',
  borderRadius: '8px',
  fontFamily: 'inherit',
  fontSize: '0.88rem',
  minHeight: '36px',
  boxSizing: 'border-box',
}

const CONTROL_WIDTH = '170px'

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback
  const record = payload as Record<string, unknown>
  if (typeof record.detail === 'string' && record.detail) return record.detail
  if (typeof record.error === 'string' && record.error) return record.error

  const parts: string[] = []
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value) && value.length > 0) {
      parts.push(`${key}: ${value.join(', ')}`)
    } else if (typeof value === 'string' && value) {
      parts.push(`${key}: ${value}`)
    }
  }
  return parts[0] || fallback
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

export default function AdminInsegnantiPanel() {
  const [dataRegistro, setDataRegistro] = useState(todayIso())
  const [insegnanti, setInsegnanti] = useState<InsegnanteRiga[]>([])
  const [loadingInsegnanti, setLoadingInsegnanti] = useState(true)
  const [errorInsegnanti, setErrorInsegnanti] = useState('')
  const [insegnanteId, setInsegnanteId] = useState('')
  const [storico, setStorico] = useState<StoricoPresenza[]>([])
  const [stats, setStats] = useState<StoricoStats | null>(null)
  const [loadingStorico, setLoadingStorico] = useState(false)
  const [errorStorico, setErrorStorico] = useState('')   // errori caricamento storico
  const [dataManuale, setDataManuale] = useState(todayIso())
  const [presenteManuale, setPresenteManuale] = useState(true)
  const [motivoAssenza, setMotivoAssenza] = useState('altro')
  const [oraEntrata, setOraEntrata] = useState('')
  const [oraUscita, setOraUscita] = useState('')
  const [savingManuale, setSavingManuale] = useState(false)
  const [successManuale, setSuccessManuale] = useState('')
  const [errorManuale, setErrorManuale] = useState('')    // errori salvataggio manuale
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [errorDelete, setErrorDelete] = useState('')
  const formRef = useRef<HTMLDivElement>(null)

  const caricaInsegnanti = async () => {
    setLoadingInsegnanti(true)
    setErrorInsegnanti('')
    try {
      const res = await fetch(`/api/presenze/insegnanti-giornata?data=${encodeURIComponent(dataRegistro)}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.detail || `Errore HTTP ${res.status} nel caricamento insegnanti`)
      }
      const json = await res.json()
      const list = (json.insegnanti ?? []) as InsegnanteRiga[]
      setInsegnanti(list)
    } catch (err) {
      setErrorInsegnanti(err instanceof Error ? err.message : 'Impossibile caricare la lista insegnanti')
    } finally {
      setLoadingInsegnanti(false)
    }
  }

  const caricaStorico = async (id: string) => {
    setLoadingStorico(true)
    setErrorStorico('')
    try {
      const url = id
        ? `/api/presenze/storico-insegnanti?insegnante_id=${encodeURIComponent(id)}`
        : '/api/presenze/storico-insegnanti'
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || 'Errore nel caricamento storico')
      setStorico(json.presenze ?? [])
      setStats(json.stats_mese ?? null)
    } catch (err) {
      setErrorStorico(err instanceof Error ? err.message : 'Errore nel caricamento storico')
      setStorico([])
      setStats(null)
    } finally {
      setLoadingStorico(false)
    }
  }

  const salvaManuale = async () => {
    if (!insegnanteId) return
    setSavingManuale(true)
    setSuccessManuale('')
    setErrorManuale('')
    try {
      const res = await fetch('/api/presenze/insegnanti-manuale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insegnante: Number(insegnanteId),
          data: dataManuale,
          presente: presenteManuale,
          motivo_assenza: presenteManuale ? '' : motivoAssenza,
          ora_entrata: presenteManuale && oraEntrata ? oraEntrata : null,
          ora_uscita: presenteManuale && oraUscita ? oraUscita : null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = extractErrorMessage(json, `Errore HTTP ${res.status}`)
        throw new Error(detail)
      }
      setSuccessManuale('✓ Salvataggio completato')
      await caricaStorico(insegnanteId)
    } catch (err) {
      setErrorManuale(err instanceof Error ? err.message : 'Errore nel salvataggio manuale')
    } finally {
      setSavingManuale(false)
    }
  }

  const eliminaPresenza = async (id: number) => {
    if (!window.confirm('Eliminare questo record di presenza?')) return
    setDeletingId(id)
    setErrorDelete('')
    try {
      const res = await fetch(`/api/presenze/insegnanti-manuale/${id}`, { method: 'DELETE' })
      if (res.status !== 204 && !res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(extractErrorMessage(json, `Errore HTTP ${res.status}`))
      }
      await caricaStorico(insegnanteId)
    } catch (err) {
      setErrorDelete(err instanceof Error ? err.message : 'Errore nell\'eliminazione')
    } finally {
      setDeletingId(null)
    }
  }

  const modificaPresenza = (r: StoricoPresenza) => {
    setDataManuale(r.data)
    // L'useEffect su [storico, dataManuale] si occuperà del prefill
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    caricaInsegnanti()
  }, [dataRegistro])

  useEffect(() => {
    caricaStorico(insegnanteId)
  // caricaStorico è ricreata a ogni render ma i deps giusti sono solo [insegnanteId]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insegnanteId])

  useEffect(() => {
    const record = storico.find(r => r.data === dataManuale)
    if (!record) {
      setPresenteManuale(true)
      setMotivoAssenza('altro')
      setOraEntrata('')
      setOraUscita('')
      return
    }
    setPresenteManuale(record.presente)
    setMotivoAssenza(record.motivo_assenza || 'altro')
    setOraEntrata(record.ora_entrata ? record.ora_entrata.slice(0, 5) : '')
    setOraUscita(record.ora_uscita ? record.ora_uscita.slice(0, 5) : '')
  }, [storico, dataManuale])

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '14px', padding: '0.875rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.8rem', color: '#555', fontWeight: 600 }}>Registro giornaliero</label>
            <input
            type="date"
            value={dataRegistro}
            onChange={e => setDataRegistro(e.target.value)}
            style={{ ...CONTROL_STYLE, width: CONTROL_WIDTH }}
          />
        </div>
        <RegistroInsegnantiPanel data={dataRegistro} />
      </div>

      <div style={{ background: 'white', borderRadius: '14px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 0.75rem', color: '#2D3748', fontSize: '1rem' }}>Storico insegnante</h3>
        {errorInsegnanti && (
          <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem', color: '#C53030', fontSize: '0.82rem' }}>
            ⚠️ {errorInsegnanti}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={insegnanteId}
            onChange={e => setInsegnanteId(e.target.value)}
            disabled={loadingInsegnanti}
            style={{ ...CONTROL_STYLE, width: '320px', maxWidth: '100%', appearance: 'none', WebkitAppearance: 'none' }}
          >
            <option value="">{loadingInsegnanti ? 'Caricamento...' : '— Tutte —'}</option>
            {insegnanti.map(ins => (
              <option key={ins.insegnante_id} value={ins.insegnante_id}>
                {ins.cognome} {ins.nome} ({ins.email})
              </option>
            ))}
          </select>
          <button
            onClick={() => caricaStorico(insegnanteId)}
            disabled={!insegnanteId || loadingStorico}
            style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '8px', background: '#2D3436', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {loadingStorico ? 'Caricamento...' : 'Aggiorna storico'}
          </button>
        </div>

        {stats && (
          <div style={{ marginTop: '0.9rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.625rem' }}>
            <div style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.6rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#718096' }}>{stats.mese}</div>
              <div style={{ fontWeight: 800, color: '#2D3748' }}>{stats.totale_giorni} giorni</div>
            </div>
            <div style={{ background: '#F0FFF4', border: '1px solid #C6F6D5', borderRadius: '10px', padding: '0.6rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#2F855A' }}>Presenti</div>
              <div style={{ fontWeight: 800, color: '#2F855A' }}>{stats.giorni_presenti}</div>
            </div>
            <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '10px', padding: '0.6rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#C53030' }}>Assenti</div>
              <div style={{ fontWeight: 800, color: '#C53030' }}>{stats.giorni_assenti}</div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '0.9rem', maxHeight: '320px', overflow: 'auto', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
          {errorStorico && (
            <div style={{ background: '#FFF5F5', color: '#C53030', padding: '0.75rem 1rem', fontSize: '0.82rem', borderBottom: '1px solid #FED7D7' }}>
              ⚠️ Errore caricamento storico: {errorStorico}
              <button
                onClick={() => caricaStorico(insegnanteId)}
                style={{ marginLeft: '0.75rem', padding: '0.2rem 0.5rem', border: '1px solid #C53030', borderRadius: '6px', background: 'white', color: '#C53030', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit' }}
              >Riprova</button>
            </div>
          )}
          {errorDelete && (
            <div style={{ background: '#FFF5F5', color: '#C53030', padding: '0.6rem 1rem', fontSize: '0.82rem', borderBottom: '1px solid #FED7D7' }}>
              ⚠️ {errorDelete}
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F7FAFC' }}>
                {!insegnanteId && <th style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#4A5568' }}>Insegnante</th>}
                <th style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#4A5568' }}>Data</th>
                <th style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#4A5568' }}>Entrata</th>
                <th style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#4A5568' }}>Uscita</th>
                <th style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#4A5568' }}>Stato</th>
                {insegnanteId && <th style={{ textAlign: 'right', padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#4A5568' }}>Azioni</th>}
              </tr>
            </thead>
            <tbody>
              {storico.map((r, idx) => (
                <tr key={r.id} style={{ borderTop: idx === 0 ? 'none' : '1px solid #EDF2F7' }}>
                  {!insegnanteId && <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.83rem', color: '#2D3748', fontWeight: 600 }}>{r.insegnante_nome ?? '—'}</td>}
                  <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.83rem', color: '#2D3748' }}>{new Date(`${r.data}T00:00:00`).toLocaleDateString('it-IT')}</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.83rem', color: '#2D3748' }}>{r.ora_entrata ? r.ora_entrata.slice(0, 5) : '—'}</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.83rem', color: '#2D3748' }}>{r.ora_uscita ? r.ora_uscita.slice(0, 5) : '—'}</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.83rem' }}>
                    {r.presente ? (
                      <span style={{ background: '#F0FFF4', color: '#2F855A', border: '1px solid #C6F6D5', borderRadius: '999px', padding: '0.15rem 0.5rem', fontWeight: 700, fontSize: '0.73rem' }}>Presente</span>
                    ) : (
                      <span style={{ background: '#FFF5F5', color: '#C53030', border: '1px solid #FED7D7', borderRadius: '999px', padding: '0.15rem 0.5rem', fontWeight: 700, fontSize: '0.73rem' }}>
                        Assente {r.motivo_assenza_display ? `(${r.motivo_assenza_display})` : ''}
                      </span>
                    )}
                  </td>
                  {insegnanteId && (
                    <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => modificaPresenza(r)}
                        title="Modifica"
                        style={{ background: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8', borderRadius: '6px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit', marginRight: '0.3rem' }}
                      >✏️</button>
                      <button
                        onClick={() => eliminaPresenza(r.id)}
                        disabled={deletingId === r.id}
                        title="Elimina"
                        style={{ background: '#FFF5F5', color: '#C53030', border: '1px solid #FED7D7', borderRadius: '6px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}
                      >{deletingId === r.id ? '…' : '🗑️'}</button>
                    </td>
                  )}
                </tr>
              ))}
              {!loadingStorico && storico.length === 0 && (
                <tr>
                  <td colSpan={insegnanteId ? 5 : 5} style={{ padding: '1rem', textAlign: 'center', color: '#718096', fontSize: '0.85rem' }}>
                    Nessun record disponibile.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div ref={formRef} style={{ marginTop: '1rem', paddingTop: '0.9rem', borderTop: '1px dashed #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#2D3748' }}>Inserisci / modifica manualmente</h4>
            {insegnanteId && (
              <button
                onClick={() => {
                  setDataManuale(todayIso())
                  setPresenteManuale(true)
                  setOraEntrata('')
                  setOraUscita('')
                  setMotivoAssenza('altro')
                  setSuccessManuale('')
                  setErrorManuale('')
                }}
                style={{ padding: '0.25rem 0.625rem', border: '1px solid #CBD5E0', borderRadius: '8px', background: 'white', color: '#4A5568', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >+ Nuova</button>
            )}
          </div>
          {!insegnanteId ? (
            <p style={{ margin: 0, color: '#718096', fontSize: '0.85rem' }}>Seleziona un&apos;insegnante specifica dal menu sopra per inserire o correggere presenze.</p>
          ) : (
          <>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="date"
              value={dataManuale}
              onChange={e => setDataManuale(e.target.value)}
              style={{ ...CONTROL_STYLE, width: CONTROL_WIDTH }}
            />

            <button
              onClick={() => setPresenteManuale(true)}
              style={{
                padding: '0.45rem 0.8rem',
                border: presenteManuale ? '2px solid #2F855A' : '1px solid #CBD5E0',
                borderRadius: '8px',
                background: presenteManuale ? '#F0FFF4' : 'white',
                color: presenteManuale ? '#2F855A' : '#4A5568',
                fontWeight: 700,
                cursor: 'pointer',
                minHeight: '36px',
              }}
            >
              Presente
            </button>
            <button
              onClick={() => setPresenteManuale(false)}
              style={{
                padding: '0.45rem 0.8rem',
                border: !presenteManuale ? '2px solid #C53030' : '1px solid #CBD5E0',
                borderRadius: '8px',
                background: !presenteManuale ? '#FFF5F5' : 'white',
                color: !presenteManuale ? '#C53030' : '#4A5568',
                fontWeight: 700,
                cursor: 'pointer',
                minHeight: '36px',
              }}
            >
              Assente
            </button>

            {presenteManuale ? (
              <>
                <input
                  type="time"
                  value={oraEntrata}
                  onChange={e => setOraEntrata(e.target.value)}
                  style={{ ...CONTROL_STYLE, width: CONTROL_WIDTH }}
                />
                <input
                  type="time"
                  value={oraUscita}
                  onChange={e => setOraUscita(e.target.value)}
                  style={{ ...CONTROL_STYLE, width: CONTROL_WIDTH }}
                />
              </>
            ) : (
            <select
              value={motivoAssenza}
              onChange={e => setMotivoAssenza(e.target.value)}
              style={{ ...CONTROL_STYLE, width: CONTROL_WIDTH, appearance: 'none', WebkitAppearance: 'none' }}
            >
              {MOTIVI.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            )}

            <button
              onClick={salvaManuale}
              disabled={!insegnanteId || savingManuale}
              style={{ padding: '0.5rem 0.95rem', border: 'none', borderRadius: '8px', background: '#C53030', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {savingManuale ? 'Salvataggio...' : 'Salva manuale'}
            </button>
          </div>
          {successManuale && <p style={{ margin: '0.65rem 0 0', color: '#2F855A', fontSize: '0.82rem', fontWeight: 600 }}>{successManuale}</p>}
          {errorManuale && <p style={{ margin: '0.65rem 0 0', color: '#C53030', fontSize: '0.82rem' }}>{errorManuale}</p>}
          </>
          )}
        </div>
      </div>
    </div>
  )
}
