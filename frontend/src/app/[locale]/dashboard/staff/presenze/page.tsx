'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bambino {
  id: number
  nome: string
  cognome: string
  sezione: string
  orario_uscita_previsto: string | null
}

interface Presenza {
  id: number
  bambino: number
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
  bambino: Bambino
  presenza: Presenza | null
}

// ─── Stato locale per ogni bambino ────────────────────────────────────────────

interface StatoBambino {
  presente: boolean | null
  ora_arrivo: string
  ora_uscita: string
  motivo_assenza: string
  note: string
  assenza_comunicata: boolean
}

const MOTIVI = [
  { value: 'malattia', label: 'Malattia' },
  { value: 'famiglia', label: 'Motivi familiari' },
  { value: 'vacanza', label: 'Vacanza' },
  { value: 'altro', label: 'Altro' },
]

function oggi(): string {
  return new Date().toISOString().split('T')[0]
}

function fmtDataIt(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

function calcolaRitardoArrivo(ora: string): number {
  const [h, m] = ora.split(':').map(Number)
  const minuti = h * 60 + m
  const ingresso = 9 * 60
  return Math.max(0, minuti - ingresso)
}

function calcolaRitardoUscita(ora: string, previsto: string): number {
  const [h1, m1] = ora.split(':').map(Number)
  const [h2, m2] = previsto.split(':').map(Number)
  return Math.max(0, (h1 * 60 + m1) - (h2 * 60 + m2))
}

// ─── BambinoRow ───────────────────────────────────────────────────────────────

function BambinoRow({
  bambino, stato, onChange,
}: {
  bambino: Bambino
  stato: StatoBambino
  onChange: (s: Partial<StatoBambino>) => void
}) {
  const isPresente = stato.presente === true
  const isAssente = stato.presente === false
  const nonToccato = stato.presente === null

  const ritardoArrivo = isPresente && stato.ora_arrivo
    ? calcolaRitardoArrivo(stato.ora_arrivo)
    : 0
  const ritardoUscita = isPresente && stato.ora_uscita && bambino.orario_uscita_previsto
    ? calcolaRitardoUscita(stato.ora_uscita, bambino.orario_uscita_previsto)
    : 0

  return (
    <div style={{
      background: isPresente ? '#F0FFF4' : isAssente ? '#FFF5F5' : 'white',
      border: `2px solid ${isPresente ? '#68D391' : isAssente ? '#FC8181' : '#E2E8F0'}`,
      borderRadius: '14px',
      padding: '0.875rem 1rem',
      marginBottom: '0.625rem',
      transition: 'all 0.15s',
    }}>
      {/* Nome + toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, color: '#333', fontSize: '1rem' }}>
            {bambino.cognome} {bambino.nome}
          </span>
          {nonToccato && (
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#aaa' }}>— da registrare</span>
          )}
        </div>

        <button
          onClick={() => onChange({ presente: isPresente ? null : true })}
          style={{
            padding: '0.5rem 1rem',
            background: isPresente ? '#48BB78' : '#F0FFF4',
            color: isPresente ? 'white' : '#48BB78',
            border: `2px solid ${isPresente ? '#48BB78' : '#68D391'}`,
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            minWidth: '5rem',
          }}
        >
          ✓ Sì
        </button>

        <button
          onClick={() => onChange({ presente: isAssente ? null : false, motivo_assenza: isAssente ? '' : stato.motivo_assenza || 'malattia' })}
          style={{
            padding: '0.5rem 1rem',
            background: isAssente ? '#FC8181' : '#FFF5F5',
            color: isAssente ? 'white' : '#FC8181',
            border: `2px solid ${isAssente ? '#FC8181' : '#FEB2B2'}`,
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            minWidth: '5rem',
          }}
        >
          ✗ No
        </button>
      </div>

      {/* Dettagli espandibili — presenza */}
      {isPresente && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Ora arrivo */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.8rem', color: '#555', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>Ora arrivo</span>
              <input
                type="time"
                value={stato.ora_arrivo}
                onChange={e => onChange({ ora_arrivo: e.target.value })}
                style={{ padding: '0.25rem 0.5rem', border: '1px solid #CBD5E0', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'inherit' }}
              />
            </label>
            {ritardoArrivo > 0 && (
              <span style={{
                background: '#FFF3CD', color: '#856404',
                padding: '0.2rem 0.6rem', borderRadius: '20px',
                fontSize: '0.75rem', fontWeight: 700,
              }}>
                ⏱ +{ritardoArrivo} min
              </span>
            )}
          </div>

          {/* Ora uscita */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.8rem', color: '#555', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>Ora uscita</span>
              <input
                type="time"
                value={stato.ora_uscita}
                onChange={e => onChange({ ora_uscita: e.target.value })}
                style={{ padding: '0.25rem 0.5rem', border: '1px solid #CBD5E0', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'inherit' }}
              />
            </label>
            {bambino.orario_uscita_previsto && (
              <span style={{ fontSize: '0.75rem', color: '#888' }}>
                Previsto: {bambino.orario_uscita_previsto}
              </span>
            )}
            {ritardoUscita > 0 && (
              <span style={{
                background: '#FFF5F5', color: '#C53030',
                padding: '0.2rem 0.6rem', borderRadius: '20px',
                fontSize: '0.75rem', fontWeight: 700,
              }}>
                ⏱ +{ritardoUscita} min
              </span>
            )}
          </div>
        </div>
      )}

      {isAssente && (
        <div style={{ marginTop: '0.625rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={stato.motivo_assenza}
            onChange={e => onChange({ motivo_assenza: e.target.value })}
            style={{ padding: '0.35rem 0.625rem', border: '1px solid #FEB2B2', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: '#FFF5F5', color: '#C53030' }}
          >
            {MOTIVI.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <label style={{ fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <input
              type="checkbox"
              checked={stato.assenza_comunicata}
              onChange={e => onChange({ assenza_comunicata: e.target.checked })}
            />
            Genitore ha avvisato
          </label>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPresenzePage() {
  const router = useRouter()
  const locale = useLocale()

  const [righe, setRighe] = useState<RigaGiornata[]>([])
  const [stati, setStati] = useState<Record<number, StatoBambino>>({})
  const [sezione, setSezione] = useState('')
  const [sezioniDisponibili, setSezioniDisponibili] = useState<string[]>([])
  const [data, setData] = useState(oggi())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const caricaGiornata = useCallback(async (dataStr: string, sez: string) => {
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const params = new URLSearchParams({ data: dataStr })
      if (sez) params.set('sezione', sez)
      const res = await fetch(`/api/presenze/giornata?${params}`)
      if (res.status === 401) { router.push(`/${locale}/login`); return }
      if (!res.ok) throw new Error()
      const dati: RigaGiornata[] = await res.json()
      setRighe(dati)

      const sez_uniche = [...new Set(dati.map(r => r.bambino.sezione).filter(Boolean))]
      setSezioniDisponibili(sez_uniche)

      const nuoviStati: Record<number, StatoBambino> = {}
      for (const r of dati) {
        nuoviStati[r.bambino.id] = r.presenza
          ? {
              presente: r.presenza.presente,
              ora_arrivo: r.presenza.ora_arrivo ?? '',
              ora_uscita: r.presenza.ora_uscita ?? '',
              motivo_assenza: r.presenza.motivo_assenza,
              note: r.presenza.note,
              assenza_comunicata: r.presenza.assenza_comunicata,
            }
          : { presente: null, ora_arrivo: '', ora_uscita: '', motivo_assenza: 'malattia', note: '', assenza_comunicata: false }
      }
      setStati(nuoviStati)
    } catch {
      setError('Errore nel caricamento delle presenze.')
    } finally {
      setLoading(false)
    }
  }, [locale, router])

  useEffect(() => {
    caricaGiornata(data, sezione)
  }, [data, sezione, caricaGiornata])

  const aggiornaStato = (bambinoId: number, delta: Partial<StatoBambino>) => {
    setStati(prev => ({ ...prev, [bambinoId]: { ...prev[bambinoId], ...delta } }))
    setSaved(false)
  }

  const salva = async () => {
    setSaving(true)
    setError('')
    try {
      const presenze = righe
        .filter(r => stati[r.bambino.id]?.presente !== null)
        .map(r => ({
          bambino: r.bambino.id,
          presente: stati[r.bambino.id].presente,
          ora_arrivo: stati[r.bambino.id].ora_arrivo || null,
          ora_uscita: stati[r.bambino.id].ora_uscita || null,
          motivo_assenza: stati[r.bambino.id].presente ? '' : stati[r.bambino.id].motivo_assenza,
          assenza_comunicata: stati[r.bambino.id].assenza_comunicata,
          note: stati[r.bambino.id].note,
        }))

      const res = await fetch('/api/presenze/salva-giornata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, presenze }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      caricaGiornata(data, sezione)
    } catch {
      setError('Errore nel salvataggio.')
    } finally {
      setSaving(false)
    }
  }

  const presenti = Object.values(stati).filter(s => s.presente === true).length
  const assenti = Object.values(stati).filter(s => s.presente === false).length
  const nonRegistrati = Object.values(stati).filter(s => s.presente === null).length

  return (
    <div style={{ minHeight: '100vh', background: '#EAF4FF' }}>

      <div style={{ background: 'linear-gradient(135deg, #0984E3 0%, #0652DD 100%)', padding: '1.25rem 1.25rem 1.75rem', color: 'white' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/staff`)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.375rem', fontFamily: 'inherit' }}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
            ✅ Registro Presenze
          </h1>
          <p style={{ margin: '0.2rem 0 0', opacity: 0.85, fontSize: '0.85rem', textTransform: 'capitalize' }}>
            {fmtDataIt(data)}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1rem 1rem 4rem' }}>

        <div style={{ background: 'white', borderRadius: '14px', padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(9,132,227,0.08)' }}>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', border: '1px solid #CBD5E0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}
          />
          <select
            value={sezione}
            onChange={e => setSezione(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', border: '1px solid #CBD5E0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', flex: 1, minWidth: '120px' }}
          >
            <option value="">Tutte le sezioni</option>
            {sezioniDisponibili.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
          {[
            { label: 'Presenti', count: presenti, color: '#48BB78', bg: '#F0FFF4' },
            { label: 'Assenti', count: assenti, color: '#FC8181', bg: '#FFF5F5' },
            { label: 'Da fare', count: nonRegistrati, color: '#F6AD55', bg: '#FFFAF0' },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, border: `2px solid ${c.color}40`, borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: c.color }}>{c.count}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: c.color }}>{c.label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {saved && (
          <div style={{ background: '#D4EDDA', color: '#155724', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            ✓ Presenze salvate con successo
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#0984E3', fontWeight: 600 }}>Caricamento...</div>
        ) : righe.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
            <p style={{ margin: 0 }}>Nessun bambino trovato.</p>
          </div>
        ) : (
          righe.map(r => (
            <BambinoRow
              key={r.bambino.id}
              bambino={r.bambino}
              stato={stati[r.bambino.id] ?? { presente: null, ora_arrivo: '', ora_uscita: '', motivo_assenza: 'malattia', note: '', assenza_comunicata: false }}
              onChange={delta => aggiornaStato(r.bambino.id, delta)}
            />
          ))
        )}
      </div>

      {!loading && righe.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'white', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={salva}
            disabled={saving || nonRegistrati === righe.length}
            style={{
              padding: '0.875rem 2.5rem',
              background: saving ? '#A0AEC0' : '#0984E3',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              maxWidth: '400px',
              flex: 1,
            }}
          >
            {saving ? 'Salvataggio...' : `Salva presenze (${presenti + assenti} di ${righe.length})`}
          </button>
        </div>
      )}
    </div>
  )
}
