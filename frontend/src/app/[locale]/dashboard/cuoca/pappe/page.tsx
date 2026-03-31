'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Allergia {
  id: number
  tipo: string
  tipo_label: string
  descrizione: string
  gravita: string
  gravita_label: string
  note_mediche: string
}

interface BambinoAllergie {
  id: number
  nome: string
  cognome: string
  sezione: string
  allergie: Allergia[]
  ha_allergie_gravi: boolean
}

interface Menu {
  id?: number
  data: string
  sezione: string
  primo: string
  secondo: string
  contorno: string
  frutta: string
  merenda: string
  bibita: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRAVITA_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  lieve:      { bg: '#EAF4FF', text: '#0984E3', border: '#BDE0FF' },
  moderata:   { bg: '#FFF3CD', text: '#856404', border: '#FFEAA7' },
  grave:      { bg: '#FADBD8', color: '#C0392B', border: '#F5B7B1' } as never,
  anafilassi: { bg: '#C0392B', text: 'white', border: '#922B21' },
}

function gravita(a: Allergia) {
  const cfg = GRAVITA_COLOR[a.gravita] ?? GRAVITA_COLOR.lieve
  return cfg
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

const MENU_FIELDS: { key: keyof Menu; label: string; emoji: string }[] = [
  { key: 'primo', label: 'Primo', emoji: '🍝' },
  { key: 'secondo', label: 'Secondo', emoji: '🍗' },
  { key: 'contorno', label: 'Contorno', emoji: '🥦' },
  { key: 'frutta', label: 'Frutta', emoji: '🍎' },
  { key: 'merenda', label: 'Merenda', emoji: '🍪' },
  { key: 'bibita', label: 'Bibita', emoji: '🥤' },
]

const EMPTY_MENU = (): Menu => ({
  data: todayISO(), sezione: '',
  primo: '', secondo: '', contorno: '', frutta: '', merenda: '', bibita: '',
})

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CuocaPappePage() {
  const router = useRouter()
  const locale = useLocale()

  const [bambini, setBambini] = useState<BambinoAllergie[]>([])
  const [sezioneFilter, setSezioneFilter] = useState('')
  const [menu, setMenu] = useState<Menu>(EMPTY_MENU())
  const [menuId, setMenuId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const sezioni = Array.from(new Set(bambini.map(b => b.sezione).filter(Boolean))).sort()

  const fetchData = useCallback(async () => {
    setError('')
    try {
      const params = new URLSearchParams()
      if (sezioneFilter) params.set('sezione', sezioneFilter)

      const [bRes, mRes] = await Promise.all([
        fetch(`/api/meals/allergie/per-sezione?${params}`),
        fetch(`/api/meals/menu/oggi?${params}`),
      ])

      if (bRes.status === 401 || mRes.status === 401) {
        router.push(`/${locale}/login`)
        return
      }

      if (bRes.ok) setBambini(await bRes.json())
      if (mRes.ok) {
        const menus: Menu[] = await mRes.json()
        if (menus.length > 0) {
          setMenuId(menus[0].id ?? null)
          setMenu(menus[0])
        } else {
          setMenuId(null)
          setMenu({ ...EMPTY_MENU(), sezione: sezioneFilter })
        }
      }
    } catch {
      setError('Errore nel caricamento.')
    } finally {
      setLoading(false)
    }
  }, [sezioneFilter, locale, router])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  const handleSaveMenu = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const body = { ...menu, sezione: sezioneFilter }
      const res = menuId
        ? await fetch(`/api/meals/menu/${menuId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/meals/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

      if (!res.ok) {
        const d = await res.json()
        setError(d.detail || JSON.stringify(d))
        return
      }
      const data = await res.json()
      setMenuId(data.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const filtered = sezioneFilter
    ? bambini.filter(b => b.sezione === sezioneFilter)
    : bambini

  const gravi = filtered.filter(b => b.ha_allergie_gravi)
  const conAllergie = filtered.filter(b => !b.ha_allergie_gravi && b.allergie.length > 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#EAFAF1' }}>
        <p style={{ color: '#00B894', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EAFAF1' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #00B894 0%, #00897B 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/cuoca`)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.5rem', fontFamily: 'inherit' }}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>🍽️ Pappe del giorno</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Filtro sezione */}
        {sezioni.length > 0 && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,184,148,0.08)', display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#555' }}>Sezione:</span>
            <button
              onClick={() => setSezioneFilter('')}
              style={{ padding: '0.4rem 0.875rem', background: !sezioneFilter ? '#00B894' : '#EAFAF1', color: !sezioneFilter ? 'white' : '#00B894', border: `2px solid ${!sezioneFilter ? '#00B894' : '#A8E6CF'}`, borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Tutte
            </button>
            {sezioni.map(s => (
              <button
                key={s}
                onClick={() => setSezioneFilter(s)}
                style={{ padding: '0.4rem 0.875rem', background: sezioneFilter === s ? '#00B894' : '#EAFAF1', color: sezioneFilter === s ? 'white' : '#00B894', border: `2px solid ${sezioneFilter === s ? '#00B894' : '#A8E6CF'}`, borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Alert allergie gravi */}
        {gravi.length > 0 && (
          <div style={{ background: '#C0392B', color: 'white', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 4px 16px rgba(192,57,43,0.25)' }}>
            <p style={{ margin: '0 0 0.75rem', fontWeight: 800, fontSize: '1rem' }}>
              🚨 ATTENZIONE — Allergie gravi / Anafilassi
            </p>
            {gravi.map(b => (
              <div key={b.id} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.625rem 0.875rem', marginBottom: '0.5rem' }}>
                <p style={{ margin: '0 0 0.25rem', fontWeight: 700 }}>{b.nome} {b.cognome} {b.sezione && `(Sez. ${b.sezione})`}</p>
                {b.allergie.filter(a => a.gravita === 'grave' || a.gravita === 'anafilassi').map(a => (
                  <p key={a.id} style={{ margin: '0 0 0.2rem', fontSize: '0.875rem' }}>
                    ⚠️ {a.tipo_label}: <strong>{a.descrizione}</strong> — {a.gravita_label}
                    {a.note_mediche && <span style={{ opacity: 0.85 }}> · {a.note_mediche}</span>}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Lista bambini con allergie */}
        {conAllergie.length > 0 && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,184,148,0.08)' }}>
            <p style={{ margin: '0 0 0.875rem', fontWeight: 700, color: '#555', fontSize: '0.9rem' }}>
              ⚠️ Bambini con allergie / intolleranze
            </p>
            {conAllergie.map(b => (
              <div key={b.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.625rem 0', borderBottom: '1px solid #F0FAF5' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F39C12', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                  {b.nome.charAt(0)}{b.cognome.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 0.3rem', fontWeight: 700, color: '#333', fontSize: '0.9rem' }}>
                    {b.nome} {b.cognome} {b.sezione && <span style={{ color: '#aaa', fontWeight: 400 }}>· Sez. {b.sezione}</span>}
                  </p>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {b.allergie.map(a => {
                      const cfg = gravita(a)
                      return (
                        <span key={a.id} style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.775rem', fontWeight: 600 }}>
                          {a.descrizione}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bambini senza allergie */}
        {filtered.filter(b => b.allergie.length === 0).length > 0 && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,184,148,0.08)' }}>
            <p style={{ margin: '0 0 0.75rem', fontWeight: 700, color: '#555', fontSize: '0.9rem' }}>
              ✅ Nessuna allergia ({filtered.filter(b => b.allergie.length === 0).length} bambini)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {filtered.filter(b => b.allergie.length === 0).map(b => (
                <span key={b.id} style={{ background: '#EAFAF1', color: '#00897B', padding: '0.3rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600 }}>
                  {b.nome} {b.cognome}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Form menu del giorno */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem 1.25rem', boxShadow: '0 4px 16px rgba(0,184,148,0.08)' }}>
          <p style={{ margin: '0 0 1.25rem', fontWeight: 800, color: '#00897B', fontSize: '1rem' }}>
            📋 Menu del giorno {sezioneFilter && `— Sez. ${sezioneFilter}`}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.875rem' }}>
            {MENU_FIELDS.map(({ key, label, emoji }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#555', marginBottom: '0.3rem' }}>
                  {emoji} {label}
                </label>
                <input
                  type="text"
                  value={(menu[key] as string) ?? ''}
                  onChange={e => setMenu(m => ({ ...m, [key]: e.target.value }))}
                  placeholder={`es. ${label.toLowerCase()}...`}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem',
                    border: '2px solid #D5F5E3', borderRadius: '10px',
                    fontSize: '0.875rem', fontFamily: 'inherit',
                    background: '#FAFFFE', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveMenu}
            disabled={saving}
            style={{
              marginTop: '1.25rem', width: '100%',
              padding: '0.875rem',
              background: saved ? '#27AE60' : '#00B894',
              color: 'white', border: 'none',
              borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: saving ? 0.7 : 1, transition: 'background 0.3s',
            }}
          >
            {saving ? 'Salvataggio...' : saved ? '✓ Menu salvato!' : menuId ? '✓ Aggiorna menu' : '+ Salva menu del giorno'}
          </button>
        </div>
      </div>
    </div>
  )
}
