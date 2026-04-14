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

export default function CuocaDashboard() {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const locale = useLocale()
  const [user, setUser] = useState<User | null>(null)
  const [presentiOggi, setPresentiOggi] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(res => res.ok ? res.json() : Promise.reject()),
      fetch('/api/presenze/presenti-oggi').then(res => res.ok ? res.json() : null),
    ])
      .then(([me, presenze]) => {
        setUser(me)
        if (presenze) setPresentiOggi(presenze.presenti)
      })
      .catch(() => router.push(`/${locale}/login`))
  }, [locale, router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#EAFAF1' }}>
        <p style={{ color: '#00B894', fontWeight: 600 }}>{t('loading')}</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EAFAF1' }}>

      {/* ── Header a gradiente ─────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #00B894 0%, #00917A 100%)', padding: '2rem 1.5rem 3rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(720px, 96vw)', margin: '0 auto' }}>
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
      <div style={{ maxWidth: 'min(720px, 96vw)', margin: '-1.5rem auto 0', padding: '0 1rem 3rem', position: 'relative', zIndex: 1 }}>

        {/* Contatore presenti oggi */}
        <div style={{
          background: 'white',
          borderRadius: '18px',
          padding: '1.5rem',
          marginBottom: '0.75rem',
          boxShadow: '0 8px 32px rgba(0,184,148,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '14px',
            background: 'linear-gradient(135deg, #00B894 0%, #00917A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,184,148,0.3)',
          }}>
            🧒
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#38A169', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Bambini presenti oggi
            </p>
            <p style={{ margin: '0.1rem 0 0', fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', fontWeight: 800, color: '#2F855A', lineHeight: 1 }}>
              {presentiOggi !== null ? presentiOggi : '—'}
            </p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#888' }}>
              {presentiOggi !== null ? 'calibra le porzioni di conseguenza' : 'caricamento in corso…'}
            </p>
          </div>
        </div>

        {/* Pappe del giorno */}
        <button
          onClick={() => router.push(`/${locale}/dashboard/cuoca/pappe`)}
          style={{
            width: '100%',
            padding: 'clamp(1rem, 3vw, 1.4rem) 1.5rem',
            background: 'white',
            color: '#00917A',
            border: 'none',
            borderRadius: '18px',
            boxShadow: '0 8px 32px rgba(0,184,148,0.12)',
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
            background: 'linear-gradient(135deg, #00B894 0%, #00917A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,184,148,0.3)',
          }}>
            🍽️
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 'clamp(1rem, 2.5vw, 1.15rem)', fontWeight: 800, color: '#333' }}>
              Pappe del giorno
            </p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: '#888' }}>
              Menu, allergie e registro pasti
            </p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '1.2rem', color: '#00B894', opacity: 0.6 }}>›</span>
        </button>

      </div>
    </div>
  )
}
