'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Figlio {
  id: number
  nome: string
  cognome: string
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
}

interface Registro {
  id: number
  data: string
  umore: string
  umore_label: string
  attivita_descrizione: string
  note_giornata: string
  autore_nome: string
  sonno_inizio: string | null
  sonno_fine: string | null
  popo: boolean
  tags_cosa_portare: Tag[]
  media: MediaItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UMORE_EMOJI: Record<string, string> = {
  felice: '😊',
  sereno: '🙂',
  stanco: '😴',
  agitato: '😤',
  triste: '😢',
}

const UMORE_COLOR: Record<string, string> = {
  felice: '#27AE60',
  sereno: '#0984E3',
  stanco: '#F39C12',
  agitato: '#E17055',
  triste: '#636E72',
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function fmtOrario(t: string) {
  return t.slice(0, 5)
}

// ─── LightBox ─────────────────────────────────────────────────────────────────

function Lightbox({ url, tipo, onClose }: { url: string; tipo: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {tipo === 'foto' ? (
        <img
          src={url}
          alt=""
          style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <video
          src={url}
          controls
          autoPlay
          style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px' }}
          onClick={e => e.stopPropagation()}
        />
      )}
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: '1rem', right: '1rem',
          background: 'rgba(255,255,255,0.15)', color: 'white',
          border: 'none', borderRadius: '50%', width: 40, height: 40,
          cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700,
        }}
      >
        ✕
      </button>
      <a
        href={url}
        download
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.15)', color: 'white',
          padding: '0.5rem 1.5rem', borderRadius: '20px',
          textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600,
        }}
      >
        ⬇ Scarica
      </a>
    </div>
  )
}

// ─── RegistroCard ─────────────────────────────────────────────────────────────

function RegistroCard({ registro }: { registro: Registro }) {
  const [lightbox, setLightbox] = useState<{ url: string; tipo: string } | null>(null)

  const umore = registro.umore
  const hasContent = registro.attivita_descrizione || registro.note_giornata
  const mediaList = registro.media
  const hasSonno = registro.sonno_inizio

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '1.5rem',
      marginBottom: '1.25rem',
      boxShadow: '0 4px 20px rgba(225,112,85,0.10)',
    }}>
      {/* Data e umore */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 800, color: '#333', fontSize: '1rem', textTransform: 'capitalize' }}>
            {fmtData(registro.data)}
          </p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.775rem', color: '#aaa' }}>
            Compilato da {registro.autore_nome}
          </p>
        </div>
        {umore && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: `${UMORE_COLOR[umore]}18`,
            borderRadius: '12px', padding: '0.5rem 0.875rem',
          }}>
            <span style={{ fontSize: '1.75rem' }}>{UMORE_EMOJI[umore]}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: UMORE_COLOR[umore], marginTop: '0.2rem' }}>
              {registro.umore_label?.replace(/\s*[😊🙂😴😤😢]/, '')}
            </span>
          </div>
        )}
      </div>

      {/* Popò e badge extra */}
      {(registro.popo || registro.tags_cosa_portare.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.875rem' }}>
          {registro.popo && (
            <span style={{
              background: '#FFF9E6', color: '#744210',
              border: '1px solid #F6AD55',
              padding: '0.25rem 0.75rem', borderRadius: '20px',
              fontSize: '0.8rem', fontWeight: 700,
            }}>
              💩 Popò
            </span>
          )}
          {registro.tags_cosa_portare.map(t => (
            <span key={t.id} style={{
              background: `${t.colore}22`,
              color: t.colore,
              border: `1px solid ${t.colore}55`,
              padding: '0.25rem 0.75rem', borderRadius: '20px',
              fontSize: '0.8rem', fontWeight: 600,
            }}>
              📦 {t.nome}
            </span>
          ))}
        </div>
      )}

      {/* Sonno */}
      {hasSonno && (
        <div style={{
          background: '#F0F8FF', borderRadius: '10px', padding: '0.75rem 1rem',
          marginBottom: '0.875rem',
          display: 'flex', flexWrap: 'wrap', gap: '1rem',
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0984E3', marginRight: '0.25rem' }}>😴 Sonno</span>
          <span style={{ fontSize: '0.82rem', color: '#444' }}>
            {fmtOrario(registro.sonno_inizio!)}
            {registro.sonno_fine && ` – ${fmtOrario(registro.sonno_fine)}`}
          </span>
        </div>
      )}

      {/* Testi */}
      {registro.attivita_descrizione && (
        <div style={{ marginBottom: '0.875rem' }}>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.78rem', fontWeight: 700, color: '#E17055', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Attività
          </p>
          <p style={{ margin: 0, color: '#444', fontSize: '0.925rem', lineHeight: 1.6 }}>
            {registro.attivita_descrizione}
          </p>
        </div>
      )}

      {registro.note_giornata && (
        <div style={{
          background: '#FFF3EE', borderRadius: '10px', padding: '0.875rem',
          marginBottom: mediaList.length > 0 ? '1rem' : 0,
        }}>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.78rem', fontWeight: 700, color: '#E17055', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Note per voi
          </p>
          <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {registro.note_giornata}
          </p>
        </div>
      )}

      {!hasContent && !hasSonno && !registro.popo && registro.tags_cosa_portare.length === 0 && mediaList.length === 0 && (
        <p style={{ margin: 0, color: '#bbb', fontSize: '0.875rem', fontStyle: 'italic' }}>
          Nessuna nota per questa giornata.
        </p>
      )}

      {/* Media grid */}
      {mediaList.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: mediaList.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '0.5rem',
          }}>
            {mediaList.map(m => (
              <button
                key={m.id}
                onClick={() => setLightbox({ url: m.file_url, tipo: m.tipo })}
                style={{
                  padding: 0, border: 'none', cursor: 'pointer',
                  borderRadius: '10px', overflow: 'hidden',
                  aspectRatio: mediaList.length === 1 ? '16/9' : '1',
                  background: '#222',
                }}
              >
                {m.tipo === 'foto' ? (
                  <img
                    src={m.file_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#1a1a2e', minHeight: '110px',
                  }}>
                    <span style={{ fontSize: '2.5rem' }}>▶️</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {lightbox && (
        <Lightbox url={lightbox.url} tipo={lightbox.tipo} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GenitoreDiarioPage() {
  const router = useRouter()
  const locale = useLocale()

  const [figli, setFigli] = useState<Figlio[]>([])
  const [selectedFiglio, setSelectedFiglio] = useState<number | null>(null)
  const [registri, setRegistri] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRegistri, setLoadingRegistri] = useState(false)
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

  const fetchRegistri = useCallback(async (bambinoId: number) => {
    setLoadingRegistri(true)
    setError('')
    try {
      const res = await fetch(`/api/diario/registri/mio-figlio?bambino=${bambinoId}`)
      if (res.status === 401) { router.push(`/${locale}/login`); return }
      if (!res.ok) throw new Error()
      setRegistri(await res.json())
    } catch {
      setError('Errore nel caricamento del diario.')
    } finally {
      setLoadingRegistri(false)
    }
  }, [locale, router])

  useEffect(() => {
    if (selectedFiglio !== null) fetchRegistri(selectedFiglio)
  }, [selectedFiglio, fetchRegistri])

  const figlioSelezionato = figli.find(f => f.id === selectedFiglio)

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
          <button
            onClick={() => router.push(`/${locale}/dashboard/genitore`)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.5rem', fontFamily: 'inherit' }}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>📖 Diario di {figlioSelezionato?.nome ?? '...'}</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            Rivivi le giornate alla scuola
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {figli.length > 1 && (
          <div style={{
            background: 'white', borderRadius: '14px', padding: '1rem 1.25rem',
            marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(225,112,85,0.08)',
          }}>
            <p style={{ margin: '0 0 0.625rem', fontSize: '0.82rem', fontWeight: 700, color: '#555' }}>
              Seleziona figlio
            </p>
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

        {selectedFiglio === null ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👆</div>
            <p style={{ margin: 0 }}>Seleziona un bambino per vedere il suo diario.</p>
          </div>
        ) : loadingRegistri ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#E17055', fontWeight: 600 }}>
            Caricamento diario...
          </div>
        ) : registri.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
            <p style={{ margin: 0 }}>Nessuna giornata registrata ancora.</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
              Le insegnanti inizieranno a compilare il diario prossimamente.
            </p>
          </div>
        ) : (
          registri.map(r => <RegistroCard key={r.id} registro={r} />)
        )}
      </div>
    </div>
  )
}
