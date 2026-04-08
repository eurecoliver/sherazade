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

export default function AdminDashboard() {
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F3F0FF' }}>
        <p style={{ color: '#6C5CE7', fontWeight: 600 }}>{t('loading')}</p>
      </div>
    )
  }

  const roleLabel = t(`roles.${user.role}` as Parameters<typeof t>[0])

  return (
    <div style={{ minHeight: '100vh', background: '#F3F0FF', padding: '2rem 1rem' }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        boxShadow: '0 8px 30px rgba(108,92,231,0.12)',
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚙️</div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#6C5CE7' }}>
            {t('adminTitle')}
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: '#888', fontSize: '0.9rem' }}>
            {roleLabel}
          </p>
        </div>

        <div style={{
          background: '#F3F0FF',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '2rem',
        }}>
          <p style={{ margin: 0, color: '#555' }}>
            {t('welcome')},{' '}
            <strong style={{ color: '#6C5CE7' }}>
              {user.first_name || user.email}
            </strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/admin/bambini`)}
            style={{ padding: '0.75rem 1.25rem', background: '#F3F0FF', color: '#6C5CE7', border: '2px solid #D6CCFF', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            👶 Bambini
          </button>
          <button
            onClick={() => router.push(`/${locale}/dashboard/admin/genitori`)}
            style={{ padding: '0.75rem 1.25rem', background: '#FDF0FF', color: '#9B59B6', border: '2px solid #E8BFFF', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            👨‍👩‍👧 Genitori
          </button>
          <button
            onClick={() => router.push(`/${locale}/dashboard/admin/consensi`)}
            style={{ padding: '0.75rem 1.25rem', background: '#FFF3EE', color: '#E17055', border: '2px solid #FFD4B3', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            📷 Consensi
          </button>
          <button
            onClick={() => router.push(`/${locale}/dashboard/admin/presenze`)}
            style={{ padding: '0.75rem 1.25rem', background: '#F0FFF4', color: '#38A169', border: '2px solid #9AE6B4', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ✅ Presenze
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => router.push(`/${locale}/dashboard/admin/utenti`)}
              style={{ padding: '0.75rem 1.25rem', background: '#EBF8FF', color: '#2B6CB0', border: '2px solid #90CDF4', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              👥 Utenti
            </button>
          )}
          <button
            onClick={() => router.push(`/${locale}/dashboard/admin/pappe`)}
            style={{ padding: '0.75rem 1.25rem', background: '#FFF9E6', color: '#E67E22', border: '2px solid #FED7AA', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            🍽️ Menu
          </button>
          <button
            onClick={() => router.push(`/${locale}/dashboard/admin/impostazioni`)}
            style={{ padding: '0.75rem 1.25rem', background: '#F3F0FF', color: '#6C5CE7', border: '2px solid #D6CCFF', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ⚙️ Impostazioni
          </button>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#6C5CE7',
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
