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

interface PiattoMenu {
  id: number | null
  descrizione: string
  tipo: string
  is_sostituzione?: boolean
}

interface MenuGiorno {
  settimana_ciclo: number | null
  piatti: Record<string, PiattoMenu[]>
}

interface Gruppo {
  id: number
  nome: string
  colore: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRAVITA_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  lieve:      { bg: '#EAF4FF', text: '#0984E3', border: '#BDE0FF' },
  moderata:   { bg: '#FFF3CD', text: '#856404', border: '#FFEAA7' },
  grave:      { bg: '#FADBD8', text: '#C0392B', border: '#F5B7B1' },
  anafilassi: { bg: '#C0392B', text: 'white', border: '#922B21' },
}

const TIPO_LABEL: Record<string, { label: string; emoji: string; color: string }> = {
  colazione:  { label: 'Colazione',  emoji: '☕', color: '#F39C12' },
  primo:      { label: 'Primo',      emoji: '🍝', color: '#E17055' },
  secondo:    { label: 'Secondo',    emoji: '🍗', color: '#D63031' },
  monopiatto: { label: 'Monopiatto', emoji: '🥘', color: '#6C5CE7' },
  contorno:   { label: 'Contorno',   emoji: '🥦', color: '#00B894' },
  pane:       { label: 'Pane',       emoji: '🍞', color: '#FDCB6E' },
  frutta:     { label: 'Frutta',     emoji: '🍎', color: '#00CEC9' },
  merenda:    { label: 'Merenda',    emoji: '🍪', color: '#A29BFE' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CuocaPappePage() {
  const router = useRouter()
  const locale = useLocale()

  const [gruppi, setGruppi] = useState<Gruppo[]>([])
  const [selectedGruppo, setSelectedGruppo] = useState<number | null>(null)
  const [bambini, setBambini] = useState<BambinoAllergie[]>([])
  const [menu, setMenu] = useState<MenuGiorno | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  // Carica gruppi una volta sola
  useEffect(() => {
    fetch('/api/config/gruppi')
      .then(r => r.json())
      .then(d => {
        const list: Gruppo[] = d.results ?? d
        setGruppi(list)
        if (list.length > 0) setSelectedGruppo(list[0].id)
      })
  }, [])

  const fetchData = useCallback(async () => {
    if (!selectedGruppo) return
    setLoading(true)
    setError('')
    try {
      const [bRes, mRes] = await Promise.all([
        fetch(`/api/meals/allergie/per-sezione?gruppo=${selectedGruppo}`),
        fetch(`/api/pappe/piatti/menu-giorno?data=${today}&gruppo=${selectedGruppo}`),
      ])

      if (bRes.status === 401 || mRes.status === 401) {
        router.push(`/${locale}/login`)
        return
      }

      if (bRes.ok) setBambini(await bRes.json())
      if (mRes.ok) setMenu(await mRes.json())
      else setMenu(null)
    } catch {
      setError('Errore nel caricamento.')
    } finally {
      setLoading(false)
    }
  }, [selectedGruppo, today, locale, router])

  useEffect(() => {
    if (selectedGruppo) fetchData()
  }, [fetchData, selectedGruppo])

  const gruppoCorrente = gruppi.find(g => g.id === selectedGruppo)
  const gravi = bambini.filter(b => b.ha_allergie_gravi)
  const conAllergie = bambini.filter(b => !b.ha_allergie_gravi && b.allergie.length > 0)
  const senzaAllergie = bambini.filter(b => b.allergie.length === 0)

  const piatti = menu?.piatti ?? {}
  const tipiConPiatti = Object.entries(piatti).filter(([, list]) => list.length > 0)

  if (loading && !gruppi.length) {
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

        {/* Selettore gruppo */}
        {gruppi.length > 0 && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,184,148,0.08)', display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#555' }}>Gruppo:</span>
            {gruppi.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGruppo(g.id)}
                style={{
                  padding: '0.4rem 0.875rem',
                  background: selectedGruppo === g.id ? g.colore : '#F8F8F8',
                  color: selectedGruppo === g.id ? 'white' : '#555',
                  border: `2px solid ${selectedGruppo === g.id ? g.colore : '#E0E0E0'}`,
                  borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {g.nome}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#00B894', fontWeight: 600 }}>
            Caricamento...
          </div>
        ) : (
          <>
            {/* Menu del giorno — calcolato dal ciclo */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 4px 16px rgba(0,184,148,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontWeight: 800, color: '#00897B', fontSize: '1rem' }}>
                  📋 Menu del giorno {gruppoCorrente && `— ${gruppoCorrente.nome}`}
                </p>
                {menu?.settimana_ciclo && (
                  <span style={{ background: '#EAF4FF', color: '#0984E3', borderRadius: '6px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                    Settimana {menu.settimana_ciclo}
                  </span>
                )}
              </div>

              {tipiConPiatti.length === 0 ? (
                <p style={{ margin: 0, color: '#888', fontSize: '0.875rem' }}>
                  ℹ️ Nessun menu configurato per questo gruppo oggi.
                  {!menu?.settimana_ciclo && ' Vai in Admin → Menu per configurare il ciclo.'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {tipiConPiatti.map(([tipo, list]) => {
                    const cfg = TIPO_LABEL[tipo] ?? { label: tipo, emoji: '🍴', color: '#888' }
                    return (
                      <div key={tipo} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <span style={{
                          background: `${cfg.color}18`, color: cfg.color,
                          border: `1px solid ${cfg.color}44`,
                          borderRadius: '8px', padding: '0.25rem 0.6rem',
                          fontSize: '0.775rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          {cfg.emoji} {cfg.label}
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', paddingTop: '0.15rem' }}>
                          {list.map((p, i) => (
                            <span key={i} style={{ fontSize: '0.875rem', color: '#333' }}>
                              {p.is_sostituzione && <span style={{ color: '#0984E3', marginRight: '0.25rem' }}>🔄</span>}
                              {p.descrizione}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Alert allergie gravi */}
            {gravi.length > 0 && (
              <div style={{ background: '#C0392B', color: 'white', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 4px 16px rgba(192,57,43,0.25)' }}>
                <p style={{ margin: '0 0 0.75rem', fontWeight: 800, fontSize: '1rem' }}>
                  🚨 ATTENZIONE — Allergie gravi / Anafilassi
                </p>
                {gravi.map(b => (
                  <div key={b.id} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.625rem 0.875rem', marginBottom: '0.5rem' }}>
                    <p style={{ margin: '0 0 0.25rem', fontWeight: 700 }}>{b.nome} {b.cognome}</p>
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

            {/* Bambini con allergie moderate */}
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
                        {b.nome} {b.cognome}
                      </p>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {b.allergie.map(a => {
                          const cfg = GRAVITA_COLOR[a.gravita] ?? GRAVITA_COLOR.lieve
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
            {senzaAllergie.length > 0 && (
              <div style={{ background: 'white', borderRadius: '14px', padding: '1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,184,148,0.08)' }}>
                <p style={{ margin: '0 0 0.75rem', fontWeight: 700, color: '#555', fontSize: '0.9rem' }}>
                  ✅ Nessuna allergia ({senzaAllergie.length} bambini)
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {senzaAllergie.map(b => (
                    <span key={b.id} style={{ background: '#EAFAF1', color: '#00897B', padding: '0.3rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600 }}>
                      {b.nome} {b.cognome}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
