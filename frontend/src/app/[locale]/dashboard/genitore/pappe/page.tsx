'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Figlio {
  id: number
  nome: string
  cognome: string
  sezione: string
}

interface Menu {
  primo: string
  secondo: string
  contorno: string
  frutta: string
  merenda: string
  bibita: string
}

interface RegistroPasto {
  id: number
  data: string
  primo_quantita: string
  secondo_quantita: string
  contorno_quantita: string
  frutta_quantita: string
  merenda_quantita: string
  note_pasto: string
  compilato_da_nome: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUANTITA_ICON: Record<string, { icon: string; label: string; color: string }> = {
  tutto:  { icon: '🍽️',  label: 'Tutto',  color: '#27AE60' },
  meta:   { icon: '🍽️½', label: 'Metà',   color: '#F39C12' },
  poco:   { icon: '🥄',  label: 'Poco',   color: '#E17055' },
  nulla:  { icon: '❌',  label: 'Nulla',  color: '#C0392B' },
  '':     { icon: '—',   label: 'N/D',    color: '#aaa' },
}

const PORTATE: { key: keyof RegistroPasto; menuKey: keyof Menu; label: string; emoji: string }[] = [
  { key: 'primo_quantita',    menuKey: 'primo',   label: 'Primo',    emoji: '🍝' },
  { key: 'secondo_quantita',  menuKey: 'secondo', label: 'Secondo',  emoji: '🍗' },
  { key: 'contorno_quantita', menuKey: 'contorno',label: 'Contorno', emoji: '🥦' },
  { key: 'frutta_quantita',   menuKey: 'frutta',  label: 'Frutta',   emoji: '🍎' },
  { key: 'merenda_quantita',  menuKey: 'merenda', label: 'Merenda',  emoji: '🍪' },
]

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ─── PastoCard ────────────────────────────────────────────────────────────────

function PastoCard({ registro, menu }: { registro: RegistroPasto; menu: Menu | null }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '1.5rem',
      marginBottom: '1.25rem',
      boxShadow: '0 4px 20px rgba(225,112,85,0.10)',
    }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ margin: 0, fontWeight: 800, color: '#333', fontSize: '1rem', textTransform: 'capitalize' }}>
          {fmtData(registro.data)}
        </p>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.775rem', color: '#aaa' }}>
          Compilato da {registro.compilato_da_nome}
        </p>
      </div>

      {/* Portate */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {PORTATE.map(({ key, menuKey, label, emoji }) => {
          const q = (registro[key] as string) ?? ''
          const qi = QUANTITA_ICON[q] ?? QUANTITA_ICON['']
          const pietanza = menu?.[menuKey] ?? ''
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              {/* Icona quantità */}
              <div style={{
                width: 48, height: 48, borderRadius: '12px',
                background: q ? `${qi.color}18` : '#F5F5F5',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{qi.icon}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: qi.color, marginTop: '0.15rem' }}>
                  {qi.label}
                </span>
              </div>
              {/* Testo */}
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {emoji} {label}
                </p>
                {pietanza && (
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.9rem', color: '#444', fontWeight: 500 }}>
                    {pietanza}
                  </p>
                )}
              </div>
              {/* Badge quantità */}
              {q && (
                <span style={{
                  background: `${qi.color}20`,
                  color: qi.color,
                  padding: '0.25rem 0.625rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  {qi.label}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Note */}
      {registro.note_pasto && (
        <div style={{ marginTop: '1rem', background: '#FFF3EE', borderRadius: '10px', padding: '0.875rem' }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.78rem', fontWeight: 700, color: '#E17055', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Note dell'insegnante
          </p>
          <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {registro.note_pasto}
          </p>
        </div>
      )}

      {/* Menu sezione (se disponibile) */}
      {menu && menu.bibita && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.775rem', color: '#aaa' }}>
          🥤 Bibita: {menu.bibita}
        </p>
      )}
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
  const [menuOggi, setMenuOggi] = useState<Menu | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPasti, setLoadingPasti] = useState(false)
  const [error, setError] = useState('')

  // Carica lista figli
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

  const fetchPasti = useCallback(async (bambinoId: number, sezione: string) => {
    setLoadingPasti(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (sezione) params.set('sezione', sezione)

      const [pastiRes, menuRes] = await Promise.all([
        fetch(`/api/meals/pasti/mio-figlio?bambino=${bambinoId}`),
        fetch(`/api/meals/menu/oggi?${params}`),
      ])

      if (!pastiRes.ok) throw new Error()
      setRegistri(await pastiRes.json())
      if (menuRes.ok) {
        const menus: Menu[] = await menuRes.json()
        setMenuOggi(menus[0] ?? null)
      }
    } catch {
      setError('Errore nel caricamento dei pasti.')
    } finally {
      setLoadingPasti(false)
    }
  }, [])

  // Fallback: se non ci sono figli collegati via Famiglia, carica tutti i pasti visibili
  const fetchPastiFallback = useCallback(async () => {
    setLoadingPasti(true)
    setError('')
    try {
      const res = await fetch('/api/meals/pasti/mio-figlio')
      if (!res.ok) throw new Error()
      setRegistri(await res.json())
    } catch {
      setError('Errore nel caricamento dei pasti.')
    } finally {
      setLoadingPasti(false)
    }
  }, [])

  useEffect(() => {
    if (selectedFiglio !== null) {
      const figlio = figli.find(f => f.id === selectedFiglio)
      fetchPasti(selectedFiglio, figlio?.sezione ?? '')
    } else if (!loading && figli.length === 0) {
      fetchPastiFallback()
    }
  }, [selectedFiglio, figli, loading, fetchPasti, fetchPastiFallback])

  const figlioSelezionato = figli.find(f => f.id === selectedFiglio)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#FFF3EE' }}>
        <p style={{ color: '#E17055', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  const oggi = new Date().toISOString().split('T')[0]
  const registroOggi = registri.find(r => r.data === oggi)
  const registriStorico = registri.filter(r => r.data !== oggi)

  return (
    <div style={{ minHeight: '100vh', background: '#FFF3EE' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #E17055 0%, #C0392B 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/genitore`)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.5rem', fontFamily: 'inherit' }}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>🥣 Pappe di {figlioSelezionato?.nome ?? '...'}</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            Cosa ha mangiato {figlioSelezionato?.nome} oggi e nei giorni scorsi
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Selettore figlio */}
        {figli.length > 1 && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(225,112,85,0.08)' }}>
            <p style={{ margin: '0 0 0.625rem', fontSize: '0.82rem', fontWeight: 700, color: '#555' }}>Seleziona figlio</p>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              {figli.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFiglio(f.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: selectedFiglio === f.id ? '#E17055' : '#FFF3EE',
                    color: selectedFiglio === f.id ? 'white' : '#E17055',
                    border: `2px solid ${selectedFiglio === f.id ? '#E17055' : '#FFD4B3'}`,
                    borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {f.nome} {f.cognome}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {selectedFiglio === null && figli.length > 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👆</div>
            <p style={{ margin: 0 }}>Seleziona un bambino.</p>
          </div>
        ) : loadingPasti ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#E17055', fontWeight: 600 }}>Caricamento...</div>
        ) : (
          <>
            {/* Oggi */}
            <p style={{ margin: '0 0 0.875rem', fontWeight: 800, color: '#E17055', fontSize: '1rem' }}>
              Oggi
            </p>
            {registroOggi ? (
              <PastoCard registro={registroOggi} menu={menuOggi} />
            ) : (
              <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center', color: '#aaa', boxShadow: '0 2px 8px rgba(225,112,85,0.06)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {menuOggi ? (
                    <>
                      <strong style={{ color: '#E17055' }}>Menu di oggi:</strong><br />
                      {menuOggi.primo && `🍝 ${menuOggi.primo}  `}
                      {menuOggi.secondo && `🍗 ${menuOggi.secondo}  `}
                      {menuOggi.contorno && `🥦 ${menuOggi.contorno}  `}
                      {menuOggi.frutta && `🍎 ${menuOggi.frutta}`}
                      <br /><br />
                    </>
                  ) : null}
                  Il foglio pappe di oggi non è ancora stato compilato.
                </p>
              </div>
            )}

            {/* Storico */}
            {registriStorico.length > 0 && (
              <>
                <p style={{ margin: '1rem 0 0.875rem', fontWeight: 800, color: '#888', fontSize: '0.9rem' }}>
                  Ultimi giorni
                </p>
                {registriStorico.map(r => (
                  <PastoCard key={r.id} registro={r} menu={null} />
                ))}
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
