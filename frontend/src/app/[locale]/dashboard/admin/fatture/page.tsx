'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Genitore {
  id: number
  email: string
  first_name: string
  last_name: string
  is_active: boolean
}

interface Fattura {
  id: number
  genitore: number
  genitore_nome: string
  genitore_email: string
  anno: number
  mese: number
  importo: string | null
  file_url: string | null
  note: string
  caricato_da_nome: string | null
  caricato_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

function nomeCompleto(g: Genitore): string {
  return [g.first_name, g.last_name].filter(Boolean).join(' ') || g.email
}

function chiaveColonna(anno: number, mese: number): string {
  return `${anno}-${String(mese).padStart(2, '0')}`
}

function labelColonna(anno: number, mese: number): string {
  return `${MESI[mese - 1]} ${anno}`
}

// Genera le ultime N mesi (incluso il corrente)
function ultimi12Mesi(): { anno: number; mese: number }[] {
  const oggi = new Date()
  const result = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1)
    result.push({ anno: d.getFullYear(), mese: d.getMonth() + 1 })
  }
  return result // già in ordine decrescente (più recente prima)
}

// ─── Upload modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  genitore: Genitore
  anno: number
  mese: number
  existing: Fattura | null
  onClose: () => void
  onSaved: () => void
}

function UploadModal({ genitore, anno, mese, existing, onClose, onSaved }: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importo, setImporto] = useState(existing?.importo ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('genitore', String(genitore.id))
      fd.append('anno', String(anno))
      fd.append('mese', String(mese))
      if (importo) fd.append('importo', String(importo))
      if (note) fd.append('note', note)
      if (file) fd.append('file', file)

      const res = await fetch('/api/fatture', { method: 'POST', body: fd })
      if (!res.ok) {
        const d = await res.json()
        setError(typeof d === 'object' ? JSON.stringify(d) : String(d))
        return
      }
      onSaved()
    } catch {
      setError('Errore durante il salvataggio.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existing) return
    if (!confirm('Eliminare questa fattura?')) return
    setLoading(true)
    try {
      await fetch(`/api/fatture/${existing.id}`, { method: 'DELETE' })
      onSaved()
    } catch {
      setError('Errore durante l\'eliminazione.')
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.875rem',
    border: '1.5px solid #E2E8F0', borderRadius: '8px',
    fontSize: '0.875rem', fontFamily: 'inherit',
    boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#6C63FF' }}>
              🧾 Fattura {labelColonna(anno, mese)}
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#888' }}>{nomeCompleto(genitore)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#aaa' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* File upload */}
          <div style={{ marginBottom: '0.875rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#555', marginBottom: '0.375rem' }}>
              File PDF
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input ref={fileRef} type="file" accept=".pdf,.PDF" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{ padding: '0.5rem 1rem', background: '#F7FAFC', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#555', whiteSpace: 'nowrap' }}>
                📎 Scegli file
              </button>
              {file && <span style={{ fontSize: '0.82rem', color: '#27AE60', fontWeight: 600 }}>✓ {file.name}</span>}
              {!file && existing?.file_url && (
                <a href={existing.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.82rem', color: '#6C63FF', fontWeight: 600, textDecoration: 'none' }}>
                  📄 Vedi file caricato
                </a>
              )}
            </div>
            {!file && !existing?.file_url && <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#aaa' }}>Lascia vuoto per salvare senza allegato</p>}
          </div>

          {/* Importo */}
          <div style={{ marginBottom: '0.875rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#555', marginBottom: '0.375rem' }}>Importo (€)</label>
            <input type="number" step="0.01" min="0" value={importo} onChange={e => setImporto(e.target.value)}
              placeholder="es. 350.00" style={inp} />
          </div>

          {/* Note */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#555', marginBottom: '0.375rem' }}>Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              style={{ ...inp, resize: 'vertical' }} placeholder="Note opzionali..." />
          </div>

          {error && <div style={{ background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: '8px', padding: '0.625rem', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#C53030' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            {existing && (
              <button type="button" onClick={handleDelete} disabled={loading}
                style={{ padding: '0.75rem 1rem', background: '#FFF5F5', color: '#C53030', border: '1.5px solid #FEB2B2', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑 Elimina
              </button>
            )}
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '0.75rem', background: '#F7FAFC', color: '#555', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Annulla
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 2, padding: '0.75rem', background: loading ? '#A0AEC0' : '#6C63FF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Salvataggio...' : (existing ? 'Aggiorna' : 'Salva fattura')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FatturePage() {
  const router = useRouter()
  const locale = useLocale()

  const mesi = ultimi12Mesi()
  const [anno, setAnno] = useState(mesi[0].anno)

  const [genitori, setGenitori] = useState<Genitore[]>([])
  const [fatture, setFatture] = useState<Fattura[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal upload
  const [modal, setModal] = useState<{ genitore: Genitore; anno: number; mese: number } | null>(null)

  const mesiAnno = mesi.filter(m => m.anno === anno)

  const carica = useCallback(async () => {
    setLoading(true)
    try {
      const [gRes, fRes] = await Promise.all([
        fetch('/api/utenti?role=genitore&ordering=last_name&page_size=500'),
        fetch(`/api/fatture?anno=${anno}`),
      ])
      if (gRes.status === 401) { router.push(`/${locale}/login`); return }
      const gData = await gRes.json()
      const fData = await fRes.json()
      setGenitori(gData.results ?? gData)
      setFatture(fData.results ?? fData)
    } finally {
      setLoading(false)
    }
  }, [anno, locale, router])

  useEffect(() => { carica() }, [carica])

  // Indice rapido: genitoreId-mese -> Fattura
  const fattureMap: Record<string, Fattura> = {}
  fatture.forEach(f => { fattureMap[`${f.genitore}-${f.mese}`] = f })

  const genitoriFiltered = genitori.filter(g => {
    if (!search) return true
    const q = search.toLowerCase()
    return nomeCompleto(g).toLowerCase().includes(q) || g.email.toLowerCase().includes(q)
  })

  const modalFattura = modal
    ? fattureMap[`${modal.genitore.id}-${modal.mese}`] ?? null
    : null

  // Stats per header
  const totaleAtteso = genitoriFiltered.length * mesiAnno.length
  const totalePagati = genitoriFiltered.reduce((acc, g) =>
    acc + mesiAnno.filter(m => fattureMap[`${g.id}-${m.mese}`]).length, 0)
  const totaleScoperti = totaleAtteso - totalePagati

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F7FAFC' }}>
        <p style={{ color: '#6C63FF', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFC' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6C63FF 0%, #3F3D99 100%)', padding: '1.25rem 1.5rem 1.75rem', color: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button onClick={() => router.push(`/${locale}/dashboard/admin`)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.4rem', fontFamily: 'inherit' }}>
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>🧾 Gestione Fatture</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.85rem' }}>
            {totalePagati} fatture caricate · {totaleScoperti > 0 ? `${totaleScoperti} mancanti` : 'tutto in ordine ✓'}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem 1rem 3rem' }}>

        {/* Toolbar */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <input type="search" placeholder="Cerca genitore..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '160px', padding: '0.5rem 0.875rem', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '0.875rem', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {[...new Set(mesi.map(m => m.anno))].sort((a, b) => b - a).map(a => (
              <button key={a} onClick={() => setAnno(a)}
                style={{ padding: '0.5rem 0.875rem', background: anno === a ? '#6C63FF' : '#F7FAFC', color: anno === a ? 'white' : '#555', border: `1px solid ${anno === a ? '#6C63FF' : '#E2E8F0'}`, borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.78rem', color: '#666' }}>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#48BB78', marginRight: 4, verticalAlign: 'middle' }} />Caricata</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#FC8181', marginRight: 4, verticalAlign: 'middle' }} />Mancante</span>
          <span style={{ color: '#aaa' }}>Clicca su una cella per caricare o modificare</span>
        </div>

        {/* Tabella */}
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ background: '#F7FAFC' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#555', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#F7FAFC', zIndex: 1 }}>
                  Genitore
                </th>
                {mesiAnno.map(({ anno: a, mese: m }) => (
                  <th key={m} style={{ padding: '0.625rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#555', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', minWidth: 70 }}>
                    {labelColonna(a, m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {genitoriFiltered.length === 0 ? (
                <tr>
                  <td colSpan={mesiAnno.length + 1} style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
                    Nessun genitore trovato.
                  </td>
                </tr>
              ) : genitoriFiltered.map((g, i) => (
                <tr key={g.id}
                  style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#EDE9FE')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FAFAFA')}>
                  {/* Nome genitore — colonna fissa */}
                  <td style={{ padding: '0.625rem 1rem', borderBottom: '1px solid #F0F0F0', position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>{nomeCompleto(g)}</p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#aaa' }}>{g.email}</p>
                  </td>
                  {/* Celle per ogni mese */}
                  {mesiAnno.map(({ anno: a, mese: m }) => {
                    const f = fattureMap[`${g.id}-${m}`]
                    const meseCorrente = new Date().getMonth() + 1
                    const annoCorrente = new Date().getFullYear()
                    const isCurrent = m === meseCorrente && a === annoCorrente
                    return (
                      <td key={m}
                        onClick={() => setModal({ genitore: g, anno: a, mese: m })}
                        style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #F0F0F0', cursor: 'pointer' }}>
                        {f ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                            <span style={{ fontSize: '1rem' }}>✅</span>
                            {f.importo && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#27AE60' }}>€{parseFloat(f.importo).toFixed(0)}</span>}
                          </div>
                        ) : (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.4rem', borderRadius: '6px',
                            background: isCurrent ? '#FFF5F5' : '#F7FAFC',
                            color: isCurrent ? '#FC8181' : '#CBD5E0',
                          }}>
                            {isCurrent ? '⚠ da fare' : '—'}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Riepilogo mese corrente */}
        {(() => {
          const meseC = new Date().getMonth() + 1
          const annoC = new Date().getFullYear()
          const scoperti = genitoriFiltered.filter(g => !fattureMap[`${g.id}-${meseC}`])
          if (scoperti.length === 0) return null
          return (
            <div style={{ marginTop: '1.25rem', background: '#FFF5F5', borderRadius: '14px', padding: '1rem 1.25rem', border: '1px solid #FEB2B2' }}>
              <p style={{ margin: '0 0 0.625rem', fontWeight: 700, color: '#C53030', fontSize: '0.9rem' }}>
                ⚠ Fatture mancanti per {labelColonna(annoC, meseC)} ({scoperti.length})
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {scoperti.map(g => (
                  <button key={g.id} onClick={() => setModal({ genitore: g, anno: annoC, mese: meseC })}
                    style={{ padding: '0.3rem 0.75rem', background: 'white', border: '1px solid #FEB2B2', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#C53030', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {nomeCompleto(g)}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

      </div>

      {modal && (
        <UploadModal
          genitore={modal.genitore}
          anno={modal.anno}
          mese={modal.mese}
          existing={modalFattura}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); carica() }}
        />
      )}
    </div>
  )
}
