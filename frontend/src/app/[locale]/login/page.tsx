'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { clearUserCache } from '@/components/UserChip'

function getRolePath(role: string): string {
  switch (role) {
    case 'admin':
    case 'direttrice':
      return '/dashboard/admin'
    case 'coordinatrice':
    case 'insegnante':
      return '/dashboard/staff'
    case 'cuoca':
      return '/dashboard/cuoca'
    case 'genitore':
      return '/dashboard/genitore'
    default:
      // Ruoli personalizzati: dashboard admin con navigazione filtrata per permessi
      return '/dashboard/admin'
  }
}

export default function LoginPage() {
  const t = useTranslations('LoginPage')
  const router = useRouter()
  const locale = useLocale()
  const searchParams = useSearchParams()
  const rawCallback = searchParams.get('callbackUrl') ?? ''
  // Accept only relative paths to prevent open-redirect and URL-growth loops
  const callbackUrl = rawCallback.startsWith('/') ? rawCallback : ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json()
        throw new Error('not authenticated')
      })
      .then(user => {
        router.replace(`/${locale}${getRolePath(user.role)}`)
      })
      .catch(() => setCheckingAuth(false))
  }, [locale, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || t('errorGeneric'))
        return
      }

      clearUserCache()
      if (callbackUrl) {
        router.push(callbackUrl)
      } else {
        router.push(`/${locale}${getRolePath(data.role)}`)
      }
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FF9A3C 0%, #FF6B35 60%, #F7B731 100%)',
      }} />
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #FF9A3C 0%, #FF6B35 60%, #F7B731 100%)',
      padding: '1rem',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🏫</div>
          <h1 style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: 800,
            color: '#E8562A',
            letterSpacing: '-0.02em',
          }}>
            {t('title')}
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#aaa', fontSize: '0.875rem' }}>
            {t('subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.375rem',
              fontWeight: 600,
              color: '#444',
              fontSize: '0.875rem',
            }}>
              {t('emailLabel')}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '2px solid #FFD4B3',
                borderRadius: '12px',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                opacity: loading ? 0.7 : 1,
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.375rem',
              fontWeight: 600,
              color: '#444',
              fontSize: '0.875rem',
            }}>
              {t('passwordLabel')}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '2px solid #FFD4B3',
                borderRadius: '12px',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                opacity: loading ? 0.7 : 1,
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#FADBD8',
              color: '#C0392B',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading ? '#FFB8A0' : '#E8562A',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.025em',
              fontFamily: 'inherit',
            }}
          >
            {loading ? t('loading') : t('submitButton')}
          </button>
        </form>
      </div>
    </div>
  )
}
