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

const NAV_ITEMS = [
  { icon: '👶', label: 'Bambini',       sub: 'Anagrafica e famiglie',        path: '/bambini',      bg: '#F3F0FF', color: '#6C5CE7', border: '#D6CCFF', risorsa: 'bambini' },
  { icon: '👨‍👩‍👧', label: 'Genitori',      sub: 'Gestione famiglie',            path: '/genitori',     bg: '#FDF0FF', color: '#9B59B6', border: '#E8BFFF', risorsa: 'bambini' },
  { icon: '📷', label: 'Consensi',      sub: 'Autorizzazioni fotografiche',  path: '/consensi',     bg: '#FFF3EE', color: '#E17055', border: '#FFD4B3', risorsa: 'consensi' },
  { icon: '✅', label: 'Presenze',      sub: 'Registro e report',           path: '/presenze',     bg: '#F0FFF4', color: '#38A169', border: '#9AE6B4', risorsa: 'presenze' },
  { icon: '🍽️', label: 'Menu',          sub: 'Pappe e ciclo settimanale',   path: '/pappe',        bg: '#FFF9E6', color: '#E67E22', border: '#FED7AA', risorsa: 'pappe' },
  { icon: '🧾', label: 'Fatture',       sub: 'Documenti di pagamento',      path: '/fatture',      bg: '#F0FFF4', color: '#276749', border: '#9AE6B4', risorsa: 'fatture' },
  { icon: '📢', label: 'Circolari',     sub: 'Comunicazioni alle famiglie', path: '/circolari',    bg: '#FFF9E6', color: '#D35400', border: '#FAD7A0', risorsa: 'circolari' },
  { icon: '⚙️', label: 'Impostazioni', sub: 'Gruppi e orari uscita',       path: '/impostazioni', bg: '#F3F0FF', color: '#6C5CE7', border: '#D6CCFF', risorsa: null },
]

// Agenda e Calendario: path assoluti perché puntano alle pagine staff condivise
const AGENDA_ITEM = { icon: '📝', label: 'Agenda', sub: 'Note condivise del turno', risorsa: 'agenda' }
const CALENDARIO_ITEM = { icon: '📅', label: 'Calendario', sub: 'Eventi e chiusure scolastiche', risorsa: 'calendario' }
const PORTFOLIO_ITEM = { icon: '📸', label: 'Portfolio', sub: 'Foto e video del gruppo', risorsa: 'portfolio' }

const ADMIN_ONLY = { icon: '👥', label: 'Utenti', sub: 'Gestione account', path: '/utenti', bg: '#EBF8FF', color: '#2B6CB0', border: '#90CDF4', risorsa: 'utenti' }

export default function AdminDashboard() {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const locale = useLocale()
  const [user, setUser] = useState<User | null>(null)
  const [risorse, setRisorse] = useState<string[] | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/config/permessi-utente').then(r => r.ok ? r.json() : { risorse: null }),
    ])
      .then(([meData, permData]) => {
        setUser(meData)
        setRisorse(permData.risorse ?? null)
      })
      .catch(() => router.push(`/${locale}/login`))
  }, [locale, router])

  const canSee = (risorsa: string | null) => {
    if (risorsa === null) return true   // Impostazioni sempre visibili
    if (!risorse) return true           // In attesa dati, mostra tutto
    return risorse.includes(risorsa)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F3F0FF' }}>
        <p style={{ color: '#6C5CE7', fontWeight: 600 }}>{t('loading')}</p>
      </div>
    )
  }

  const base = `/${locale}/dashboard/admin`
  // "Utenti" è filtrato da canSee('utenti') come tutti gli altri item
  const allItems = [...NAV_ITEMS.slice(0, 4), ADMIN_ONLY, ...NAV_ITEMS.slice(4)]
  const items = allItems.filter(item => canSee(item.risorsa))

  return (
    <div style={{ minHeight: '100vh', background: '#F3F0FF' }}>

      {/* ── Header a gradiente ─────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)', padding: '2rem 1.5rem 3rem', color: 'white' }}>
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
        </div>
      </div>

      {/* ── Contenuto principale ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 'min(960px, 96vw)', margin: '-1.5rem auto 0', padding: '0 1rem 3rem', position: 'relative', zIndex: 1 }}>

        {/* Griglia azioni */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))',
          gap: '0.75rem',
        }}>
          {items.map(item => (
            <button
              key={item.path}
              onClick={() => router.push(`${base}${item.path}`)}
              style={{
                padding: '1rem',
                background: item.bg,
                color: item.color,
                border: `2px solid ${item.border}`,
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
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{item.label}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.75 }}>{item.sub}</p>
              </div>
            </button>
          ))}
          {/* Agenda — pagina condivisa con staff */}
          {canSee(AGENDA_ITEM.risorsa) && (
            <button
              onClick={() => router.push(`/${locale}/dashboard/staff/agenda`)}
              style={{ padding: '1rem', background: '#FDF2F8', color: '#9B59B6', border: '2px solid #E8BFFF', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{AGENDA_ITEM.icon}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{AGENDA_ITEM.label}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.75 }}>{AGENDA_ITEM.sub}</p>
              </div>
            </button>
          )}
          {/* Calendario — pagina condivisa con staff */}
          {canSee(CALENDARIO_ITEM.risorsa) && (
            <button
              onClick={() => router.push(`/${locale}/dashboard/staff/calendario`)}
              style={{ padding: '1rem', background: '#EBF8FF', color: '#2B6CB0', border: '2px solid #90CDF4', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{CALENDARIO_ITEM.icon}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{CALENDARIO_ITEM.label}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.75 }}>{CALENDARIO_ITEM.sub}</p>
              </div>
            </button>
          )}
          {/* Portfolio — pagina condivisa con staff */}
          {canSee(PORTFOLIO_ITEM.risorsa) && (
            <button
              onClick={() => router.push(`/${locale}/dashboard/staff/portfolio`)}
              style={{ padding: '1rem', background: '#FFF0F6', color: '#D63384', border: '2px solid #F5BFDF', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{PORTFOLIO_ITEM.icon}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{PORTFOLIO_ITEM.label}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.75 }}>{PORTFOLIO_ITEM.sub}</p>
              </div>
            </button>
          )}
          {/* Log Accessi GDPR — solo admin */}
          {user.role === 'admin' && (
            <button
              onClick={() => router.push(`${base}/log-accessi`)}
              style={{ padding: '1rem', background: '#F0F4FF', color: '#4834D4', border: '2px solid #C7D2FE', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🔍</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Log Accessi</p>
                <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.75 }}>Audit GDPR dati minori</p>
              </div>
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
