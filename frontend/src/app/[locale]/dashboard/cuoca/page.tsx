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

export default function CuocaDashboard() {
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#EAFAF1' }}>
        <p style={{ color: '#00B894', fontWeight: 600 }}>{t('loading')}</p>
      </div>
    )
  }

  const roleLabel = t(`roles.${user.role}` as Parameters<typeof t>[0])

  return (
    <div style={{ minHeight: '100vh', background: '#EAFAF1', padding: '2rem 1rem' }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        boxShadow: '0 8px 30px rgba(0,184,148,0.12)',
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🍽️</div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#00B894' }}>
            {t('cuocaTitle')}
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: '#888', fontSize: '0.9rem' }}>
            {roleLabel}
          </p>
        </div>

        <div style={{
          background: '#EAFAF1',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '2rem',
        }}>
          <p style={{ margin: 0, color: '#555' }}>
            {t('welcome')},{' '}
            <strong style={{ color: '#00B894' }}>
              {user.first_name || user.email}
            </strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/cuoca/pappe`)}
            style={{ padding: '0.75rem 1.25rem', background: '#EAFAF1', color: '#00B894', border: '2px solid #A8E6CF', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            🍽️ Pappe del giorno
          </button>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#00B894',
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
