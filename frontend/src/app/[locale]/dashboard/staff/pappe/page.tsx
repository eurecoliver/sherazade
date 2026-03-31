'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Allergia {
  id: number
  tipo_label: string
  descrizione: string
  gravita: string
  gravita_label: string
}

interface BambinoInfo {
  id: number
  nome: string
  cognome: string
  sezione: string
  allergie: Allergia[]
  ha_allergie_gravi: boolean
}

interface RegistroPasto {
  id: number
  primo_quantita: string
  secondo_quantita: string
  contorno_quantita: string
  frutta_quantita: string
  merenda_quantita: string
  note_pasto: string
}

interface GiornataEntry {
  bambino: BambinoInfo
  registro: RegistroPasto | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUANTITA_OPTIONS = [
  { value: '', label: '—' },
  { value: 'tutto', label: 'Tutto' },
  { value: 'meta', label: 'Metà' },
  { value: 'poco', label: 'Poco' },
  { value: 'nulla', label: 'Nulla' },
]

const PORTATE: { key: keyof PastoForm; label: string }[] = [
  { key: 'primo_quantita', label: 'Primo' },
  { key: 'secondo_quantita', label: 'Secondo' },
  { key: 'contorno_quantita', label: 'Contorno' },
  { key: 'frutta_quantita', label: 'Frutta' },
  { key: 'merenda_quantita', label: 'Merenda' },
]

interface PastoForm {
  primo_quantita: string
  secondo_quantita: string
  contorno_quantita: string
  frutta_quantita: string
  merenda_quantita: string
  note_pasto: string
}

function emptyForm(): PastoForm {
  return { primo_quantita: '', secondo_quantita: '', contorno_quantita: '', frutta_quantita: '', merenda_quantita: '', note_pasto: '' }
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPappePage() {
  const router = useRouter()
  const locale = useLocale()

  const [data, setData] = useState(todayISO())
  const [sezione, setSezione] = useState('')
  const [entries, setEntries] = useState<GiornataEntry[]>([])
  const [forms, setForms] = useState<Record<number, PastoForm>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const fetchGiornata = useCallback(async () => {
    setError('')
    try {
      const params = new URLSearchParams({ data })
      if (sezione) params.set('sezione', sezione)
      const res = await fetch(`/api/meals/pasti/giornata?${params}`)
      if (res.status === 401) { router.push(`/${locale}/login`); return }
      if (!res.ok) throw new Error()
      const data_json: GiornataEntry[] = await res.json()
      setEntries(data_json)
      // Popola i form con i valori esistenti
      const newForms: Record<number, PastoForm> = {}
      for (const e of data_json) {
        newForms[e.bambino.id] = e.registro
          ? {
              primo_quantita: e.registro.primo_quantita,
              secondo_quantita: e.registro.secondo_quantita,
              contorno_quantita: e.registro.contorno_quantita,
              frutta_quantita: e.registro.frutta_quantita,
              merenda_quantita: e.registro.merenda_quantita,
              note_pasto: e.registro.note_pasto,
            }
          : emptyForm()
      }
      setForms(newForms)
    } catch {
      setError('Errore nel caricamento.')
    } finally {
      setLoading(false)
    }
  }, [data, sezione, locale, router])

  useEffect(() => {
    setLoading(true)
    fetchGiornata()
  }, [fetchGiornata])

  const sezioni = Array.from(new Set(entries.map(e => e.bambino.sezione).filter(Boolean))).sort()

  const handleFieldChange = (bambinoId: number, field: keyof PastoForm, value: string) => {
    setForms(prev => ({
      ...prev,
      [bambinoId]: { ...prev[bambinoId], [field]: value },
    }))
  }

  const handleSalvaSezione = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const pasti = entries.map(e => ({
        bambino: e.bambino.id,
        ...forms[e.bambino.id],
      }))
      const res = await fetch('/api/meals/pasti/salva-sezione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, pasti }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.detail || 'Errore durante il salvataggio.')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await fetchGiornata()
    } finally {
      setSaving(false)
    }
  }

  const compilati = entries.filter(e => e.registro !== null).length

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#EAF4FF' }}>
        <p style={{ color: '#0984E3', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EAF4FF' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0984E3 0%, #0652DD 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/staff`)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.5rem', fontFamily: 'inherit' }}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>🥣 Foglio pappe</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            {compilati}/{entries.length} bambini compilati
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Filtri */}
        <div style={{
          background: 'white', borderRadius: '14px', padding: '1rem 1.25rem',
          marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(9,132,227,0.08)',
          display: 'flex', gap: '0.875rem', flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#555', marginBottom: '0.3rem' }}>Data</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '2px solid #E8F4FD', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}
            />
          </div>
          {sezioni.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#555', marginBottom: '0.3rem' }}>Sezione</label>
              <select
                value={sezione}
                onChange={e => setSezione(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', border: '2px solid #E8F4FD', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}
              >
                <option value="">Tutte</option>
                {sezioni.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <button
            onClick={fetchGiornata}
            style={{ padding: '0.5rem 1rem', background: '#EAF4FF', color: '#0984E3', border: '2px solid #BDE0FF', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ↻ Aggiorna
          </button>
        </div>

        {error && (
          <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👶</div>
            <p style={{ margin: 0 }}>Nessun bambino trovato.</p>
          </div>
        ) : (
          <>
            {/* Tabella pappe */}
            <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(9,132,227,0.08)', marginBottom: '1.25rem' }}>

              {/* Header tabella */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr repeat(5, 100px) 1fr',
                gap: '0.5rem', padding: '0.75rem 1rem',
                background: '#EAF4FF', borderBottom: '2px solid #BDE0FF',
                fontSize: '0.75rem', fontWeight: 700, color: '#0984E3',
              }}>
                <span>Bambino</span>
                {PORTATE.map(p => <span key={p.key} style={{ textAlign: 'center' }}>{p.label}</span>)}
                <span>Note</span>
              </div>

              {/* Righe */}
              {entries.map(entry => {
                const { bambino } = entry
                const form = forms[bambino.id] ?? emptyForm()
                return (
                  <div
                    key={bambino.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr repeat(5, 100px) 1fr',
                      gap: '0.5rem', padding: '0.625rem 1rem',
                      borderBottom: '1px solid #F0F6FF',
                      alignItems: 'center',
                      background: bambino.ha_allergie_gravi ? '#FFF5F5' : 'white',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#333', fontSize: '0.875rem' }}>
                        {bambino.nome} {bambino.cognome}
                      </p>
                      {bambino.allergie.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                          {bambino.allergie.map(a => (
                            <span
                              key={a.id}
                              title={`${a.tipo_label}: ${a.descrizione} — ${a.gravita_label}`}
                              style={{
                                background: a.gravita === 'anafilassi' ? '#C0392B' : a.gravita === 'grave' ? '#E74C3C' : a.gravita === 'moderata' ? '#F39C12' : '#0984E3',
                                color: 'white',
                                padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                              }}
                            >
                              {a.descrizione}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {PORTATE.map(p => (
                      <select
                        key={p.key}
                        value={form[p.key]}
                        onChange={e => handleFieldChange(bambino.id, p.key, e.target.value)}
                        style={{
                          padding: '0.375rem 0.25rem', border: '2px solid #E8F4FD', borderRadius: '8px',
                          fontSize: '0.8rem', fontFamily: 'inherit', textAlign: 'center', width: '100%',
                          background: form[p.key] === 'tutto' ? '#D5F5E3'
                            : form[p.key] === 'meta' ? '#FEF9E7'
                            : form[p.key] === 'poco' ? '#FDEBD0'
                            : form[p.key] === 'nulla' ? '#FADBD8'
                            : 'white',
                        }}
                      >
                        {QUANTITA_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ))}

                    <input
                      type="text"
                      value={form.note_pasto}
                      onChange={e => handleFieldChange(bambino.id, 'note_pasto', e.target.value)}
                      placeholder="note..."
                      style={{
                        padding: '0.375rem 0.5rem', border: '2px solid #E8F4FD', borderRadius: '8px',
                        fontSize: '0.8rem', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )
              })}
            </div>

            {/* Bottone salva */}
            <button
              onClick={handleSalvaSezione}
              disabled={saving}
              style={{
                width: '100%', padding: '1rem',
                background: saved ? '#27AE60' : '#0984E3',
                color: 'white', border: 'none',
                borderRadius: '14px', fontSize: '1rem', fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: saving ? 0.7 : 1, transition: 'background 0.3s',
                boxShadow: '0 4px 16px rgba(9,132,227,0.25)',
              }}
            >
              {saving ? 'Salvataggio...' : saved ? '✓ Pappe salvate!' : `🥣 Salva pappe (${entries.length} bambini)`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
