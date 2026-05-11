'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'
import TabQRCheckin from '@/components/TabQRCheckin'
import TabQRCheckinInsegnanti from '@/components/TabQRCheckinInsegnanti'
import AdminInsegnantiPanel from '@/components/AdminInsegnantiPanel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BambinoReg {
  id: number
  nome: string
  cognome: string
  sezione: string
  orario_uscita_previsto: string | null
}

interface StatoBambino {
  presente: boolean | null
  ora_arrivo: string
  ora_uscita: string
  motivo_assenza: string
  note: string
  assenza_comunicata: boolean
}

const MOTIVI_REG = [
  { value: 'malattia', label: 'Malattia' },
  { value: 'famiglia', label: 'Motivi familiari' },
  { value: 'vacanza', label: 'Vacanza' },
  { value: 'altro', label: 'Altro' },
]

function calcolaRitardoArrivo(ora: string): number {
  const [h, m] = ora.split(':').map(Number)
  return Math.max(0, h * 60 + m - (9 * 60 + 30))
}

function calcolaRitardoUscita(ora: string, previsto: string): number {
  const [h1, m1] = ora.split(':').map(Number)
  const [h2, m2] = previsto.split(':').map(Number)
  return Math.max(0, (h1 * 60 + m1) - (h2 * 60 + m2))
}

function BambinoRow({ bambino, stato, onChange }: {
  bambino: BambinoReg
  stato: StatoBambino
  onChange: (s: Partial<StatoBambino>) => void
}) {
  const isPresente = stato.presente === true
  const isAssente = stato.presente === false
  const nonToccato = stato.presente === null
  const ritardoArrivo = isPresente && stato.ora_arrivo ? calcolaRitardoArrivo(stato.ora_arrivo) : 0
  const ritardoUscita = isPresente && stato.ora_uscita && bambino.orario_uscita_previsto
    ? calcolaRitardoUscita(stato.ora_uscita, bambino.orario_uscita_previsto) : 0

  return (
    <div style={{
      background: isPresente ? '#F0FFF4' : isAssente ? '#FFF5F5' : 'white',
      border: `2px solid ${isPresente ? '#68D391' : isAssente ? '#FC8181' : '#E2E8F0'}`,
      borderRadius: '14px', padding: '0.875rem 1rem', marginBottom: '0.625rem', transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, color: '#333', fontSize: '1rem' }}>{bambino.cognome} {bambino.nome}</span>
          {bambino.sezione && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#888' }}>({bambino.sezione})</span>}
          {nonToccato && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#aaa' }}>— da registrare</span>}
        </div>
        <button onClick={() => onChange({ presente: isPresente ? null : true })} style={{ padding: '0.5rem 1rem', background: isPresente ? '#48BB78' : '#F0FFF4', color: isPresente ? 'white' : '#48BB78', border: `2px solid ${isPresente ? '#48BB78' : '#68D391'}`, borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', minWidth: '5rem' }}>✓ Sì</button>
        <button onClick={() => onChange({ presente: isAssente ? null : false, motivo_assenza: isAssente ? '' : stato.motivo_assenza || 'malattia' })} style={{ padding: '0.5rem 1rem', background: isAssente ? '#FC8181' : '#FFF5F5', color: isAssente ? 'white' : '#FC8181', border: `2px solid ${isAssente ? '#FC8181' : '#FEB2B2'}`, borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', minWidth: '5rem' }}>✗ No</button>
      </div>
      {isPresente && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.8rem', color: '#555', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              Ora arrivo <input type="time" value={stato.ora_arrivo} onChange={e => onChange({ ora_arrivo: e.target.value })} style={{ padding: '0.25rem 0.5rem', border: '1px solid #CBD5E0', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'inherit' }} />
            </label>
            {ritardoArrivo > 0 && <span style={{ background: '#FFF3CD', color: '#856404', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>⏱ +{ritardoArrivo} min</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.8rem', color: '#555', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              Ora uscita <input type="time" value={stato.ora_uscita} onChange={e => onChange({ ora_uscita: e.target.value })} style={{ padding: '0.25rem 0.5rem', border: '1px solid #CBD5E0', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'inherit' }} />
            </label>
            {bambino.orario_uscita_previsto && <span style={{ fontSize: '0.75rem', color: '#888' }}>Previsto: {bambino.orario_uscita_previsto}</span>}
            {ritardoUscita > 0 && <span style={{ background: '#FFF5F5', color: '#C53030', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>⏱ +{ritardoUscita} min</span>}
          </div>
        </div>
      )}
      {isAssente && (
        <div style={{ marginTop: '0.625rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={stato.motivo_assenza} onChange={e => onChange({ motivo_assenza: e.target.value })} style={{ padding: '0.35rem 0.625rem', border: '1px solid #FEB2B2', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: '#FFF5F5', color: '#C53030' }}>
            {MOTIVI_REG.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <label style={{ fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <input type="checkbox" checked={stato.assenza_comunicata} onChange={e => onChange({ assenza_comunicata: e.target.checked })} />
            Genitore ha avvisato
          </label>
        </div>
      )}
    </div>
  )
}

interface BambinoInfo {
  id: number
  nome: string
  cognome: string
  sezione: string
}

interface Presenza {
  id: number
  bambino: number
  bambino_nome: string
  bambino_sezione: string
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

interface RigaGiornata {
  bambino: BambinoInfo
  presenza: Presenza | null
}

interface NonArrivatiResp {
  data: string
  totale_attivi: number
  con_registro: number
  non_arrivati: BambinoInfo[]
}

interface ReportBambino {
  bambino_id: number
  nome: string
  cognome: string
  sezione: string
  giorni_presenti: number
  giorni_assenti: number
  giorni_non_registrati: number
  percentuale_presenza: number
}

interface ReportResp {
  anno: number
  mese: number
  giorni_nel_mese: number
  bambini: ReportBambino[]
}

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

function oggi(): string {
  return new Date().toISOString().split('T')[0]
}

function fmtDataIt(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPresenzePage() {
  const router = useRouter()
  const locale = useLocale()

  const [tab, setTab] = useState<'oggi' | 'storico' | 'registra' | 'insegnanti' | 'qr'>('oggi')
  const [data, setData] = useState(oggi())
  const [righe, setRighe] = useState<RigaGiornata[]>([])
  const [nonArrivati, setNonArrivati] = useState<NonArrivatiResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Registra
  const [righeReg, setRigheReg] = useState<{ bambino: BambinoReg; presenza: Presenza | null }[]>([])
  const [statiReg, setStatiReg] = useState<Record<number, StatoBambino>>({})
  const [sezReg, setSezReg] = useState('')
  const [sezioniReg, setSezioniReg] = useState<string[]>([])
  const [dataReg, setDataReg] = useState(oggi())
  const [loadingReg, setLoadingReg] = useState(false)
  const [savingReg, setSavingReg] = useState(false)
  const [savedReg, setSavedReg] = useState(false)
  const [errorReg, setErrorReg] = useState('')

  // Storico
  const [reportAnno, setReportAnno] = useState(new Date().getFullYear())
  const [reportMese, setReportMese] = useState(new Date().getMonth() + 1)
  const [report, setReport] = useState<ReportResp | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)

  const caricaOggi = useCallback(async (dataStr: string) => {
    setLoading(true)
    setError('')
    try {
      const [giornataRes, nonArrivatiRes] = await Promise.all([
        fetch(`/api/presenze/giornata?data=${dataStr}`),
        fetch(`/api/presenze/non-arrivati?data=${dataStr}`),
      ])
      if (giornataRes.status === 401) { router.push(`/${locale}/login`); return }
      if (!giornataRes.ok) throw new Error()

      setRighe(await giornataRes.json())
      if (nonArrivatiRes.ok) setNonArrivati(await nonArrivatiRes.json())
    } catch {
      setError('Errore nel caricamento.')
    } finally {
      setLoading(false)
    }
  }, [locale, router])

  useEffect(() => {
    if (tab === 'oggi') caricaOggi(data)
  }, [tab, data, caricaOggi])

  const caricaGiornataReg = useCallback(async (dataStr: string, sez: string) => {
    setLoadingReg(true)
    setErrorReg('')
    setSavedReg(false)
    try {
      const params = new URLSearchParams({ data: dataStr })
      if (sez) params.set('sezione', sez)
      const res = await fetch(`/api/presenze/giornata?${params}`)
      if (!res.ok) throw new Error()
      const dati: { bambino: BambinoReg; presenza: Presenza | null }[] = await res.json()
      setRigheReg(dati)
      setSezioniReg([...new Set(dati.map(r => r.bambino.sezione).filter(Boolean))])
      const nuovi: Record<number, StatoBambino> = {}
      for (const r of dati) {
        nuovi[r.bambino.id] = r.presenza
          ? { presente: r.presenza.presente, ora_arrivo: r.presenza.ora_arrivo ?? '', ora_uscita: r.presenza.ora_uscita ?? '', motivo_assenza: r.presenza.motivo_assenza, note: r.presenza.note, assenza_comunicata: r.presenza.assenza_comunicata }
          : { presente: null, ora_arrivo: '', ora_uscita: '', motivo_assenza: 'malattia', note: '', assenza_comunicata: false }
      }
      setStatiReg(nuovi)
    } catch {
      setErrorReg('Errore nel caricamento.')
    } finally {
      setLoadingReg(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'registra') caricaGiornataReg(dataReg, sezReg)
  }, [tab, dataReg, sezReg, caricaGiornataReg])

  const salvaReg = async () => {
    setSavingReg(true)
    setErrorReg('')
    try {
      const presenze = righeReg
        .filter(r => statiReg[r.bambino.id]?.presente !== null)
        .map(r => ({
          bambino: r.bambino.id,
          presente: statiReg[r.bambino.id].presente,
          ora_arrivo: statiReg[r.bambino.id].ora_arrivo || null,
          ora_uscita: statiReg[r.bambino.id].ora_uscita || null,
          motivo_assenza: statiReg[r.bambino.id].presente ? '' : statiReg[r.bambino.id].motivo_assenza,
          assenza_comunicata: statiReg[r.bambino.id].assenza_comunicata,
          note: statiReg[r.bambino.id].note,
        }))
      const res = await fetch('/api/presenze/salva-giornata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataReg, presenze }),
      })
      if (!res.ok) throw new Error()
      setSavedReg(true)
      caricaGiornataReg(dataReg, sezReg)
    } catch {
      setErrorReg('Errore nel salvataggio.')
    } finally {
      setSavingReg(false)
    }
  }

  const caricaReport = async () => {
    setLoadingReport(true)
    try {
      const res = await fetch(`/api/presenze/report-mensile?anno=${reportAnno}&mese=${reportMese}`)
      if (!res.ok) throw new Error()
      setReport(await res.json())
    } catch {
      setError('Errore nel caricamento del report.')
    } finally {
      setLoadingReport(false)
    }
  }

  // Raggruppa per sezione
  const perSezione: Record<string, RigaGiornata[]> = {}
  for (const r of righe) {
    const s = r.bambino.sezione || 'Senza sezione'
    ;(perSezione[s] = perSezione[s] ?? []).push(r)
  }

  const totPresenti = righe.filter(r => r.presenza?.presente === true).length
  const totAssenti = righe.filter(r => r.presenza?.presente === false).length
  const totNonReg = righe.filter(r => !r.presenza).length

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2D3436 0%, #636E72 100%)', padding: '1.25rem 1.5rem 1.75rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(1080px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button
              onClick={() => router.push(`/${locale}/dashboard/admin`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>📋 Registro Presenze</h1>
        </div>
      </div>

      <div style={{ maxWidth: 'min(1080px, 96vw)', margin: '0 auto', padding: '1.25rem 1rem 3rem' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {([
            ['oggi', 'Riepilogo giornaliero'],
            ['registra', '📝 Registra presenze'],
            ['insegnanti', '👩‍🏫 Presenze insegnanti'],
            ['storico', 'Report mensile'],
            ['qr', '📱 QR Check-in'],
          ] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '0.5rem 1.25rem',
                background: tab === t ? '#2D3436' : 'white',
                color: tab === t ? 'white' : '#555',
                border: `2px solid ${tab === t ? '#2D3436' : '#E2E8F0'}`,
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* ── TAB OGGI ── */}
        {tab === 'oggi' && (
          <>
            {/* Selettore data */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#555' }}>Data:</label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                style={{ padding: '0.4rem 0.75rem', border: '1px solid #CBD5E0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#888', textTransform: 'capitalize' }}>{fmtDataIt(data)}</span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#555', fontWeight: 600 }}>Caricamento...</div>
            ) : (
              <>
                {/* Contatori globali */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Presenti', n: totPresenti, color: '#48BB78', bg: '#F0FFF4' },
                    { label: 'Assenti', n: totAssenti, color: '#FC8181', bg: '#FFF5F5' },
                    { label: 'Non registrati', n: totNonReg, color: '#F6AD55', bg: '#FFFAF0' },
                  ].map(c => (
                    <div key={c.label} style={{ background: c.bg, border: `2px solid ${c.color}50`, borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: c.color }}>{c.n}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: c.color }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Alert non arrivati */}
                {nonArrivati && nonArrivati.non_arrivati.length > 0 && (
                  <div style={{ background: '#FFF5F5', border: '2px solid #FC8181', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                    <p style={{ margin: '0 0 0.75rem', fontWeight: 800, color: '#C53030', fontSize: '0.95rem' }}>
                      ⚠️ {nonArrivati.non_arrivati.length} bambini senza registro per oggi
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {nonArrivati.non_arrivati.map(b => (
                        <span key={b.id} style={{ background: '#FED7D7', color: '#C53030', padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600 }}>
                          {b.cognome} {b.nome} {b.sezione ? `(${b.sezione})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per sezione */}
                {Object.entries(perSezione).map(([sez, lista]) => {
                  const presenti = lista.filter(r => r.presenza?.presente).length
                  const assenti = lista.filter(r => r.presenza && !r.presenza.presente).length
                  const nr = lista.filter(r => !r.presenza).length
                  return (
                    <div key={sez} style={{ background: 'white', borderRadius: '14px', marginBottom: '1rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div style={{ background: '#2D3436', color: 'white', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700 }}>Sezione {sez}</span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                          {presenti}✓ {assenti}✗ {nr > 0 ? `${nr}?` : ''}
                        </span>
                      </div>
                      <div style={{ padding: '0.75rem 1.25rem' }}>
                        {lista.map(r => (
                          <div key={r.bambino.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.5rem 0',
                            borderBottom: '1px solid #F7FAFC',
                            gap: '0.75rem',
                          }}>
                            <span style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: r.presenza?.presente ? '#48BB78' : r.presenza ? '#FC8181' : '#CBD5E0',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                            }}>
                              {r.presenza?.presente ? '✓' : r.presenza ? '✗' : '?'}
                            </span>
                            <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>
                              {r.bambino.cognome} {r.bambino.nome}
                            </span>
                            {r.presenza && !r.presenza.presente && r.presenza.motivo_assenza && (
                              <span style={{ fontSize: '0.75rem', color: '#888', background: '#F7FAFC', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                                {r.presenza.motivo_assenza}
                                {r.presenza.assenza_comunicata ? ' ✓' : ''}
                              </span>
                            )}
                            {r.presenza?.presente && r.presenza.ora_arrivo && (
                              <span style={{ fontSize: '0.75rem', color: '#48BB78' }}>⏰ {r.presenza.ora_arrivo.slice(0, 5)}</span>
                            )}
                            {r.presenza?.minuti_ritardo_arrivo != null && r.presenza.minuti_ritardo_arrivo > 0 && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#856404', background: '#FFF3CD', padding: '0.15rem 0.4rem', borderRadius: '10px' }}>
                                +{r.presenza.minuti_ritardo_arrivo}min
                              </span>
                            )}
                            {r.presenza?.minuti_ritardo_uscita != null && r.presenza.minuti_ritardo_uscita > 0 && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#C53030', background: '#FFF5F5', padding: '0.15rem 0.4rem', borderRadius: '10px' }}>
                                uscita +{r.presenza.minuti_ritardo_uscita}min
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {/* ── TAB REGISTRA ── */}
        {tab === 'registra' && (
          <>
            <div style={{ background: 'white', borderRadius: '12px', padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <input type="date" value={dataReg} onChange={e => setDataReg(e.target.value)} style={{ padding: '0.4rem 0.75rem', border: '1px solid #CBD5E0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }} />
              <select value={sezReg} onChange={e => setSezReg(e.target.value)} style={{ padding: '0.4rem 0.75rem', border: '1px solid #CBD5E0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', flex: 1, minWidth: '120px' }}>
                <option value="">Tutte le sezioni</option>
                {sezioniReg.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {(() => {
              const presenti = Object.values(statiReg).filter(s => s.presente === true).length
              const assenti = Object.values(statiReg).filter(s => s.presente === false).length
              const nonReg = Object.values(statiReg).filter(s => s.presente === null).length
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
                  {[
                    { label: 'Presenti', count: presenti, color: '#48BB78', bg: '#F0FFF4' },
                    { label: 'Assenti', count: assenti, color: '#FC8181', bg: '#FFF5F5' },
                    { label: 'Da fare', count: nonReg, color: '#F6AD55', bg: '#FFFAF0' },
                  ].map(c => (
                    <div key={c.label} style={{ background: c.bg, border: `2px solid ${c.color}40`, borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: c.color }}>{c.count}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: c.color }}>{c.label}</div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {errorReg && <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>{errorReg}</div>}
            {savedReg && <div style={{ background: '#D4EDDA', color: '#155724', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>✓ Presenze salvate con successo</div>}

            {loadingReg ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#555', fontWeight: 600 }}>Caricamento...</div>
            ) : righeReg.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>Nessun bambino trovato.</div>
            ) : (
              righeReg.map(r => (
                <BambinoRow
                  key={r.bambino.id}
                  bambino={r.bambino}
                  stato={statiReg[r.bambino.id] ?? { presente: null, ora_arrivo: '', ora_uscita: '', motivo_assenza: 'malattia', note: '', assenza_comunicata: false }}
                  onChange={delta => setStatiReg(prev => ({ ...prev, [r.bambino.id]: { ...prev[r.bambino.id], ...delta } }))}
                />
              ))
            )}

            {!loadingReg && righeReg.length > 0 && (
              <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, padding: '1rem 0 0', background: 'transparent', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={salvaReg}
                  disabled={savingReg}
                  style={{ padding: '0.875rem 2.5rem', background: savingReg ? '#A0AEC0' : '#2D3436', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: savingReg ? 'not-allowed' : 'pointer', fontFamily: 'inherit', maxWidth: '400px', width: '100%' }}
                >
                  {savingReg ? 'Salvataggio...' : `Salva presenze (${Object.values(statiReg).filter(s => s.presente !== null).length} di ${righeReg.length})`}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── TAB STORICO / REPORT ── */}
        {tab === 'storico' && (
          <>
            <div style={{ background: 'white', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <select
                value={reportMese}
                onChange={e => setReportMese(Number(e.target.value))}
                style={{ padding: '0.4rem 0.75rem', border: '1px solid #CBD5E0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}
              >
                {MESI.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <input
                type="number"
                value={reportAnno}
                onChange={e => setReportAnno(Number(e.target.value))}
                min={2024}
                max={2030}
                style={{ padding: '0.4rem 0.625rem', border: '1px solid #CBD5E0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', width: '80px' }}
              />
              <button
                onClick={caricaReport}
                disabled={loadingReport}
                style={{ padding: '0.5rem 1.25rem', background: '#2D3436', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {loadingReport ? 'Caricamento...' : 'Carica report'}
              </button>
              {report && (
                <button
                  onClick={() => window.print()}
                  style={{ padding: '0.5rem 1.25rem', background: '#E2E8F0', color: '#2D3436', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  🖨️ Stampa / PDF
                </button>
              )}
            </div>

            {report && (
              <div style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ background: '#2D3436', color: 'white', padding: '0.875rem 1.25rem' }}>
                  <span style={{ fontWeight: 700 }}>
                    {MESI[report.mese - 1]} {report.anno} — {report.giorni_nel_mese} giorni
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F7FAFC' }}>
                      {['Bambino', 'Sezione', 'Presenti', 'Assenti', 'N.R.', '%'].map(h => (
                        <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#555', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.bambini.map(b => (
                      <tr key={b.bambino_id} style={{ borderBottom: '1px solid #F7FAFC' }}>
                        <td style={{ padding: '0.625rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>{b.cognome} {b.nome}</td>
                        <td style={{ padding: '0.625rem 1rem', fontSize: '0.85rem', color: '#666' }}>{b.sezione}</td>
                        <td style={{ padding: '0.625rem 1rem', fontSize: '0.9rem', fontWeight: 700, color: '#48BB78' }}>{b.giorni_presenti}</td>
                        <td style={{ padding: '0.625rem 1rem', fontSize: '0.9rem', fontWeight: 700, color: '#FC8181' }}>{b.giorni_assenti}</td>
                        <td style={{ padding: '0.625rem 1rem', fontSize: '0.9rem', color: '#A0AEC0' }}>{b.giorni_non_registrati}</td>
                        <td style={{ padding: '0.625rem 1rem' }}>
                          <div style={{ background: '#E2E8F0', borderRadius: '6px', height: '8px', width: '80px', overflow: 'hidden' }}>
                            <div style={{ background: b.percentuale_presenza >= 80 ? '#48BB78' : b.percentuale_presenza >= 60 ? '#F6AD55' : '#FC8181', height: '100%', width: `${b.percentuale_presenza}%` }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#555' }}>{b.percentuale_presenza}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── TAB QR ── */}
        {tab === 'qr' && (
          <>
            <TabQRCheckin isAdmin={true} />
            <TabQRCheckinInsegnanti isAdmin={true} />
          </>
        )}

        {/* ── TAB INSEGNANTI ── */}
        {tab === 'insegnanti' && (
          <AdminInsegnantiPanel />
        )}
      </div>
    </div>
  )
}
