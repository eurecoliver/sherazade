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

export default function StaffDashboard() {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const locale = useLocale()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json()
        throw new Error()
      })
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

  const roleLabel = t(`roles.${user.role}` as Parameters<typeof t>[0])

  return (
    <div style={{ minHeight: '100vh', background: '#EAF4FF', padding: '2rem 1rem' }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        boxShadow: '0 8px 30px rgba(9,132,227,0.12)',
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📋</div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0984E3' }}>
            {t('staffTitle')}
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: '#888', fontSize: '0.9rem' }}>
            {roleLabel}
          </p>
        </div>

        <div style={{
          background: '#EAF4FF',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '2rem',
        }}>
          <p style={{ margin: 0, color: '#555' }}>
            {t('welcome')},{' '}
            <strong style={{ color: '#0984E3' }}>
              {user.first_name || user.email}
            </strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/staff/presenze`)}
            style={{ padding: '0.75rem 1.25rem', background: '#EAF4FF', color: '#0984E3', border: '2px solid #BDE0FF', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ✅ Presenze
          </button>
          <button
            onClick={() => router.push(`/${locale}/dashboard/staff/diario`)}
            style={{ padding: '0.75rem 1.25rem', background: '#EAF4FF', color: '#0984E3', border: '2px solid #BDE0FF', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            📖 Diario del giorno
          </button>
          <button
            onClick={() => router.push(`/${locale}/dashboard/staff/pappe`)}
            style={{ padding: '0.75rem 1.25rem', background: '#EAF4FF', color: '#0984E3', border: '2px solid #BDE0FF', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            🥣 Foglio pappe
          </button>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#0984E3',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {t('logout')}
        </button>
      </div>
    </div>
  )
}
