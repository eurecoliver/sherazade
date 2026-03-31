'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bambino {
  id: number
  nome: string
  cognome: string
  sezione: string
  non_fotografabile: boolean
}

interface MediaItem {
  id: number
  file_url: string
  thumbnail_url: string | null
  tipo: 'foto' | 'video'
  visibile_a_genitori: boolean
}

interface Registro {
  id: number
  umore: string
  attivita_descrizione: string
  note_giornata: string
  autore_nome: string
  aggiornato_at: string
  media: MediaItem[]
}

interface GiornataEntry {
  bambino: Bambino
  consenso_ok: boolean
  consenso_msg: string
  registro: Registro | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UMORE_OPTIONS = [
  { value: '', label: '— Seleziona —' },
  { value: 'felice', label: '😊 Felice' },
  { value: 'sereno', label: '🙂 Sereno' },
  { value: 'stanco', label: '😴 Stanco' },
  { value: 'agitato', label: '😤 Agitato' },
  { value: 'triste', label: '😢 Triste' },
]

const UMORE_EMOJI: Record<string, string> = {
  felice: '😊',
  sereno: '🙂',
  stanco: '😴',
  agitato: '😤',
  triste: '😢',
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── BambinoCard ──────────────────────────────────────────────────────────────

function BambinoCard({
  entry,
  onSaved,
}: {
  entry: GiornataEntry
  onSaved: () => void
}) {
  const { bambino, consenso_ok, consenso_msg, registro } = entry

  const [expanded, setExpanded] = useState(false)
  const [umore, setUmore] = useState(registro?.umore ?? '')
  const [attivita, setAttivita] = useState(registro?.attivita_descrizione ?? '')
  const [note, setNote] = useState(registro?.note_giornata ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previews, setPreviews] = useState<{ url: string; tipo: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Sync state when registro changes (after refresh)
  useEffect(() => {
    setUmore(registro?.umore ?? '')
    setAttivita(registro?.attivita_descrizione ?? '')
    setNote(registro?.note_giornata ?? '')
  }, [registro])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const body = { bambino: bambino.id, data: todayISO(), umore, attivita_descrizione: attivita, note_giornata: note }
      const res = registro
        ? await fetch(`/api/diario/registri/${registro.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/diario/registri', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const d = await res.json()
        setError(d.detail || 'Errore durante il salvataggio.')
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (!registro) {
      setError('Salva prima il registro, poi carica i media.')
      return
    }
    setUploading(true)
    setError('')
    const newPreviews: { url: string; tipo: string }[] = []
    try {
      for (const file of Array.from(files)) {
        const tipo = file.type.startsWith('video/') ? 'video' : 'foto'
        const fd = new FormData()
        fd.append('registro', String(registro.id))
        fd.append('file', file)
        fd.append('tipo', tipo)
        const res = await fetch('/api/diario/media', { method: 'POST', body: fd })
        if (!res.ok) {
          const d = await res.json()
          setError(d.detail || 'Errore upload.')
          break
        }
        newPreviews.push({ url: URL.createObjectURL(file), tipo })
      }
      setPreviews(prev => [...prev, ...newPreviews])
      onSaved()
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDeleteMedia = async (mediaId: number) => {
    if (!confirm('Eliminare questo media?')) return
    const res = await fetch(`/api/diario/media/${mediaId}`, { method: 'DELETE' })
    if (res.ok) onSaved()
  }

  const initials = bambino.nome.charAt(0) + bambino.cognome.charAt(0)
  const hasRegistro = registro !== null
  const mediaList = registro?.media ?? []

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      marginBottom: '0.875rem',
      boxShadow: '0 2px 10px rgba(9,132,227,0.08)',
      overflow: 'hidden',
    }}>
      {/* Header card */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.875rem',
          padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: hasRegistro ? '#27AE60' : '#0984E3',
          color: 'white', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#333', fontSize: '0.95rem' }}>
            {bambino.nome} {bambino.cognome}
            {registro?.umore && (
              <span style={{ marginLeft: '0.5rem' }}>{UMORE_EMOJI[registro.umore]}</span>
            )}
          </p>
          <p style={{ margin: 0, fontSize: '0.775rem', color: '#aaa' }}>
            {bambino.sezione && `Sez. ${bambino.sezione} · `}
            {hasRegistro ? `✓ Compilato · ${mediaList.length} media` : 'Non compilato'}
          </p>
        </div>
        {!consenso_ok && (
          <span style={{
            background: '#FFF3CD', color: '#856404',
            padding: '0.25rem 0.6rem', borderRadius: '6px',
            fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            ⚠️ No consenso
          </span>
        )}
        <span style={{ color: '#aaa', fontSize: '1.1rem' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Corpo espanso */}
      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #F0F0F0' }}>

          {/* Warning consenso */}
          {!consenso_ok && (
            <div style={{
              background: '#FFF3CD', border: '1px solid #FFEAA7',
              borderRadius: '10px', padding: '0.75rem 1rem',
              marginTop: '1rem', marginBottom: '1rem',
              fontSize: '0.83rem', color: '#856404',
            }}>
              ⚠️ <strong>Attenzione:</strong> {consenso_msg}
              {' '}Non è possibile caricare foto o video per questo bambino.
            </div>
          )}

          {/* Warning non fotografabile */}
          {bambino.non_fotografabile && (
            <div style={{
              background: '#333', color: 'white', borderRadius: '10px',
              padding: '0.75rem 1rem', marginTop: '1rem', marginBottom: '1rem',
              fontSize: '0.83rem', fontWeight: 600,
            }}>
              ⚫ Bambino non fotografabile — nessun media consentito.
            </div>
          )}

          {/* Form */}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '0.375rem' }}>
                Come stava oggi?
              </label>
              <select
                value={umore}
                onChange={e => setUmore(e.target.value)}
                style={{
                  width: '100%', padding: '0.625rem 0.75rem',
                  border: '2px solid #E8F4FD', borderRadius: '10px',
                  fontSize: '0.9rem', fontFamily: 'inherit', background: '#FAFCFF',
                  outline: 'none', cursor: 'pointer',
                }}
              >
                {UMORE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '0.375rem' }}>
                Attività del giorno
              </label>
              <textarea
                value={attivita}
                onChange={e => setAttivita(e.target.value)}
                placeholder="Cosa abbiamo fatto oggi..."
                rows={2}
                style={{
                  width: '100%', padding: '0.625rem 0.75rem',
                  border: '2px solid #E8F4FD', borderRadius: '10px',
                  fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical',
                  background: '#FAFCFF', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '0.375rem' }}>
                Note per i genitori
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Messaggi importanti per la famiglia..."
                rows={2}
                style={{
                  width: '100%', padding: '0.625rem 0.75rem',
                  border: '2px solid #E8F4FD', borderRadius: '10px',
                  fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical',
                  background: '#FAFCFF', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: '0.83rem', color: '#C0392B', background: '#FADBD8', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                {error}
              </p>
            )}

            {/* Bottoni azione */}
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '0.7rem 1rem',
                  background: '#0984E3', color: 'white', border: 'none',
                  borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Salvataggio...' : hasRegistro ? '✓ Aggiorna' : '+ Crea registro'}
              </button>

              {consenso_ok && !bambino.non_fotografabile && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() => {
                      if (!registro) {
                        setError('Salva prima il registro del giorno.')
                        return
                      }
                      fileRef.current?.click()
                    }}
                    disabled={uploading}
                    style={{
                      padding: '0.7rem 1rem',
                      background: '#EAF4FF', color: '#0984E3',
                      border: '2px solid #BDE0FF', borderRadius: '10px',
                      fontSize: '0.875rem', fontWeight: 700,
                      cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      opacity: uploading ? 0.7 : 1,
                    }}
                  >
                    {uploading ? '⏳ Caricamento...' : '📷 Foto/Video'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Media grid */}
          {mediaList.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#555' }}>
                Media ({mediaList.length})
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
                {mediaList.map(m => (
                  <div key={m.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1' }}>
                    {m.tipo === 'foto' ? (
                      <img
                        src={m.file_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%', background: '#222',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem',
                      }}>
                        🎬
                      </div>
                    )}
                    {!m.visibile_a_genitori && (
                      <span style={{
                        position: 'absolute', top: 2, left: 2,
                        background: 'rgba(0,0,0,0.6)', color: 'white',
                        fontSize: '0.65rem', padding: '1px 4px', borderRadius: '4px',
                      }}>
                        privato
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteMedia(m.id)}
                      style={{
                        position: 'absolute', top: 2, right: 2,
                        background: 'rgba(192,57,43,0.85)', color: 'white',
                        border: 'none', borderRadius: '50%',
                        width: 22, height: 22, cursor: 'pointer',
                        fontSize: '0.7rem', fontWeight: 700, lineHeight: '22px',
                        padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffDiarioPage() {
  const router = useRouter()
  const locale = useLocale()

  const [data, setData] = useState(todayISO())
  const [sezione, setSezione] = useState('')
  const [entries, setEntries] = useState<GiornataEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchGiornata = useCallback(async () => {
    setError('')
    try {
      const params = new URLSearchParams({ data })
      if (sezione) params.set('sezione', sezione)
      const res = await fetch(`/api/diario/registri/giornata?${params}`)
      if (res.status === 401) { router.push(`/${locale}/login`); return }
      if (!res.ok) throw new Error()
      setEntries(await res.json())
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
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/staff`)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.5rem', fontFamily: 'inherit' }}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>📖 Diario del giorno</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            {fmtData(data)} · {compilati}/{entries.length} bambini compilati
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Filtri */}
        <div style={{
          background: 'white', borderRadius: '14px', padding: '1rem 1.25rem',
          marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(9,132,227,0.08)',
          display: 'flex', gap: '0.875rem', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#555', marginBottom: '0.3rem' }}>Data</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                border: '2px solid #E8F4FD', borderRadius: '8px',
                fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
          {sezioni.length > 0 && (
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#555', marginBottom: '0.3rem' }}>Sezione</label>
              <select
                value={sezione}
                onChange={e => setSezione(e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem 0.75rem',
                  border: '2px solid #E8F4FD', borderRadius: '8px',
                  fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              >
                <option value="">Tutte</option>
                {sezioni.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <button
            onClick={fetchGiornata}
            style={{
              marginTop: '1.25rem', padding: '0.5rem 1rem',
              background: '#EAF4FF', color: '#0984E3',
              border: '2px solid #BDE0FF', borderRadius: '8px',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
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
            <p style={{ margin: 0 }}>Nessun bambino trovato per questa data.</p>
          </div>
        ) : (
          entries.map(entry => (
            <BambinoCard
              key={entry.bambino.id}
              entry={entry}
              onSaved={fetchGiornata}
            />
          ))
        )}
      </div>
    </div>
  )
}
