'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const CARD_STYLE: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #FF9A3C 0%, #FF6B35 60%, #F7B731 100%)',
  padding: '1rem',
}

const BOX_STYLE: React.CSSProperties = {
  background: 'white',
  borderRadius: '24px',
  padding: '2.5rem 2rem',
  width: '100%',
  maxWidth: '400px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '2px solid #E2E8F0',
  borderRadius: '12px',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const BTN_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '0.875rem',
  background: 'linear-gradient(135deg, #FF9A3C, #FF6B35)',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  marginTop: '0.5rem',
}

export default function ResetPasswordConfirmPage() {
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <div style={CARD_STYLE}>
        <div style={BOX_STYLE}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>❌</div>
            <p style={{ color: '#C53030', fontWeight: 600 }}>Link non valido o mancante.</p>
            <Link href={`/${locale}/reset-password`} style={{ color: '#FF6B35', fontWeight: 600 }}>
              Richiedi un nuovo link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono.')
      return
    }
    if (newPassword.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push(`/${locale}/login`), 2500)
      } else {
        setError(data.detail || 'Errore durante il reset.')
      }
    } catch {
      setError('Errore di rete. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={CARD_STYLE}>
      <div style={BOX_STYLE}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔒</div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#2D3748' }}>
            Nuova password
          </h1>
        </div>

        {done ? (
          <div style={{
            background: '#F0FFF4',
            border: '1px solid #9AE6B4',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
            color: '#276749',
          }}>
            ✅ Password aggiornata! Reindirizzamento al login...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: '#FFF5F5',
                border: '1px solid #FEB2B2',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#C53030',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#4A5568' }}>
                Nuova password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={INPUT_STYLE}
                placeholder="Almeno 8 caratteri"
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#4A5568' }}>
                Conferma password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={INPUT_STYLE}
                placeholder="Ripeti la password"
              />
            </div>
            <button type="submit" disabled={loading} style={{ ...BTN_STYLE, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Salvataggio...' : 'Imposta nuova password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
