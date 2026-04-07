'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Figlio {
  id: number
  nome: string
  cognome: string
  gruppo_id: number | null
}

interface RegistroPasto {
  id: number
  data: string
  colazione_quantita: string
  primo_quantita: string
  secondo_quantita: string
  monopiatto_quantita: string
  contorno_quantita: string
  pane_quantita: string
  frutta_quantita: string
  merenda_quantita: string
  note_pasto: string
  compilato_da_nome: string
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

// ─── Constants ────────────────────────────────────────────────────────────────

const QUANTITA_ICON: Record<string, { icon: string; label: string; color: string }> = {
  tutto:  { icon: '🍽️',  label: 'Tutto',  color: '#27AE60' },
  meta:   { icon: '½',   label: 'Metà',   color: '#F39C12' },
  poco:   { icon: '🥄',  label: 'Poco',   color: '#E17055' },
  nulla:  { icon: '❌',  label: 'Nulla',  color: '#C0392B' },
  '':     { icon: '—',   label: 'N/D',    color: '#aaa' },
}

const TIPO_COLOR: Record<string, string> = {
  colazione: '#F39C12', primo: '#E17055', secondo: '#D63031',
  monopiatto: '#6C5CE7', contorno: '#00B894', pane: '#FDCB6E',
  frutta: '#00CEC9', merenda: '#A29BFE',
}

const PORTATE_LABEL: Record<string, { label: string; emoji: string }> = {
  colazione:  { label: 'Colazione',  emoji: '🥛' },
  primo:      { label: 'Primo',      emoji: '🍝' },
  secondo:    { label: 'Secondo',    emoji: '🍗' },
  monopiatto: { label: 'Monopiatto', emoji: '🍲' },
  contorno:   { label: 'Contorno',   emoji: '🥦' },
  pane:       { label: 'Pane',       emoji: '🍞' },
  frutta:     { label: 'Frutta',     emoji: '🍎' },
  merenda:    { label: 'Merenda',    emoji: '🍪' },
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ─── PastoCard ────────────────────────────────────────────────────────────────

function PastoCard({ registro, menu }: { registro: RegistroPasto; menu: MenuGiorno | null }) {
  const CAMPO_A_TIPO: Record<string, string> = {
    colazione_quantita: 'colazione',
    primo_quantita: 'primo',
    secondo_quantita: 'secondo',
    monopiatto_quantita: 'monopiatto',
    contorno_quantita: 'contorno',
    pane_quantita: 'pane',
    frutta_quantita: 'frutta',
    merenda_quantita: 'merenda',
  }

  // Portate che hanno almeno una quantità registrata o un piatto nel menu
  const portateAttive = Object.entries(CAMPO_A_TIPO).filter(([campo, tipo]) => {
    const q = (registro as Record<string, string>)[campo]
    const haMenu = (menu?.piatti[tipo]?.length ?? 0) > 0
    return q || haMenu
  })

  return (
    <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', marginBottom: '1.25rem', boxShadow: '0 4px 20px rgba(225,112,85,0.10)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ margin: 0, fontWeight: 800, color: '#333', fontSize: '1rem', textTransform: 'capitalize' }}>
          {fmtData(registro.data)}
        </p>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.775rem', color: '#aaa' }}>
          Compilato da {registro.compilato_da_nome}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {portateAttive.map(([campo, tipo]) => {
          const q = (registro as Record<string, string>)[campo] ?? ''
          const qi = QUANTITA_ICON[q] ?? QUANTITA_ICON['']
          const piatti = menu?.piatti[tipo] ?? []
          const { label, emoji } = PORTATE_LABEL[tipo] ?? { label: tipo, emoji: '🍽️' }

          return (
            <div key={campo} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '12px', background: q ? `${qi.color}18` : '#F5F5F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{qi.icon}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: qi.color, marginTop: '0.1rem' }}>{qi.label}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: TIPO_COLOR[tipo] ?? '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {emoji} {label}
                </p>
                {piatti.length > 0 && (
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.9rem', color: '#444', fontWeight: 500 }}>
                    {piatti.map(p => p.descrizione).join(', ')}
                    {piatti.some(p => p.is_sostituzione) && <span style={{ marginLeft: 4, fontSize: '0.72rem', color: '#6C5CE7' }}>🔄</span>}
                  </p>
                )}
              </div>
              {q && (
                <span style={{ background: `${qi.color}20`, color: qi.color, padding: '0.25rem 0.625rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {qi.label}
                </span>
              )}
            </div>
          )
        })}

        {portateAttive.length === 0 && (
          <p style={{ margin: 0, color: '#aaa', fontSize: '0.875rem', fontStyle: 'italic' }}>Nessun dato registrato per questo giorno.</p>
        )}
      </div>

      {registro.note_pasto && (
        <div style={{ marginTop: '1rem', background: '#FFF3EE', borderRadius: '10px', padding: '0.875rem' }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem', fontWeight: 700, color: '#E17055', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Note dell'insegnante
          </p>
          <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: 1.5 }}>{registro.note_pasto}</p>
        </div>
      )}
    </div>
  )
}

// ─── MenuOggiCard ─────────────────────────────────────────────────────────────

function MenuOggiCard({ menu }: { menu: MenuGiorno }) {
  const tipi = Object.entries(menu.piatti).filter(([, list]) => list.length > 0)
  if (tipi.length === 0) return null
  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(225,112,85,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p style={{ margin: 0, fontWeight: 800, color: '#E17055', fontSize: '0.9rem' }}>📋 Menu di oggi</p>
        {menu.settimana_ciclo && (
          <span style={{ background: '#FFF3EE', color: '#E17055', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
            Settimana {menu.settimana_ciclo}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {tipi.map(([tipo, list]) => (
          list.map((p, i) => {
            const { emoji } = PORTATE_LABEL[tipo] ?? { emoji: '🍽️' }
            return (
              <span key={`${tipo}-${i}`} style={{ background: `${TIPO_COLOR[tipo] ?? '#888'}18`, color: TIPO_COLOR[tipo] ?? '#888', border: `1px solid ${TIPO_COLOR[tipo] ?? '#888'}44`, borderRadius: '8px', padding: '0.2rem 0.625rem', fontSize: '0.825rem', fontWeight: 600 }}>
                {emoji} {p.descrizione}
              </span>
            )
          })
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GenitorePappePage() {
  const router = useRouter()
  const locale = useLocale()

  const [figli, setFigli] = useState<Figlio[]>([])
  const [selectedFiglio, setSelectedFiglio] = useState<number | null>(null)
  const [registri, setRegistri] = useState<RegistroPasto[]>([])
  const [menuOggi, setMenuOggi] = useState<MenuGiorno | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPasti, setLoadingPasti] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/bambini')
      .then(res => {
        if (res.status === 401) { router.push(`/${locale}/login`); return null }
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => {
        if (!data) return
        const list = data.results ?? data
        setFigli(list)
        if (list.length === 1) setSelectedFiglio(list[0].id)
      })
      .catch(() => setError('Errore nel caricamento.'))
      .finally(() => setLoading(false))
  }, [locale, router])

  const fetchPasti = useCallback(async (figlio: Figlio) => {
    setLoadingPasti(true); setError('')
    try {
      const oggi = new Date().toISOString().split('T')[0]
      const promises: Promise<Response>[] = [
        fetch(`/api/meals/pasti/mio-figlio?bambino=${figlio.id}`),
      ]
      if (figlio.gruppo_id) {
        promises.push(fetch(`/api/pappe/piatti/menu-giorno?data=${oggi}&gruppo=${figlio.gruppo_id}`))
      }
      const [pastiRes, menuRes] = await Promise.all(promises)
      if (!pastiRes.ok) throw new Error()
      setRegistri(await pastiRes.json())
      if (menuRes?.ok) setMenuOggi(await menuRes.json())
      else setMenuOggi(null)
    } catch {
      setError('Errore nel caricamento dei pasti.')
    } finally {
      setLoadingPasti(false)
    }
  }, [])

  useEffect(() => {
    if (selectedFiglio !== null) {
      const figlio = figli.find(f => f.id === selectedFiglio)
      if (figlio) fetchPasti(figlio)
    }
  }, [selectedFiglio, figli, fetchPasti])

  const figlioSelezionato = figli.find(f => f.id === selectedFiglio)
  const oggi = new Date().toISOString().split('T')[0]
  const registroOggi = registri.find(r => r.data === oggi)
  const registriStorico = registri.filter(r => r.data !== oggi)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#FFF3EE' }}>
        <p style={{ color: '#E17055', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF3EE' }}>

      <div style={{ background: 'linear-gradient(135deg, #E17055 0%, #C0392B 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <button onClick={() => router.push(`/${locale}/dashboard/genitore`)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.5rem', fontFamily: 'inherit' }}>
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>🥣 Pappe di {figlioSelezionato?.nome ?? '...'}</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            Menu del giorno e storico pasti
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {figli.length > 1 && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(225,112,85,0.08)' }}>
            <p style={{ margin: '0 0 0.625rem', fontSize: '0.82rem', fontWeight: 700, color: '#555' }}>Seleziona figlio</p>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              {figli.map(f => (
                <button key={f.id} onClick={() => setSelectedFiglio(f.id)}
                  style={{ padding: '0.5rem 1rem', background: selectedFiglio === f.id ? '#E17055' : '#FFF3EE', color: selectedFiglio === f.id ? 'white' : '#E17055', border: `2px solid ${selectedFiglio === f.id ? '#E17055' : '#FFD4B3'}`, borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {f.nome} {f.cognome}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        {selectedFiglio === null && figli.length > 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👆</div>
            <p style={{ margin: 0 }}>Seleziona un bambino.</p>
          </div>
        ) : loadingPasti ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#E17055', fontWeight: 600 }}>Caricamento...</div>
        ) : (
          <>
            {/* Menu di oggi */}
            {menuOggi && <MenuOggiCard menu={menuOggi} />}

            {/* Oggi */}
            <p style={{ margin: '0 0 0.875rem', fontWeight: 800, color: '#E17055', fontSize: '1rem' }}>Oggi</p>
            {registroOggi ? (
              <PastoCard registro={registroOggi} menu={menuOggi} />
            ) : (
              <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center', color: '#aaa', boxShadow: '0 2px 8px rgba(225,112,85,0.06)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Il foglio pappe di oggi non è ancora stato compilato.</p>
              </div>
            )}

            {/* Storico */}
            {registriStorico.length > 0 && (
              <>
                <p style={{ margin: '1rem 0 0.875rem', fontWeight: 800, color: '#888', fontSize: '0.9rem' }}>Ultimi giorni</p>
                {registriStorico.map(r => <PastoCard key={r.id} registro={r} menu={null} />)}
              </>
            )}

            {registri.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🥣</div>
                <p style={{ margin: 0 }}>Nessun registro pasto ancora.</p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>Le insegnanti inizieranno a compilare il foglio pappe prossimamente.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
