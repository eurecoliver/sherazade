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
]

export default function GenitoreDashboard() {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const locale = useLocale()
  const [user, setUser] = useState<User | null>(null)
  const [bambini, setBambini] = useState<Bambino[]>([])
  const [nonLette, setNonLette] = useState(0)
  const [risorse, setRisorse] = useState<string[] | null>(null)

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

      </div>
    </div>
  )
}
