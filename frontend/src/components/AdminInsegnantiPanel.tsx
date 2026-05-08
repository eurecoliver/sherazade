'use client'

import { useEffect, useState } from 'react'
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
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

export default function AdminInsegnantiPanel() {
  const [dataRegistro, setDataRegistro] = useState(todayIso())
  const [insegnanti, setInsegnanti] = useState<InsegnanteRiga[]>([])
  const [insegnanteId, setInsegnanteId] = useState('')
  const [storico, setStorico] = useState<StoricoPresenza[]>([])
  const [stats, setStats] = useState<StoricoStats | null>(null)
  const [loadingStorico, setLoadingStorico] = useState(false)
  const [errorStorico, setErrorStorico] = useState('')
  const [dataManuale, setDataManuale] = useState(todayIso())
  const [presenteManuale, setPresenteManuale] = useState(true)
  const [motivoAssenza, setMotivoAssenza] = useState('altro')
  const [oraEntrata, setOraEntrata] = useState('')
  const [oraUscita, setOraUscita] = useState('')
  const [savingManuale, setSavingManuale] = useState(false)
  const [successManuale, setSuccessManuale] = useState('')

  const caricaInsegnanti = async () => {
    try {
      const res = await fetch(`/api/presenze/insegnanti-giornata?data=${encodeURIComponent(dataRegistro)}`)
      if (!res.ok) return
      const json = await res.json()
      const list = (json.insegnanti ?? []) as InsegnanteRiga[]
      setInsegnanti(list)
      if (!insegnanteId && list.length > 0) {
        setInsegnanteId(String(list[0].insegnante_id))
      }
    } catch {
      // no-op: il pannello giornaliero gestisce gia gli errori di base
    }
  }

  const caricaStorico = async (id: string) => {
    if (!id) return
    setLoadingStorico(true)
    setErrorStorico('')
    try {
      const res = await fetch(`/api/presenze/storico-insegnanti?insegnante_id=${encodeURIComponent(id)}`)
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
    setErrorStorico('')
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
      if (!res.ok) throw new Error(json.detail || 'Impossibile salvare la presenza manuale')
      setSuccessManuale('Salvataggio manuale completato')
      await caricaStorico(insegnanteId)
    } catch (err) {
      setErrorStorico(err instanceof Error ? err.message : 'Errore nel salvataggio manuale')
    } finally {
      setSavingManuale(false)
    }
  }

  useEffect(() => {
    caricaInsegnanti()
  }, [dataRegistro])

  useEffect(() => {
    if (insegnanteId) {
      caricaStorico(insegnanteId)
    }
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
            style={CONTROL_STYLE}
          />
        </div>
        <RegistroInsegnantiPanel data={dataRegistro} />
      </div>

      <div style={{ background: 'white', borderRadius: '14px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 0.75rem', color: '#2D3748', fontSize: '1rem' }}>Storico insegnante</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={insegnanteId}
            onChange={e => setInsegnanteId(e.target.value)}
            style={{ ...CONTROL_STYLE, minWidth: '260px' }}
          >
            {insegnanti.length === 0 && <option value="">Nessuna insegnante disponibile</option>}
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F7FAFC' }}>
                <th style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#4A5568' }}>Data</th>
                <th style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#4A5568' }}>Entrata</th>
                <th style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#4A5568' }}>Uscita</th>
                <th style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#4A5568' }}>Stato</th>
              </tr>
            </thead>
            <tbody>
              {storico.map((r, idx) => (
                <tr key={r.id} style={{ borderTop: idx === 0 ? 'none' : '1px solid #EDF2F7' }}>
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
                </tr>
              ))}
              {!loadingStorico && storico.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#718096', fontSize: '0.85rem' }}>
                    Nessun record disponibile.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '0.9rem', borderTop: '1px dashed #E2E8F0' }}>
          <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.92rem', color: '#2D3748' }}>Inserisci / modifica manualmente</h4>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="date"
              value={dataManuale}
              onChange={e => setDataManuale(e.target.value)}
              style={CONTROL_STYLE}
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
                  style={CONTROL_STYLE}
                />
                <input
                  type="time"
                  value={oraUscita}
                  onChange={e => setOraUscita(e.target.value)}
                  style={CONTROL_STYLE}
                />
              </>
            ) : (
            <select
              value={motivoAssenza}
              onChange={e => setMotivoAssenza(e.target.value)}
              style={CONTROL_STYLE}
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
          {errorStorico && <p style={{ margin: '0.65rem 0 0', color: '#C53030', fontSize: '0.82rem' }}>{errorStorico}</p>}
        </div>
      </div>
    </div>
  )
}
