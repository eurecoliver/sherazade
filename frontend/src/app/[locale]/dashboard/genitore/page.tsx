'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
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

const NAV_ITEMS = [
  { icon: '📷', label: 'Consensi',   sub: 'Autorizzazioni fotografiche', path: '/consensi',   bg: '#FFF3EE', color: '#E17055', border: '#FFD4B3', risorsa: 'consensi' },
  { icon: '📅', label: 'Presenze',   sub: 'Registro e assenze',          path: '/presenze',   bg: '#F0F4FF', color: '#6C63FF', border: '#C5BFFF', risorsa: 'presenze' },
  { icon: '🧾', label: 'Fatture',    sub: 'Documenti di pagamento',      path: '/fatture',    bg: '#F0FFF4', color: '#276749', border: '#9AE6B4', risorsa: 'fatture' },
  { icon: '🥣', label: 'Pappe',      sub: 'Menu e registro pasti',       path: '/pappe',      bg: '#FFF9E6', color: '#E67E22', border: '#FED7AA', risorsa: 'pappe' },
  { icon: '📖', label: 'Diario',     sub: 'Attività e note',             path: '/diario',     bg: '#FDF2F8', color: '#9B59B6', border: '#E8BFFF', risorsa: 'diario' },
  { icon: '📅', label: 'Calendario', sub: 'Eventi e chiusure del nido',  path: '/calendario', bg: '#EBF8FF', color: '#2B6CB0', border: '#90CDF4', risorsa: 'calendario' },
  { icon: '📢', label: 'Circolari',  sub: 'Comunicazioni dal nido',      path: '/circolari',  bg: '#FFF9E6', color: '#D35400', border: '#FAD7A0', risorsa: 'circolari' },
  { icon: '📸', label: 'Portfolio', sub: 'Foto e video del nido',       path: '/portfolio',  bg: '#FFF0F6', color: '#D63384', border: '#F5BFDF', risorsa: 'portfolio' },
  { icon: '🗓️', label: 'Colloqui',  sub: 'Prenota appuntamento',         path: '/colloqui',   bg: '#F0FDFA', color: '#0D9488', border: '#99F6E4', risorsa: 'colloqui' },
]

export default function GenitoreDashboard() {
  const t = useTranslations('Dashboard')
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

  const base = `/${locale}/dashboard/genitore`

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#FFF3EE' }}>
        <p style={{ color: '#E17055', fontWeight: 600 }}>{t('loading')}</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF3EE' }}>

      {/* ── Header a gradiente ─────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #E17055 0%, #C0392B 100%)', padding: '2rem 1.5rem 3rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(960px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.75, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Portale Sherazade
              </p>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800 }}>
                Ciao, {user.first_name || user.email.split('@')[0]} 👋
              </h1>
              <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
                {t(`roles.${user.role}` as Parameters<typeof t>[0])}
              </p>
            </div>
            <UserChip onLogout={handleLogout} />
          </div>

          {/* Figli */}
          {bambini.length > 0 && (
            <div style={{
              marginTop: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.625rem',
            }}>
              {bambini.map(b => {
                const nome = b.alias_attivo && b.alias_nome ? b.alias_nome : b.nome
                const colore = b.gruppo_colore || '#E17055'
                const ini = `${nome.charAt(0)}${b.cognome.charAt(0)}`.toUpperCase()
                return (
                  <div
                    key={b.id}
                    onClick={() => router.push(`${base}/giornata`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      background: 'rgba(255,255,255,0.15)', borderRadius: '14px',
                      padding: '0.75rem 1rem', cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.25)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: colore, border: '2px solid rgba(255,255,255,0.6)',
                      overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: '0.9rem',
                    }}>
                      {b.foto_profilo
                        ? <img src={b.foto_profilo} alt={ini} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : ini}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>{nome} {b.cognome}</p>
                      {b.gruppo_nome && (
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>{b.gruppo_nome} · {b.eta} anni</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Contenuto principale ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 'min(960px, 96vw)', margin: '-1.5rem auto 0', padding: '0 1rem 3rem', position: 'relative', zIndex: 1 }}>

        {/* Pulsante principale — La Giornata (card prominente) */}
        <button
          onClick={() => router.push(`${base}/giornata`)}
          style={{
            width: '100%',
            padding: 'clamp(1.1rem, 3vw, 1.5rem) 1.5rem',
            marginBottom: '1rem',
            background: 'white',
            color: '#E17055',
            border: 'none',
            borderRadius: '18px',
            boxShadow: '0 8px 32px rgba(225,112,85,0.20)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            textAlign: 'left',
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: '14px',
            background: 'linear-gradient(135deg, #E17055 0%, #C0392B 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(225,112,85,0.3)',
          }}>
            📚
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', fontWeight: 800, color: '#333' }}>
              La giornata di oggi
            </p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: '#888' }}>
              Diario, pasti, sonno, attività e foto
            </p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '1.2rem', color: '#E17055', opacity: 0.6 }}>›</span>
        </button>

        {/* Griglia azioni secondarie */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(170px, 100%), 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          {NAV_ITEMS.filter(item => !risorse || risorse.includes(item.risorsa)).map(item => {
            const isCircolari = item.path === '/circolari'
            const showBadge = isCircolari && nonLette > 0
            return (
              <button
                key={item.path}
                onClick={() => router.push(`${base}${item.path}`)}
                style={{
                  padding: '1rem 1rem',
                  background: item.bg,
                  color: item.color,
                  border: `2px solid ${showBadge ? item.color : item.border}`,
                  borderRadius: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{item.label}</p>
                    {showBadge && (
                      <span style={{
                        background: item.color,
                        color: 'white',
                        borderRadius: '10px',
                        padding: '0.05rem 0.45rem',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}>
                        {nonLette}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.75 }}>{item.sub}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Report mensile PDF ─────────────────────────────────────────── */}
        <button
          onClick={() => setShowReportSection(v => !v)}
          style={{
            width: '100%', padding: '0.875rem 1.25rem',
            background: showReportSection ? '#EFF6FF' : 'white',
            border: `2px solid ${showReportSection ? '#93C5FD' : '#E5E7EB'}`,
            borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>📄</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#1D4ED8' }}>Report mensile</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#888' }}>Scarica il riepilogo PDF di presenze, pasti e diario</p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#93C5FD' }}>{showReportSection ? '▲' : '▼'}</span>
        </button>
        {showReportSection && (
          <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {bambini.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1D4ED8' }}>Bambino</label>
                <select value={reportBambinoId} onChange={e => setReportBambinoId(Number(e.target.value))}
                  style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #BFDBFE', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'white' }}>
                  <option value="">— seleziona —</option>
                  {bambini.map(b => {
                    const nome = b.alias_attivo && b.alias_nome ? b.alias_nome : b.nome
                    return <option key={b.id} value={b.id}>{nome} {b.cognome}</option>
                  })}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1D4ED8' }}>Mese</label>
              <select value={reportMese} onChange={e => setReportMese(Number(e.target.value))}
                style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #BFDBFE', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'white' }}>
                {['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1D4ED8' }}>Anno</label>
              <select value={reportAnno} onChange={e => setReportAnno(Number(e.target.value))}
                style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #BFDBFE', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'white' }}>
                {[new Date().getFullYear(), new Date().getFullYear() - 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button onClick={downloadReport} disabled={!reportBambinoId || reportLoading}
              style={{ padding: '0.5rem 1.25rem', background: reportBambinoId ? '#1D4ED8' : '#93C5FD', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700, cursor: reportBambinoId && !reportLoading ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
              {reportLoading ? '⏳ Generando...' : '⬇ Scarica PDF'}
            </button>
          </div>
        )}

        {/* ── Export GDPR ──────────────────────────────────────────── */}
        <button
          onClick={() => setShowGdprSection(v => !v)}
          style={{ width: '100%', textAlign: 'left', padding: '0.85rem 1.25rem', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', background: showGdprSection ? '#F5F3FF' : 'white', border: `2px solid ${showGdprSection ? '#C4B5FD' : '#E5E7EB'}` }}>
          <span style={{ fontSize: '1.3rem' }}>📤</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#7C3AED' }}>I miei dati (GDPR)</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>Scarica tutti i dati del tuo bambino (Art. 20 GDPR)</p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#C4B5FD' }}>{showGdprSection ? '▲' : '▼'}</span>
        </button>
        {showGdprSection && (
          <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#F5F3FF', borderRadius: '12px', border: '1px solid #C4B5FD', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
  )
}
