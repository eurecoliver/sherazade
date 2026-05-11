'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
  const locale = useLocale()
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const INPUT_STYLE: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '2px solid #E2E8F0',
    borderRadius: '12px',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Le nuove password non coincidono.')
      return
    }
    if (newPassword.length < 8) {
      setError('La nuova password deve essere di almeno 8 caratteri.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.back(), 2000)
      } else {
        setError(data.detail || 'Errore durante il cambio password.')
      }
    } catch {
      setError('Errore di rete. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F0FF' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)',
        padding: '1.5rem 1.5rem 2rem',
        color: 'white',
      }}>
        <div style={{ maxWidth: 'min(480px, 96vw)', margin: '0 auto' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              color: 'white',
              padding: '0.4rem 1rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            ← Indietro
          </button>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', fontWeight: 800 }}>
            🔑 Cambia password
          </h1>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 'min(480px, 96vw)', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          {done ? (
            <div style={{
              background: '#F0FFF4',
              border: '1px solid #9AE6B4',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              color: '#276749',
              fontWeight: 600,
            }}>
              ✅ Password aggiornata con successo!
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
                  Password attuale
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={INPUT_STYLE}
                />
              </div>

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

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#4A5568' }}>
                  Conferma nuova password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={INPUT_STYLE}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: loading ? '#CBD5E0' : 'linear-gradient(135deg, #6C5CE7, #4834D4)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Salvataggio...' : 'Aggiorna password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
