'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Figlio {
  id: number
  nome: string
  cognome: string
  alias_nome: string
  alias_attivo: boolean
  foto_profilo: string | null
  gruppo_nome: string
  gruppo_colore: string
  gruppo: number | null
}

interface Tag { id: number; nome: string; colore: string }
interface MediaItem {
  id: number; file_url: string; thumbnail_url: string | null
  tipo: 'foto' | 'video'; visibile_a_genitori: boolean
}

interface Registro {
  id: number; data: string; umore: string; umore_label: string
  attivita_descrizione: string; note_giornata: string; autore_nome: string
  sonno_inizio: string | null; sonno_fine: string | null
  popo: boolean; tags_cosa_portare: Tag[]; media: MediaItem[]
}

interface RegistroPasto {
  id: number; data: string
  colazione_quantita: string; primo_quantita: string; secondo_quantita: string
  monopiatto_quantita: string; contorno_quantita: string; pane_quantita: string
  frutta_quantita: string; merenda_quantita: string
  note_pasto: string; compilato_da_nome: string
}

interface PiattoMenu { descrizione: string; tipo: string; is_sostituzione?: boolean }
interface MenuGiorno {
  settimana_ciclo: number | null
  piatti: Record<string, PiattoMenu[]>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UMORE_EMOJI: Record<string, string> = {
  felice: '😊', sereno: '🙂', stanco: '😴', agitato: '😤', triste: '😢',
}
const UMORE_COLOR: Record<string, string> = {
  felice: '#27AE60', sereno: '#0984E3', stanco: '#F39C12',
  agitato: '#E17055', triste: '#636E72',
}
const QUANTITA_ICON: Record<string, { icon: string; label: string; color: string }> = {
  tutto:  { icon: '🍽️', label: 'Tutto',  color: '#27AE60' },
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
const PORTATE: { campo: string; tipo: string; label: string; emoji: string }[] = [
  { campo: 'colazione_quantita', tipo: 'colazione', label: 'Colazione', emoji: '🥛' },
  { campo: 'primo_quantita',     tipo: 'primo',     label: 'Primo',     emoji: '🍝' },
  { campo: 'secondo_quantita',   tipo: 'secondo',   label: 'Secondo',   emoji: '🍗' },
  { campo: 'monopiatto_quantita',tipo: 'monopiatto',label: 'Monopiatto',emoji: '🍲' },
  { campo: 'contorno_quantita',  tipo: 'contorno',  label: 'Contorno',  emoji: '🥦' },
  { campo: 'pane_quantita',      tipo: 'pane',      label: 'Pane',      emoji: '🍞' },
  { campo: 'frutta_quantita',    tipo: 'frutta',    label: 'Frutta',    emoji: '🍎' },
  { campo: 'merenda_quantita',   tipo: 'merenda',   label: 'Merenda',   emoji: '🍪' },
]

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoToday(): string { return localIso(new Date()) }

function fmtDataLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function prevDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return localIso(new Date(y, m - 1, d - 1))
}

function nextDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return localIso(new Date(y, m - 1, d + 1))
}

function fmtOrario(t: string): string { return t.slice(0, 5) }

function stripCodice(desc: string): string {
  // Rimuove prefissi tipo "N 501 - " o "B123 – " dai nomi piatto
  return desc.replace(/^[A-Z]+\s*\d+\s*[-–]\s*/, '').trim()
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ url, tipo, onClose }: { url: string; tipo: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {tipo === 'foto'
        ? <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
        : <video src={url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px' }} onClick={e => e.stopPropagation()} />
      }
      <button onClick={onClose} style={{ position: 'fixed', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
      <a href={url} download onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.15)', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '20px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
        ⬇ Scarica
      </a>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GiornataPage() {
  const router = useRouter()
  const locale = useLocale()

  const [figli, setFigli] = useState<Figlio[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [data, setData] = useState<string>(isoToday())
  const [registro, setRegistro] = useState<Registro | null>(null)
  const [pasto, setPasto] = useState<RegistroPasto | null>(null)
  const [menu, setMenu] = useState<MenuGiorno | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDay, setLoadingDay] = useState(false)
  const [lightbox, setLightbox] = useState<{ url: string; tipo: string } | null>(null)

  // Load children
  useEffect(() => {
    fetch('/api/bambini')
      .then(r => { if (r.status === 401) { router.push(`/${locale}/login`); return null } return r.ok ? r.json() : null })
      .then(d => {
        if (!d) return
        const list: Figlio[] = d.results ?? d
        setFigli(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .finally(() => setLoading(false))
  }, [locale, router])

  const figlio = figli.find(f => f.id === selectedId)

  // Load day data when bambino or date changes
  const loadDay = useCallback(async (bambinoId: number, giorno: string) => {
    setLoadingDay(true)
    setRegistro(null)
    setPasto(null)
    setMenu(null)
    try {
      const [dRes, pRes] = await Promise.all([
        fetch(`/api/diario/registri/mio-figlio?bambino=${bambinoId}`),
        fetch(`/api/meals/pasti/mio-figlio?bambino=${bambinoId}`),
      ])
      if (dRes.ok) {
        const dList: Registro[] = await dRes.json()
        setRegistro(dList.find(r => r.data === giorno) ?? null)
      }
      if (pRes.ok) {
        const pList: RegistroPasto[] = await pRes.json()
        setPasto(pList.find(p => p.data === giorno) ?? null)
      }
      // Load menu for this day (needs gruppo)
      const f = figli.find(x => x.id === bambinoId)
      if (f?.gruppo) {
        const mRes = await fetch(`/api/pappe/piatti/menu-giorno?data=${giorno}&gruppo=${f.gruppo}`)
        if (mRes.ok) setMenu(await mRes.json())
      }
    } finally {
      setLoadingDay(false)
    }
  }, [figli])

  useEffect(() => {
    if (selectedId !== null) loadDay(selectedId, data)
  }, [selectedId, data, loadDay])

  const isOggi = data === isoToday()
  const isFuturo = data > isoToday()

  const nomeFiglio = figlio
    ? (figlio.alias_attivo && figlio.alias_nome ? figlio.alias_nome : figlio.nome)
    : '...'

  const colore = figlio?.gruppo_colore || '#E17055'
  const iniAvatarLetter = figlio ? `${nomeFiglio.charAt(0)}${figlio.cognome.charAt(0)}`.toUpperCase() : '?'

  const mediaVisibili = (registro?.media ?? []).filter(m => m.visibile_a_genitori)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#FFF3EE' }}>
        <p style={{ color: '#E17055', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF3EE' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #E17055 0%, #C0392B 100%)', padding: '1.25rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <button onClick={() => router.push(`/${locale}/dashboard/genitore`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', marginBottom: '0.875rem' }}>
            ← Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
              {figlio?.foto_profilo
                ? <img src={figlio.foto_profilo} alt={iniAvatarLetter} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : iniAvatarLetter}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                La giornata di {nomeFiglio}
              </h1>
              {figlio?.gruppo_nome && (
                <p style={{ margin: 0, opacity: 0.85, fontSize: '0.8rem' }}>{figlio.gruppo_nome}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem 1rem 3rem' }}>

        {/* ── Selettore figlio ────────────────────────────────────────────── */}
        {figli.length > 1 && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '0.875rem 1rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(225,112,85,0.08)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {figli.map(f => {
              const n = f.alias_attivo && f.alias_nome ? f.alias_nome : f.nome
              return (
                <button key={f.id} onClick={() => setSelectedId(f.id)}
                  style={{ padding: '0.4rem 0.875rem', background: selectedId === f.id ? '#E17055' : '#FFF3EE', color: selectedId === f.id ? 'white' : '#E17055', border: `2px solid ${selectedId === f.id ? '#E17055' : '#FFD4B3'}`, borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {n} {f.cognome}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Navigatore data ─────────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '0.75rem 1rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(225,112,85,0.08)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => setData(prevDay(data))}
            style={{ width: 36, height: 36, border: '1px solid #FFD4B3', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '1rem', color: '#E17055', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ‹
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#333', textTransform: 'capitalize' }}>
              {fmtDataLong(data)}
            </p>
          </div>
          <button onClick={() => { if (!isFuturo) setData(nextDay(data)) }}
            disabled={isOggi}
            style={{ width: 36, height: 36, border: '1px solid #FFD4B3', borderRadius: '8px', background: 'white', cursor: isOggi ? 'default' : 'pointer', fontSize: '1rem', color: isOggi ? '#ccc' : '#E17055', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ›
          </button>
          {!isOggi && (
            <button onClick={() => setData(isoToday())}
              style={{ padding: '0.375rem 0.75rem', border: '1px solid #FFD4B3', borderRadius: '8px', background: '#FFF3EE', color: '#E17055', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Oggi
            </button>
          )}
        </div>

        {loadingDay ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#E17055', fontWeight: 600 }}>Caricamento...</div>
        ) : !registro && !pasto && !menu ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(225,112,85,0.08)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ margin: 0, fontWeight: 700, color: '#555', fontSize: '1rem' }}>
              {isFuturo ? 'Giorno futuro' : 'Nessun dato per questo giorno'}
            </p>
            <p style={{ margin: '0.4rem 0 0', color: '#aaa', fontSize: '0.875rem' }}>
              {isFuturo ? 'Non ci sono ancora informazioni.' : `${nomeFiglio} era assente oppure non è stato compilato il diario.`}
            </p>
          </div>
        ) : (
          <>
            {/* ── Card Diario ─────────────────────────────────────────────── */}
            {registro ? (
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(225,112,85,0.10)' }}>

                {/* Header: umore + autore */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, color: '#E17055', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📖 Diario</p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#aaa' }}>Compilato da {registro.autore_nome}</p>
                  </div>
                  {registro.umore && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: `${UMORE_COLOR[registro.umore] ?? '#888'}18`, borderRadius: '12px', padding: '0.5rem 0.875rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>{UMORE_EMOJI[registro.umore] ?? '😶'}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: UMORE_COLOR[registro.umore] ?? '#888', marginTop: '0.15rem' }}>
                        {registro.umore_label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sonno */}
                {registro.sonno_inizio && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: '#EEF2FF', borderRadius: '10px', padding: '0.625rem 0.875rem', marginBottom: '0.875rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🌙</span>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#5A67D8' }}>Sonno</p>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#333' }}>
                        {fmtOrario(registro.sonno_inizio)}
                        {registro.sonno_fine ? ` → ${fmtOrario(registro.sonno_fine)}` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Badge: popò + tags */}
                {(registro.popo || registro.tags_cosa_portare.length > 0) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.875rem' }}>
                    {registro.popo && (
                      <span style={{ background: '#FFF9E6', color: '#744210', border: '1px solid #F6AD55', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                        💩 Popò
                      </span>
                    )}
                    {registro.tags_cosa_portare.map(t => (
                      <span key={t.id} style={{ background: `${t.colore}22`, color: t.colore, border: `1px solid ${t.colore}55`, padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                        📦 {t.nome}
                      </span>
                    ))}
                  </div>
                )}

                {/* Testi */}
                {registro.attivita_descrizione && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attività</p>
                    <p style={{ margin: 0, color: '#444', fontSize: '0.9rem', lineHeight: 1.55 }}>{registro.attivita_descrizione}</p>
                  </div>
                )}
                {registro.note_giornata && (
                  <div>
                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note</p>
                    <p style={{ margin: 0, color: '#444', fontSize: '0.9rem', lineHeight: 1.55 }}>{registro.note_giornata}</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.25rem 1.5rem', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(225,112,85,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem', opacity: 0.4 }}>📖</span>
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.875rem' }}>Nessuna voce di diario per oggi.</p>
              </div>
            )}

            {/* ── Card Pasto ──────────────────────────────────────────────── */}
            {(pasto || menu) ? (
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(225,112,85,0.10)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, color: '#E17055', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🥣 Pasto</p>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#aaa' }}>
                      {pasto ? `Compilato da ${pasto.compilato_da_nome}` : 'Menu previsto — consumo non ancora registrato'}
                    </p>
                  </div>
                  {menu?.settimana_ciclo && (
                    <span style={{ background: '#FFF3EE', color: '#E17055', borderRadius: '6px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      Sett. {menu.settimana_ciclo}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {PORTATE.filter(({ campo, tipo }) => {
                    const q = pasto ? (pasto as unknown as Record<string, string>)[campo] : ''
                    const haMenu = (menu?.piatti[tipo]?.length ?? 0) > 0
                    return q || haMenu
                  }).map(({ campo, tipo, label, emoji }) => {
                    const q = pasto ? ((pasto as unknown as Record<string, string>)[campo] ?? '') : ''
                    const qi = QUANTITA_ICON[q] ?? QUANTITA_ICON['']
                    const piatti = menu?.piatti[tipo] ?? []
                    return (
                      <div key={campo} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.375rem 0', borderBottom: '1px solid #F9F9F9' }}>
                        {/* Icona quantità (solo se pasto registrato) */}
                        {pasto ? (
                          <div style={{ width: 44, height: 44, borderRadius: '10px', background: q ? `${qi.color}18` : '#F5F5F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{qi.icon}</span>
                            {q && <span style={{ fontSize: '0.55rem', fontWeight: 700, color: qi.color, marginTop: '0.1rem' }}>{qi.label}</span>}
                          </div>
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: '8px', background: `${TIPO_COLOR[tipo] ?? '#888'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>
                            {emoji}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: TIPO_COLOR[tipo] ?? '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                          {piatti.length > 0 && (
                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.875rem', color: '#444', lineHeight: 1.3 }}>
                              {piatti.map(p => stripCodice(p.descrizione)).join(', ')}
                            </p>
                          )}
                          {pasto && !piatti.length && q && (
                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: '#aaa', fontStyle: 'italic' }}>—</p>
                          )}
                        </div>
                        {pasto && q && (
                          <span style={{ background: `${qi.color}20`, color: qi.color, padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {qi.label}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {pasto?.note_pasto && (
                  <div style={{ marginTop: '1rem', background: '#FFF3EE', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                    <p style={{ margin: '0 0 0.2rem', fontSize: '0.75rem', fontWeight: 700, color: '#E17055', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note pasto</p>
                    <p style={{ margin: 0, color: '#555', fontSize: '0.875rem', lineHeight: 1.5 }}>{pasto.note_pasto}</p>
                  </div>
                )}
              </div>
            ) : null}

            {/* ── Foto ────────────────────────────────────────────────────── */}
            {mediaVisibili.length > 0 && (
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(225,112,85,0.10)' }}>
                <p style={{ margin: '0 0 0.875rem', fontWeight: 800, color: '#E17055', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📸 Foto della giornata
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {mediaVisibili.map(m => (
                    <div
                      key={m.id}
                      onClick={() => setLightbox({ url: m.file_url, tipo: m.tipo })}
                      style={{ aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', background: '#f5f5f5', position: 'relative' }}
                    >
                      {m.tipo === 'video' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', zIndex: 1 }}>
                          <span style={{ fontSize: '1.5rem' }}>▶</span>
                        </div>
                      )}
                      <img
                        src={m.thumbnail_url ?? m.file_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Link ai feed completi ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button onClick={() => router.push(`/${locale}/dashboard/genitore/diario`)}
            style={{ flex: 1, padding: '0.75rem', background: 'white', color: '#E17055', border: '2px solid #FFD4B3', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            📖 Tutto il diario
          </button>
          <button onClick={() => router.push(`/${locale}/dashboard/genitore/pappe`)}
            style={{ flex: 1, padding: '0.75rem', background: 'white', color: '#E17055', border: '2px solid #FFD4B3', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🥣 Tutte le pappe
          </button>
        </div>

      </div>

      {lightbox && <Lightbox url={lightbox.url} tipo={lightbox.tipo} onClose={() => setLightbox(null)} />}
    </div>
  )
}
