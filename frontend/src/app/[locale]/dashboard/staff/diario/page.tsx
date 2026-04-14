'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

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

interface Tag {
  id: number
  nome: string
  colore: string
  attivo: boolean
}

interface Registro {
  id: number
  umore: string
  attivita_descrizione: string
  note_giornata: string
  autore_nome: string
  aggiornato_at: string
  sonno_inizio: string | null
  sonno_fine: string | null
  popo: boolean
  tags_cosa_portare: Tag[]
  media: MediaItem[]
}

interface GiornataEntry {
  bambino: Bambino
  consenso_ok: boolean
  consenso_msg: string
  registro: Registro | null
}

interface RowState {
  umore: string
  attivita: string
  note: string
  sonno_inizio: string
  sonno_fine: string
  popo: boolean
  tagIds: number[]
  saving: boolean
  saved: boolean
  error: string
  mediaOpen: boolean
  uploading: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UMORE_OPTIONS = [
  { value: 'felice', emoji: '😊' },
  { value: 'sereno', emoji: '🙂' },
  { value: 'stanco', emoji: '😴' },
  { value: 'agitato', emoji: '😤' },
  { value: 'triste', emoji: '😢' },
]

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function initRowState(registro: Registro | null): RowState {
  return {
    umore: registro?.umore ?? '',
    attivita: registro?.attivita_descrizione ?? '',
    note: registro?.note_giornata ?? '',
    sonno_inizio: registro?.sonno_inizio ?? '',
    sonno_fine: registro?.sonno_fine ?? '',
    popo: registro?.popo ?? false,
    tagIds: registro?.tags_cosa_portare?.map(t => t.id) ?? [],
    saving: false,
    saved: false,
    error: '',
    mediaOpen: false,
    uploading: false,
  }
}

// ─── TagSelector inline ───────────────────────────────────────────────────────

const TAG_PALETTE = [
  '#0984E3', '#00B894', '#E17055', '#6C5CE7', '#FDCB6E',
  '#00CEC9', '#E84393', '#55EFC4', '#F39C12', '#A29BFE',
]

function nextPaletteColor(usedColors: string[]): string {
  const used = usedColors.map(c => c.toLowerCase())
  for (const color of TAG_PALETTE) {
    if (!used.includes(color.toLowerCase())) return color
  }
  return TAG_PALETTE[usedColors.length % TAG_PALETTE.length]
}

function TagSelector({
  allTags,
  selectedIds,
  canDelete,
  onChange,
  onNewTag,
  onDeleteTag,
}: {
  allTags: Tag[]
  selectedIds: number[]
  canDelete: boolean
  onChange: (ids: number[]) => void
  onNewTag: (tag: Tag) => void
  onDeleteTag: (id: number) => void
}) {
  const [newNome, setNewNome] = useState('')
  const [newColore, setNewColore] = useState('#0984E3')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const toggle = (id: number) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id])

  const creaTag = async () => {
    const nome = newNome.trim()
    if (!nome) return
    setCreating(true)
    try {
      const res = await fetch('/api/diario/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, colore: newColore }),
      })
      if (res.ok) {
        const tag: Tag = await res.json()
        onNewTag(tag)
        onChange([...selectedIds, tag.id])
        setNewNome('')
        setShowForm(false)
      }
    } finally {
      setCreating(false)
    }
  }

  const eliminaTag = async (id: number) => {
    if (!confirm('Disattivare questo tag? Rimarrà nei diari storici.')) return
    const res = await fetch(`/api/diario/tags/${id}`, { method: 'DELETE' })
    if (res.ok) onDeleteTag(id)
  }

  const active = allTags.filter(t => t.attivo)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
      {active.map(t => {
        const sel = selectedIds.includes(t.id)
        return (
          <div key={t.id} style={{ display: 'inline-flex', alignItems: 'stretch', height: '1.6rem' }}>
            <button
              type="button"
              onClick={() => toggle(t.id)}
              style={{
                padding: '0 0.55rem',
                background: sel ? t.colore : `${t.colore}22`,
                color: sel ? 'white' : t.colore,
                border: `1.5px solid ${t.colore}`,
                borderRadius: canDelete ? '12px 0 0 12px' : '12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                lineHeight: 1,
              }}
            >
              {t.nome}
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => eliminaTag(t.id)}
                title="Disattiva tag"
                style={{
                  padding: '0 0.35rem',
                  background: '#FFF0F0',
                  color: '#C0392B',
                  border: `1.5px solid ${t.colore}`,
                  borderLeft: 'none',
                  borderRadius: '0 12px 12px 0',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                ×
              </button>
            )}
          </div>
        )
      })}

      {!showForm ? (
        <button
          type="button"
          onClick={() => {
            setNewColore(nextPaletteColor(allTags.map(t => t.colore)))
            setShowForm(true)
          }}
          style={{
            padding: '0.2rem 0.5rem',
            background: '#F0F6FF', color: '#0984E3',
            border: '1.5px dashed #BDE0FF', borderRadius: '12px',
            fontSize: '0.75rem', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + tag
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newNome}
            onChange={e => setNewNome(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); creaTag() } if (e.key === 'Escape') setShowForm(false) }}
            placeholder="Nome tag"
            autoFocus
            style={{
              width: 90, padding: '0.2rem 0.4rem',
              border: '1px solid #CBD5E0', borderRadius: '6px',
              fontSize: '0.75rem', fontFamily: 'inherit',
            }}
          />
          <input
            type="color"
            value={newColore}
            onChange={e => setNewColore(e.target.value)}
            style={{ width: 28, height: 24, padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          />
          <button
            type="button"
            onClick={creaTag}
            disabled={creating || !newNome.trim()}
            style={{
              padding: '0.2rem 0.5rem',
              background: '#0984E3', color: 'white',
              border: 'none', borderRadius: '6px',
              fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            style={{
              padding: '0.2rem 0.4rem',
              background: '#F5F5F5', color: '#888',
              border: 'none', borderRadius: '6px',
              fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ─── BambinoRow ───────────────────────────────────────────────────────────────

function BambinoRow({
  entry,
  row,
  allTags,
  canDeleteTags,
  dataStr,
  onRowChange,
  onSaved,
  onNewTag,
  onDeleteTag,
}: {
  entry: GiornataEntry
  row: RowState
  allTags: Tag[]
  canDeleteTags: boolean
  dataStr: string
  onRowChange: (delta: Partial<RowState>) => void
  onSaved: (entry: GiornataEntry) => void
  onNewTag: (tag: Tag) => void
  onDeleteTag: (id: number) => void
}) {
  const { bambino, consenso_ok, registro } = entry
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    onRowChange({ saving: true, error: '', saved: false })
    try {
      const body = {
        bambino: bambino.id,
        data: dataStr,
        umore: row.umore,
        attivita_descrizione: row.attivita,
        note_giornata: row.note,
        sonno_inizio: row.sonno_inizio || null,
        sonno_fine: row.sonno_fine || null,
        popo: row.popo,
        tags_cosa_portare: row.tagIds,
      }
      const res = registro
        ? await fetch(`/api/diario/registri/${registro.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/diario/registri', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      if (!res.ok) {
        const d = await res.json()
        onRowChange({ saving: false, error: d.detail || 'Errore salvataggio.' })
        return
      }
      const updated: Registro = await res.json()
      onSaved({ ...entry, registro: updated })
      onRowChange({ saving: false, saved: true, error: '' })
      setTimeout(() => onRowChange({ saved: false }), 2500)
    } catch {
      onRowChange({ saving: false, error: 'Errore di rete.' })
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !registro) return
    onRowChange({ uploading: true })
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('registro', String(registro.id))
        fd.append('file', file)
        fd.append('tipo', file.type.startsWith('video/') ? 'video' : 'foto')
        await fetch('/api/diario/media', { method: 'POST', body: fd })
      }
      // Reload to refresh media list
      onSaved(entry)
    } finally {
      onRowChange({ uploading: false })
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDeleteMedia = async (mediaId: number) => {
    if (!confirm('Eliminare questo media?')) return
    await fetch(`/api/diario/media/${mediaId}`, { method: 'DELETE' })
    onSaved(entry)
  }

  const mediaList = registro?.media ?? []
  const hasRegistro = registro !== null

  return (
    <div style={{
      background: 'white',
      borderRadius: '14px',
      marginBottom: '0.625rem',
      boxShadow: '0 1px 6px rgba(9,132,227,0.07)',
      overflow: 'hidden',
      border: hasRegistro ? '1.5px solid #D5F5E3' : '1.5px solid #EAF4FF',
    }}>
      {/* Riga principale */}
      <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

        {/* Riga 1: nome + umore + save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          {/* Avatar + nome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 140 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: hasRegistro ? '#27AE60' : '#0984E3',
              color: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem',
            }}>
              {bambino.nome[0]}{bambino.cognome[0]}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#222', fontSize: '0.9rem', lineHeight: 1.2 }}>
                {bambino.cognome} {bambino.nome}
              </p>
              {bambino.sezione && (
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#aaa' }}>{bambino.sezione}</p>
              )}
            </div>
          </div>

          {/* Umore selector */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {UMORE_OPTIONS.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => onRowChange({ umore: row.umore === o.value ? '' : o.value })}
                title={o.value}
                style={{
                  width: 32, height: 32,
                  fontSize: '1.1rem',
                  background: row.umore === o.value ? '#EAF4FF' : 'transparent',
                  border: row.umore === o.value ? '2px solid #0984E3' : '2px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                  opacity: row.umore && row.umore !== o.value ? 0.4 : 1,
                  transition: 'all 0.1s',
                }}
              >
                {o.emoji}
              </button>
            ))}
          </div>

          {/* Salva */}
          <button
            onClick={handleSave}
            disabled={row.saving}
            style={{
              padding: '0.4rem 0.875rem',
              background: row.saved ? '#27AE60' : '#0984E3',
              color: 'white', border: 'none',
              borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
              cursor: row.saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: row.saving ? 0.7 : 1,
              flexShrink: 0,
              transition: 'background 0.3s',
            }}
          >
            {row.saving ? '...' : row.saved ? '✓' : '💾'}
          </button>
        </div>

        {/* Riga 2: sonno + popò */}
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>😴 Sonno</span>
            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>dalle</span>
            <input
              type="time"
              value={row.sonno_inizio}
              onChange={e => onRowChange({ sonno_inizio: e.target.value })}
              style={{
                padding: '0.2rem 0.375rem', border: '1.5px solid #E2E8F0',
                borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'inherit', width: 86,
              }}
            />
            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>alle</span>
            <input
              type="time"
              value={row.sonno_fine}
              onChange={e => onRowChange({ sonno_fine: e.target.value })}
              style={{
                padding: '0.2rem 0.375rem', border: '1.5px solid #E2E8F0',
                borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'inherit', width: 86,
              }}
            />
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            cursor: 'pointer',
            background: row.popo ? '#FFF9E6' : '#F7FAFC',
            border: `1.5px solid ${row.popo ? '#F6AD55' : '#E2E8F0'}`,
            borderRadius: '8px', padding: '0.2rem 0.6rem',
          }}>
            <input
              type="checkbox"
              checked={row.popo}
              onChange={e => onRowChange({ popo: e.target.checked })}
              style={{ width: 14, height: 14, cursor: 'pointer', margin: 0 }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: row.popo ? '#744210' : '#666' }}>💩</span>
          </label>
        </div>

        {/* Riga 3: tag */}
        <TagSelector
          allTags={allTags}
          selectedIds={row.tagIds}
          canDelete={canDeleteTags}
          onChange={ids => onRowChange({ tagIds: ids })}
          onNewTag={onNewTag}
          onDeleteTag={onDeleteTag}
        />

        {/* Riga 4: note */}
        <input
          type="text"
          value={row.note}
          onChange={e => onRowChange({ note: e.target.value })}
          placeholder="Note per i genitori..."
          style={{
            width: '100%', padding: '0.375rem 0.625rem',
            border: '1.5px solid #E8F4FD', borderRadius: '8px',
            fontSize: '0.8rem', fontFamily: 'inherit',
            boxSizing: 'border-box', background: '#FAFCFF',
          }}
        />

        {/* Riga 5: media + errore */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {consenso_ok && !bambino.non_fotografabile && (
            <>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleUpload}
              />
              <button
                type="button"
                onClick={() => {
                  if (!hasRegistro) { onRowChange({ error: 'Salva prima il registro.' }); return }
                  fileRef.current?.click()
                }}
                disabled={row.uploading}
                style={{
                  padding: '0.3rem 0.625rem',
                  background: '#EAF4FF', color: '#0984E3',
                  border: '1.5px solid #BDE0FF', borderRadius: '8px',
                  fontSize: '0.78rem', fontWeight: 600,
                  cursor: row.uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {row.uploading ? '⏳' : `📷 ${mediaList.length > 0 ? mediaList.length : '+'}`}
              </button>
              {mediaList.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRowChange({ mediaOpen: !row.mediaOpen })}
                  style={{
                    padding: '0.3rem 0.625rem',
                    background: 'transparent', color: '#888',
                    border: '1.5px solid #E2E8F0', borderRadius: '8px',
                    fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {row.mediaOpen ? '▲ nascondi' : `▼ vedi ${mediaList.length} media`}
                </button>
              )}
            </>
          )}
          {row.error && (
            <span style={{ fontSize: '0.78rem', color: '#C0392B' }}>⚠ {row.error}</span>
          )}
        </div>
      </div>

      {/* Media grid (collassabile) */}
      {row.mediaOpen && mediaList.length > 0 && (
        <div style={{ padding: '0 1rem 0.75rem', borderTop: '1px solid #F0F6FF' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '0.4rem', marginTop: '0.625rem' }}>
            {mediaList.map(m => (
              <div key={m.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1' }}>
                {m.tipo === 'foto' ? (
                  <img src={m.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    🎬
                  </div>
                )}
                {!m.visibile_a_genitori && (
                  <span style={{ position: 'absolute', top: 2, left: 2, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.6rem', padding: '1px 3px', borderRadius: '3px' }}>
                    privato
                  </span>
                )}
                <button
                  onClick={() => handleDeleteMedia(m.id)}
                  style={{
                    position: 'absolute', top: 2, right: 2,
                    background: 'rgba(192,57,43,0.85)', color: 'white',
                    border: 'none', borderRadius: '50%',
                    width: 20, height: 20, cursor: 'pointer',
                    fontSize: '0.65rem', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
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
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffDiarioPage() {
  const router = useRouter()
  const locale = useLocale()

  const [data, setData] = useState(todayISO())
  const [gruppo, setGruppo] = useState('')
  const [entries, setEntries] = useState<GiornataEntry[]>([])
  const [rows, setRows] = useState<Record<number, RowState>>({})
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState('')

  // Carica ruolo utente per decidere se mostrare soft-delete tag
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.role) setUserRole(d.role) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/diario/tags')
      .then(r => r.ok ? r.json() : [])
      .then(d => setAllTags(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {})
  }, [])

  const fetchGiornata = useCallback(async () => {
    setError('')
    try {
      const params = new URLSearchParams({ data })
      if (gruppo) params.set('gruppo', gruppo)
      const res = await fetch(`/api/diario/registri/giornata?${params}`)
      if (res.status === 401) { router.push(`/${locale}/login`); return }
      if (!res.ok) throw new Error()
      const list: GiornataEntry[] = await res.json()
      setEntries(list)
      const newRows: Record<number, RowState> = {}
      for (const e of list) newRows[e.bambino.id] = initRowState(e.registro)
      setRows(newRows)
    } catch {
      setError('Errore nel caricamento.')
    } finally {
      setLoading(false)
    }
  }, [data, gruppo, locale, router])

  useEffect(() => {
    setLoading(true)
    fetchGiornata()
  }, [fetchGiornata])

  const updateRow = (bambinoId: number, delta: Partial<RowState>) =>
    setRows(prev => ({ ...prev, [bambinoId]: { ...prev[bambinoId], ...delta } }))

  const handleSaved = (bambinoId: number, updated: GiornataEntry) => {
    setEntries(prev => prev.map(e => e.bambino.id === bambinoId ? updated : e))
    // Re-fetch to get fresh media list
    fetchGiornata()
  }

  const handleDeleteTag = (tagId: number) => {
    setAllTags(prev => prev.map(t => t.id === tagId ? { ...t, attivo: false } : t))
    // Rimuovi dai row state dove era selezionato
    setRows(prev => {
      const next = { ...prev }
      for (const id in next) {
        next[id] = { ...next[id], tagIds: next[id].tagIds.filter(t => t !== tagId) }
      }
      return next
    })
  }

  const gruppi = Array.from(new Set(entries.map(e => e.bambino.sezione).filter(Boolean))).sort()
  const compilati = entries.filter(e => e.registro !== null).length
  const canDeleteTags = ['admin', 'direttrice', 'coordinatrice', 'insegnante'].includes(userRole)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#EAF4FF' }}>
        <p style={{ color: '#0984E3', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EAF4FF' }}>

      <div style={{ background: 'linear-gradient(135deg, #0984E3 0%, #0652DD 100%)', padding: '1.25rem 1.25rem 1.75rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(1080px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button
              onClick={() => router.push(`/${locale}/dashboard/staff`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>📖 Diario del giorno</h1>
          <p style={{ margin: '0.2rem 0 0', opacity: 0.85, fontSize: '0.85rem', textTransform: 'capitalize' }}>
            {fmtData(data)} · {compilati}/{entries.length} compilati
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'min(1080px, 96vw)', margin: '0 auto', padding: '1.25rem 1rem' }}>

        {/* Filtri */}
        <div style={{
          background: 'white', borderRadius: '14px', padding: '0.875rem 1.25rem',
          marginBottom: '1rem', boxShadow: '0 2px 8px rgba(9,132,227,0.08)',
          display: 'flex', gap: '0.875rem', flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#555', marginBottom: '0.3rem' }}>Data</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', border: '2px solid #E8F4FD', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}
            />
          </div>
          {gruppi.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#555', marginBottom: '0.3rem' }}>Gruppo</label>
              <select
                value={gruppo}
                onChange={e => setGruppo(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', border: '2px solid #E8F4FD', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}
              >
                <option value="">Tutti</option>
                {gruppi.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <button
            onClick={fetchGiornata}
            style={{ padding: '0.45rem 1rem', background: '#EAF4FF', color: '#0984E3', border: '2px solid #BDE0FF', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ↻
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
          entries.map(entry => (
            <BambinoRow
              key={entry.bambino.id}
              entry={entry}
              row={rows[entry.bambino.id] ?? initRowState(entry.registro)}
              allTags={allTags}
              canDeleteTags={canDeleteTags}
              dataStr={data}
              onRowChange={delta => updateRow(entry.bambino.id, delta)}
              onSaved={updated => handleSaved(entry.bambino.id, updated)}
              onNewTag={tag => setAllTags(prev => [...prev, tag])}
              onDeleteTag={handleDeleteTag}
            />
          ))
        )}
      </div>
    </div>
  )
}
