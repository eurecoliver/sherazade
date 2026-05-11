'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
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

export default function ResetPasswordPage() {
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json()
        setError(data.detail || 'Errore durante la richiesta.')
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
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔑</div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#2D3748' }}>
            Reset password
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: '#718096', fontSize: '0.9rem' }}>
            Inserisci la tua email per ricevere il link di reset.
          </p>
        </div>

        {sent ? (
          <div style={{
            background: '#F0FFF4',
            border: '1px solid #9AE6B4',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
            color: '#276749',
            fontSize: '0.95rem',
          }}>
            ✅ Se l&apos;email è registrata, riceverai un link entro qualche minuto.
            <br /><br />
            <Link
              href={`/${locale}/login`}
              style={{ color: '#FF6B35', fontWeight: 600, textDecoration: 'none' }}
            >
              ← Torna al login
            </Link>
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
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={INPUT_STYLE}
                placeholder="nome@esempio.it"
              />
            </div>
            <button type="submit" disabled={loading} style={{ ...BTN_STYLE, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Invio in corso...' : 'Invia link di reset'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <Link
                href={`/${locale}/login`}
                style={{ color: '#718096', fontSize: '0.875rem', textDecoration: 'none' }}
              >
                ← Torna al login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
