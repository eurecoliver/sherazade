'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
}

interface Bambino {
  id: number
  nome: string
  cognome: string
  alias_nome: string
  alias_attivo: boolean
  foto_profilo: string | null
  gruppo_nome: string
  gruppo_colore: string
  eta: number
}

// ── Design tokens ─────────────────────────────────────────────────────────
const G       = '#0284C7'      // sky-600
const G_DARK  = '#0369A1'      // sky-700
const G_LIGHT = '#E0F2FE'      // sky-100
const BG      = '#F2F2F7'      // iOS neutral
const CARD    = '#FFFFFF'
const T1      = '#1C1C1E'
const T2      = '#6B7280'
const TSEC    = '#8E8E93'
const CHEV    = '#C7C7CC'
const SEP     = '#F4F4F8'

type GItem = { icon: string; label: string; sub: string; path: string; risorsa: string | null }

const GROUPS_G: { label: string; items: GItem[] }[] = [
  {
    label: 'Comunicazione',
    items: [
      { icon: '📢', label: 'Circolari',  sub: 'Comunicazioni dal nido',           path: '/circolari',  risorsa: 'circolari'  },
      { icon: '📅', label: 'Calendario', sub: 'Eventi e chiusure scolastiche',    path: '/calendario', risorsa: 'calendario' },
      { icon: '🤝', label: 'Colloqui',   sub: 'Prenota un appuntamento',          path: '/colloqui',   risorsa: 'colloqui'   },
    ],
  },
  {
    label: 'La vita al nido',
    items: [
      { icon: '📚', label: 'Giornata di oggi', sub: 'Diario, pasti, sonno e attività', path: '/giornata',  risorsa: null         },
      { icon: '📖', label: 'Diario',           sub: 'Foto e note giornaliere',          path: '/diario',    risorsa: 'diario'     },
      { icon: '🥣', label: 'Pappe',            sub: 'Menu e registro pasti',            path: '/pappe',     risorsa: 'pappe'      },
      { icon: '📸', label: 'Portfolio',        sub: 'Foto e video del percorso',        path: '/portfolio', risorsa: 'portfolio'  },
    ],
  },
  {
    label: 'Gestione',
    items: [
      { icon: '✅', label: 'Presenze', sub: 'Registro presenze e assenze',   path: '/presenze', risorsa: 'presenze' },
      { icon: '📷', label: 'Consensi', sub: 'Autorizzazioni fotografiche',   path: '/consensi', risorsa: 'consensi' },
      { icon: '🧾', label: 'Fatture',  sub: 'Documenti di pagamento',        path: '/fatture',  risorsa: 'fatture'  },
    ],
  },
]

export default function GenitoreDashboard() {
  const router = useRouter()
  const locale = useLocale()
  const [user, setUser] = useState<User | null>(null)
  const [bambini, setBambini] = useState<Bambino[]>([])
  const [nonLette, setNonLette] = useState(0)
  const [risorse, setRisorse] = useState<string[] | null>(null)
  const [reportBambinoId, setReportBambinoId] = useState<number | ''>('')
  const [reportAnno, setReportAnno] = useState(new Date().getFullYear())
  const [reportMese, setReportMese] = useState(new Date().getMonth() + 1)
  const [reportLoading, setReportLoading] = useState(false)
  const [showReportSection, setShowReportSection] = useState(false)
  const [showGdprSection, setShowGdprSection] = useState(false)
  const [gdprBambinoId, setGdprBambinoId] = useState<number | ''>('')
  const [gdprLoading, setGdprLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/bambini').then(r => r.ok ? r.json() : []),
      fetch('/api/circolari').then(r => r.ok ? r.json() : []),
      fetch('/api/config/permessi-utente').then(r => r.ok ? r.json() : { risorse: null }),
    ])
      .then(([meData, bambiniData, circolariData, permData]) => {
        setUser(meData)
        const list = Array.isArray(bambiniData) ? bambiniData : (bambiniData.results ?? [])
        setBambini(list)
        if (list.length === 1) { setReportBambinoId(list[0].id); setGdprBambinoId(list[0].id) }
        const circ = Array.isArray(circolariData) ? circolariData : (circolariData.results ?? [])
        setNonLette(circ.filter((c: { letta: boolean }) => !c.letta).length)
        setRisorse(permData.risorse ?? null)
      })
      .catch(() => router.push(`/${locale}/login`))
  }, [locale, router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  const downloadReport = async () => {
    if (!reportBambinoId) return
    const b = bambini.find(x => x.id === reportBambinoId)
    setReportLoading(true)
    try {
      const res = await fetch(`/api/bambini/${reportBambinoId}/report-mensile?anno=${reportAnno}&mese=${reportMese}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${b?.cognome ?? ''}_${b?.nome ?? ''}_${reportAnno}_${String(reportMese).padStart(2, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setReportLoading(false)
    }
  }

  const downloadGdpr = async () => {
    if (!gdprBambinoId) return
    const b = bambini.find(x => x.id === gdprBambinoId)
    setGdprLoading(true)
    try {
      const res = await fetch(`/api/bambini/${gdprBambinoId}/export-gdpr`)
      if (!res.ok) { alert('Errore durante l\'export GDPR.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gdpr_${b?.cognome ?? ''}_${b?.nome ?? ''}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGdprLoading(false)
    }
  }

  const canSee = (risorsa: string | null) => {
    if (risorsa === null) return true
    if (!risorse) return true
    return risorse.includes(risorsa)
  }

  const navigate = (path: string) => {
    router.push(`/${locale}/dashboard/genitore${path}`)
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: BG }}>
        <p style={{ color: G, fontWeight: 600 }}>Caricamento…</p>
      </div>
    )
  }

  const dateStr = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ minHeight: '100vh', background: BG }}>

      {/* ── Sticky frosted header ──────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(242,242,247,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        padding: '0.625rem 1.25rem',
      }}>
        <div style={{ maxWidth: 'min(720px, 96vw)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: G_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              🏫
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: T1 }}>Sherazade</span>
          </div>
          <UserChip onLogout={handleLogout} />
        </div>
      </header>

      <div style={{ maxWidth: 'min(720px, 96vw)', margin: '0 auto', padding: '1.25rem 1rem 4rem' }}>

        {/* ── Greeting card ─────────────────────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${G} 0%, ${G_DARK} 100%)`,
          borderRadius: 20,
          padding: '1.5rem 1.5rem 1.75rem',
          color: 'white',
          marginBottom: '1.75rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(2,132,199,0.28)',
        }}>
          <div style={{ position: 'absolute', right: -24, top: -24, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 32, bottom: -38, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <p style={{ margin: '0 0 0.3rem', fontSize: '0.7rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.12em', position: 'relative' }}>
            Portale Sherazade
          </p>
          <h1 style={{ margin: '0 0 0.4rem', fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.02em', position: 'relative' }}>
            Ciao, {user.first_name || user.email.split('@')[0]}! 👋
          </h1>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', opacity: 0.68, position: 'relative' }}>
            {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
          </p>

          {/* Figli come pill */}
          {bambini.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', position: 'relative' }}>
              {bambini.map(b => {
                const nome = b.alias_attivo && b.alias_nome ? b.alias_nome : b.nome
                const colore = b.gruppo_colore || G
                const ini = `${nome.charAt(0)}${b.cognome.charAt(0)}`.toUpperCase()
                return (
                  <button
                    key={b.id}
                    onClick={() => navigate('/giornata')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      background: 'rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '20px',
                      padding: '0.375rem 0.75rem 0.375rem 0.375rem',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: colore,
                      border: '2px solid rgba(255,255,255,0.6)',
                      overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: '0.75rem',
                    }}>
                      {b.foto_profilo
                        ? <img src={b.foto_profilo} alt={ini} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : ini}
                    </div>
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                      {nome} {b.cognome}
                      {b.gruppo_nome && <span style={{ fontWeight: 400, opacity: 0.75 }}> · {b.gruppo_nome}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Navigation groups ─────────────────────────────────────────────── */}
        {GROUPS_G.map(group => {
          const visible = group.items.filter(item => canSee(item.risorsa))
          if (visible.length === 0) return null
          return (
            <div key={group.label} style={{ marginBottom: '1.25rem' }}>
              <p style={{
                margin: '0 0 0.4rem 0.375rem',
                fontSize: '0.7rem', fontWeight: 700, color: TSEC,
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                {group.label}
              </p>
              <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {visible.map((item, idx) => {
                  const isCircolari = item.path === '/circolari'
                  const hasBadge = isCircolari && nonLette > 0
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      style={{
                        width: '100%', background: 'none', border: 'none',
                        padding: '0.85rem 1rem',
                        display: 'flex', alignItems: 'center', gap: '0.875rem',
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                        borderBottom: idx < visible.length - 1 ? `1px solid ${SEP}` : 'none',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9F9FB' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 11,
                        background: G_LIGHT,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', flexShrink: 0,
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: T1 }}>{item.label}</p>
                          {hasBadge && (
                            <span style={{
                              background: '#EA580C', color: 'white',
                              borderRadius: '10px', padding: '0.05rem 0.45rem',
                              fontSize: '0.72rem', fontWeight: 800, flexShrink: 0,
                            }}>
                              {nonLette}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: T2, marginTop: '0.1rem' }}>{item.sub}</p>
                      </div>
                      <span style={{ color: CHEV, fontSize: '1.2rem', fontWeight: 400, flexShrink: 0, lineHeight: 1 }}>›</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* ── I miei dati ────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{
            margin: '0 0 0.4rem 0.375rem',
            fontSize: '0.7rem', fontWeight: 700, color: TSEC,
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            I miei dati
          </p>
          <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {/* Report mensile row */}
            <button
              onClick={() => setShowReportSection(v => !v)}
              style={{
                width: '100%', background: 'none', border: 'none',
                padding: '0.85rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                borderBottom: showReportSection ? 'none' : `1px solid ${SEP}`,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9F9FB' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 11, background: G_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                📄
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: T1 }}>Report mensile</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: T2, marginTop: '0.1rem' }}>Scarica il riepilogo PDF di presenze, pasti e diario</p>
              </div>
              <span style={{ color: CHEV, fontSize: '1rem', flexShrink: 0 }}>{showReportSection ? '▲' : '▼'}</span>
            </button>
            {showReportSection && (
              <div style={{ padding: '1rem', background: G_LIGHT, borderBottom: `1px solid ${SEP}`, display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {bambini.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: G }}>Bambino</label>
                    <select value={reportBambinoId} onChange={e => setReportBambinoId(Number(e.target.value))}
                      style={{ padding: '0.4rem 0.6rem', border: `1.5px solid ${G}`, borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'white' }}>
                      <option value="">— seleziona —</option>
                      {bambini.map(b => {
                        const nome = b.alias_attivo && b.alias_nome ? b.alias_nome : b.nome
                        return <option key={b.id} value={b.id}>{nome} {b.cognome}</option>
                      })}
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: G }}>Mese</label>
                  <select value={reportMese} onChange={e => setReportMese(Number(e.target.value))}
                    style={{ padding: '0.4rem 0.6rem', border: `1.5px solid ${G}`, borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'white' }}>
                    {['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'].map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: G }}>Anno</label>
                  <select value={reportAnno} onChange={e => setReportAnno(Number(e.target.value))}
                    style={{ padding: '0.4rem 0.6rem', border: `1.5px solid ${G}`, borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'white' }}>
                    {[new Date().getFullYear(), new Date().getFullYear() - 1].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button onClick={downloadReport} disabled={!reportBambinoId || reportLoading}
                  style={{ padding: '0.5rem 1.25rem', background: reportBambinoId ? G : '#BAE6FD', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: reportBambinoId && !reportLoading ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  {reportLoading ? '⏳ Generando...' : '⬇ Scarica PDF'}
                </button>
              </div>
            )}

            {/* GDPR row */}
            <button
              onClick={() => setShowGdprSection(v => !v)}
              style={{
                width: '100%', background: 'none', border: 'none',
                padding: '0.85rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9F9FB' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 11, background: G_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                📤
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: T1 }}>I miei dati (GDPR)</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: T2, marginTop: '0.1rem' }}>Scarica tutti i dati del tuo bambino (Art. 20 GDPR)</p>
              </div>
              <span style={{ color: CHEV, fontSize: '1rem', flexShrink: 0 }}>{showGdprSection ? '▲' : '▼'}</span>
            </button>
            {showGdprSection && (
              <div style={{ padding: '1rem', background: '#F5F3FF', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {bambini.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7C3AED' }}>Bambino</label>
                    <select value={gdprBambinoId} onChange={e => setGdprBambinoId(Number(e.target.value))}
                      style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #C4B5FD', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'white' }}>
                      <option value="">— seleziona —</option>
                      {bambini.map(b => {
                        const nome = b.alias_attivo && b.alias_nome ? b.alias_nome : b.nome
                        return <option key={b.id} value={b.id}>{nome} {b.cognome}</option>
                      })}
                    </select>
                  </div>
                )}
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B21A8', lineHeight: 1.5 }}>
                  Include anagrafica, consensi fotografici, presenze (2 anni), diario e pasti (1 anno).
                </p>
                <button onClick={downloadGdpr} disabled={!gdprBambinoId || gdprLoading}
                  style={{ padding: '0.5rem 1.25rem', background: gdprBambinoId ? '#7C3AED' : '#C4B5FD', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: gdprBambinoId && !gdprLoading ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  {gdprLoading ? '⏳ Generando...' : '⬇ Scarica PDF'}
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
