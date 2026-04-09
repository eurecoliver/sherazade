'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Gruppo {
  id: number
  nome: string
  colore: string
}

interface Nota {
  id: number
  testo: string
  data: string
  autore: number
  autore_nome: string
  autore_ruolo: string
  gruppo: number | null
  gruppo_nome: string | null
  creato_at: string
  is_own: boolean
}

interface Me {
  id: number
  role: string
  first_name: string
  last_name: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoToday(): string { return localIso(new Date()) }

function prevDay(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return localIso(d)
}

function nextDay(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return localIso(d)
}

function fmtData(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtOra(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function iniziali(nome: string): string {
  return nome.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

const RUOLO_COLORS: Record<string, { bg: string; text: string }> = {
  admin:         { bg: '#F3F0FF', text: '#6C5CE7' },
  direttrice:    { bg: '#FDF0FF', text: '#9B59B6' },
  coordinatrice: { bg: '#EBF8FF', text: '#2B6CB0' },
  insegnante:    { bg: '#EAF4FF', text: '#0984E3' },
}

const MANAGER_ROLES = ['admin', 'direttrice']

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const router = useRouter()
  const locale = useLocale()

  const [me, setMe] = useState<Me | null>(null)
  const [gruppi, setGruppi] = useState<Gruppo[]>([])
  const [note, setNote] = useState<Nota[]>([])
  const [data, setData] = useState(isoToday())
  const [filtroGruppo, setFiltroGruppo] = useState<number | null | 'tutti'>('tutti')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  // Form nuova nota
  const [testo, setTesto] = useState('')
  const [notaGruppo, setNotaGruppo] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isFuturo = data > isoToday()
  const canManage = me && MANAGER_ROLES.includes(me.role)

  // Carica me + gruppi
  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/config/gruppi').then(r => r.ok ? r.json() : []),
    ])
      .then(([meData, gruppiData]) => {
        setMe(meData)
        const list = Array.isArray(gruppiData) ? gruppiData : (gruppiData.results ?? [])
        setGruppi(list)
      })
      .catch(() => router.push(`/${locale}/login`))
  }, [locale, router])

  // Carica note
  const fetchNote = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ data })
    if (filtroGruppo !== 'tutti' && filtroGruppo !== null) {
      params.set('gruppo', String(filtroGruppo))
    } else if (filtroGruppo === null) {
      params.set('gruppo', '0') // note generali
    }
    try {
      const res = await fetch(`/api/note?${params}`)
      if (res.ok) {
        const d = await res.json()
        setNote(Array.isArray(d) ? d : (d.results ?? []))
      }
    } finally {
      setLoading(false)
    }
  }, [data, filtroGruppo])

  useEffect(() => { fetchNote() }, [fetchNote])

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminare questa nota?')) return
    setDeleting(id)
    try {
      await fetch(`/api/note/${id}`, { method: 'DELETE' })
      setNote(prev => prev.filter(n => n.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const handleSave = async () => {
    if (!testo.trim()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { testo: testo.trim(), data }
      if (notaGruppo !== '') body.gruppo = notaGruppo
      const res = await fetch('/api/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setTesto('')
        setNotaGruppo('')
        fetchNote()
        textareaRef.current?.focus()
      }
    } finally {
      setSaving(false)
    }
  }

  const backDashboard = () => {
    const role = me?.role
    if (MANAGER_ROLES.includes(role ?? '')) {
      router.push(`/${locale}/dashboard/admin`)
    } else {
      router.push(`/${locale}/dashboard/staff`)
    }
  }

  if (!me) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#EAF4FF' }}>
        <p style={{ color: '#0984E3', fontWeight: 600 }}>Caricamento…</p>
      </div>
    )
  }

  // Note filtrate lato client per mostrare quelle "tutti i gruppi" sempre visibili
  const noteFiltrate = filtroGruppo === 'tutti'
    ? note
    : note

  return (
    <div style={{ minHeight: '100vh', background: '#EAF4FF' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #0984E3 0%, #0652DD 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(860px, 96vw)', margin: '0 auto' }}>
          <button
            onClick={backDashboard}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', marginBottom: '0.875rem' }}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', fontWeight: 800 }}>
            📝 Agenda giornaliera
          </h1>
          <p style={{ margin: '0.2rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            Note condivise tra staff — visibili a tutti gli operatori
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'min(860px, 96vw)', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

        {/* ── Navigazione data ────────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '0.875rem 1.25rem', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(9,132,227,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setData(prevDay(data))}
            style={{ width: 36, height: 36, borderRadius: '10px', border: '2px solid #BDE0FF', background: '#EAF4FF', color: '#0984E3', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            ‹
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#333', textTransform: 'capitalize' }}>
              {fmtData(data)}
            </p>
            {data === isoToday() && (
              <span style={{ fontSize: '0.72rem', background: '#EAF4FF', color: '#0984E3', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '10px' }}>
                OGGI
              </span>
            )}
          </div>
          <button
            onClick={() => setData(nextDay(data))}
            disabled={isFuturo}
            style={{ width: 36, height: 36, borderRadius: '10px', border: '2px solid #BDE0FF', background: isFuturo ? '#F7FAFC' : '#EAF4FF', color: isFuturo ? '#CBD5E0' : '#0984E3', cursor: isFuturo ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            ›
          </button>
          {data !== isoToday() && (
            <button
              onClick={() => setData(isoToday())}
              style={{ padding: '0.35rem 0.75rem', background: '#0984E3', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit' }}
            >
              Oggi
            </button>
          )}
        </div>

        {/* ── Filtro gruppi ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {[
            { key: 'tutti', label: '📋 Tutti' },
            { key: null, label: '🌐 Generali' },
            ...gruppi.map(g => ({ key: g.id, label: g.nome, colore: g.colore })),
          ].map(item => {
            const active = filtroGruppo === item.key
            const colore = (item as { colore?: string }).colore
            return (
              <button
                key={String(item.key)}
                onClick={() => setFiltroGruppo(item.key as typeof filtroGruppo)}
                style={{
                  padding: '0.4rem 0.875rem',
                  borderRadius: '20px',
                  border: `2px solid ${active ? (colore || '#0984E3') : '#BDE0FF'}`,
                  background: active ? (colore || '#0984E3') : 'white',
                  color: active ? 'white' : '#555',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {/* ── Lista note ──────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#0984E3' }}>Caricamento…</div>
        ) : note.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(9,132,227,0.06)', marginBottom: '1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ color: '#888', fontSize: '0.95rem', margin: 0 }}>
              Nessuna nota per {data === isoToday() ? 'oggi' : fmtData(data)}.
            </p>
            <p style={{ color: '#aaa', fontSize: '0.82rem', margin: '0.35rem 0 0' }}>
              Usa il form qui sotto per aggiungere la prima.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
            {note.map(n => {
              const ruoloStyle = RUOLO_COLORS[n.autore_ruolo] ?? { bg: '#F7FAFC', text: '#4A5568' }
              const gruppoColore = gruppi.find(g => g.id === n.gruppo)?.colore
              return (
                <div
                  key={n.id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '1rem 1.25rem',
                    boxShadow: '0 4px 20px rgba(9,132,227,0.07)',
                    borderLeft: `4px solid ${gruppoColore || '#BDE0FF'}`,
                    position: 'relative',
                  }}
                >
                  {/* Header nota */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
                    {/* Avatar */}
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: ruoloStyle.bg, color: ruoloStyle.text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.75rem', border: `2px solid ${ruoloStyle.text}22`,
                    }}>
                      {iniziali(n.autore_nome)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#333' }}>
                        {n.autore_nome}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#aaa' }}>
                        {fmtOra(n.creato_at)}
                        {n.gruppo_nome && (
                          <span style={{ marginLeft: '0.5rem', background: `${gruppoColore}22` || '#EAF4FF', color: gruppoColore || '#0984E3', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '8px' }}>
                            {n.gruppo_nome}
                          </span>
                        )}
                        {!n.gruppo_nome && (
                          <span style={{ marginLeft: '0.5rem', background: '#F0FFF4', color: '#38A169', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '8px' }}>
                            Tutti i gruppi
                          </span>
                        )}
                      </p>
                    </div>
                    {/* Ruolo badge */}
                    <span style={{ background: ruoloStyle.bg, color: ruoloStyle.text, fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '10px', flexShrink: 0 }}>
                      {n.autore_ruolo}
                    </span>
                    {/* Delete */}
                    {(n.is_own || canManage) && (
                      <button
                        onClick={() => handleDelete(n.id)}
                        disabled={deleting === n.id}
                        style={{ background: 'none', border: 'none', cursor: deleting === n.id ? 'default' : 'pointer', color: '#FC8181', fontSize: '1rem', padding: '0.25rem', lineHeight: 1, opacity: deleting === n.id ? 0.4 : 0.7, flexShrink: 0 }}
                        title="Elimina nota"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {/* Testo */}
                  <p style={{ margin: 0, color: '#333', fontSize: '0.92rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                    {n.testo}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Form nuova nota ─────────────────────────────────────────────── */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 4px 20px rgba(9,132,227,0.08)',
          border: '2px solid #BDE0FF',
        }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.88rem', color: '#0984E3' }}>
            ✏️ Aggiungi una nota
          </p>
          <textarea
            ref={textareaRef}
            value={testo}
            onChange={e => setTesto(e.target.value)}
            placeholder={`Scrivi una nota per i colleghi… (es. "Francesco ha un graffio sul ginocchio dopo una caduta alle 10:30")`}
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '10px',
              border: '2px solid #BDE0FF',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
              color: '#333',
              lineHeight: 1.5,
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave()
            }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={notaGruppo}
              onChange={e => setNotaGruppo(e.target.value === '' ? '' : Number(e.target.value))}
              style={{ flex: 1, minWidth: '160px', padding: '0.6rem 0.875rem', borderRadius: '10px', border: '2px solid #BDE0FF', fontSize: '0.88rem', fontFamily: 'inherit', background: 'white', color: '#555', cursor: 'pointer' }}
            >
              <option value="">🌐 Tutti i gruppi</option>
              {gruppi.map(g => (
                <option key={g.id} value={g.id}>{g.nome}</option>
              ))}
            </select>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#aaa', flexShrink: 0 }}>
              Ctrl+Enter per inviare
            </p>
            <button
              onClick={handleSave}
              disabled={saving || !testo.trim()}
              style={{
                padding: '0.6rem 1.5rem',
                background: saving || !testo.trim() ? '#A0AEC0' : 'linear-gradient(135deg, #0984E3, #0652DD)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: saving || !testo.trim() ? 'default' : 'pointer',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                flexShrink: 0,
              }}
            >
              {saving ? 'Invio…' : '📤 Pubblica'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
