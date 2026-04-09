'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
}

const NAV_ITEMS = [
  { icon: '✅', label: 'Presenze',         sub: 'Registro giornaliero',       path: '/presenze', bg: '#F0FFF4', color: '#2D6A4F', border: '#9AE6B4' },
  { icon: '📖', label: 'Diario del giorno', sub: 'Attività, foto e note',     path: '/diario',   bg: '#EAF4FF', color: '#0984E3', border: '#BDE0FF' },
  { icon: '🥣', label: 'Foglio pappe',      sub: 'Pasti e menu del giorno',   path: '/pappe',    bg: '#FFF9E6', color: '#E67E22', border: '#FED7AA' },
  { icon: '📝', label: 'Agenda',            sub: 'Note condivise del turno',  path: '/agenda',   bg: '#FDF2F8', color: '#9B59B6', border: '#E8BFFF' },
]

export default function StaffDashboard() {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const locale = useLocale()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => { if (res.ok) return res.json(); throw new Error() })
      .then(setUser)
      .catch(() => router.push(`/${locale}/login`))
  }, [locale, router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#EAF4FF' }}>
        <p style={{ color: '#0984E3', fontWeight: 600 }}>{t('loading')}</p>
      </div>
    )
  }

  const base = `/${locale}/dashboard/staff`

  return (
    <div style={{ minHeight: '100vh', background: '#EAF4FF' }}>

      {/* ── Header a gradiente ─────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #0984E3 0%, #0652DD 100%)', padding: '2rem 1.5rem 3rem', color: 'white' }}>
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
            <button
              onClick={handleLogout}
              style={{ padding: '0.5rem 1.1rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
            >
              Esci
            </button>
          </div>
        </div>
      </div>

      {/* ── Contenuto principale ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 'min(960px, 96vw)', margin: '-1.5rem auto 0', padding: '0 1rem 3rem', position: 'relative', zIndex: 1 }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
          gap: '0.75rem',
        }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              onClick={() => router.push(`${base}${item.path}`)}
              style={{
                padding: '1.25rem 1rem',
                background: item.bg,
                color: item.color,
                border: `2px solid ${item.border}`,
                borderRadius: '14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
              }}
            >
              <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{item.label}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.75 }}>{item.sub}</p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
