'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'

type TwoFAStep = 'idle' | 'qr' | 'confirm' | 'done'

export default function SicurezzaPage() {
  const locale = useLocale()
  const router = useRouter()

  const [role, setRole] = useState('')
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  // Setup 2FA
  const [setupStep, setSetupStep] = useState<TwoFAStep>('idle')
  const [qrUri, setQrUri] = useState('')
  const [secret, setSecret] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [setupCode, setSetupCode] = useState('')
  const [setupError, setSetupError] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)

  // Disabilita 2FA
  const [disablePassword, setDisablePassword] = useState('')
  const [disableError, setDisableError] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(u => {
        setRole(u.role)
        setTwoFAEnabled(u.two_factor_enabled ?? false)
        setLoading(false)
      })
      .catch(() => router.replace(`/${locale}/login`))
  }, [locale, router])

  const backPath = () => {
    if (['admin', 'direttrice'].includes(role)) return `/${locale}/dashboard/admin`
    if (['coordinatrice', 'insegnante'].includes(role)) return `/${locale}/dashboard/staff`
    if (role === 'cuoca') return `/${locale}/dashboard/cuoca`
    return `/${locale}/dashboard/genitore`
  }

  // ─── Setup 2FA ───────────────────────────────────────────────────────────────

  const startSetup = async () => {
    setSetupLoading(true)
    setSetupError('')
    try {
      const res = await fetch('/api/auth/2fa/setup')
      const data = await res.json()
      if (!res.ok) { setSetupError(data.detail || 'Errore'); return }
      setQrUri(data.qr_uri)
      setSecret(data.secret)
      setSetupToken(data.setup_token)
      setSetupStep('qr')
    } catch {
      setSetupError('Errore di rete.')
    } finally {
      setSetupLoading(false)
    }
  }

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSetupLoading(true)
    setSetupError('')
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_token: setupToken, code: setupCode }),
      })
      const data = await res.json()
      if (!res.ok) { setSetupError(data.detail || 'Errore'); return }
      setTwoFAEnabled(true)
      setSetupStep('done')
    } catch {
      setSetupError('Errore di rete.')
    } finally {
      setSetupLoading(false)
    }
  }

  // ─── Disabilita 2FA ──────────────────────────────────────────────────────────

  const doDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    setDisableLoading(true)
    setDisableError('')
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      })
      const data = await res.json()
      if (!res.ok) { setDisableError(data.detail || 'Errore'); return }
      setTwoFAEnabled(false)
      setDisableOpen(false)
      setDisablePassword('')
      setSetupStep('idle')
    } catch {
      setDisableError('Errore di rete.')
    } finally {
      setDisableLoading(false)
    }
  }

  if (loading) return null

  const CARD: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    marginBottom: '1rem',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f6fa',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2D3436 0%, #636E72 100%)',
        padding: '1.25rem 1.5rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <Link href={backPath()} style={{
          color: 'white',
          textDecoration: 'none',
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '20px',
          padding: '0.375rem 0.875rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          ← Dashboard
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
          🔐 Sicurezza account
        </h1>
      </div>

      <div style={{
        padding: '1.5rem',
        maxWidth: 'min(520px, 96vw)',
        margin: '0 auto',
        width: '100%',
      }}>

        {/* Stato 2FA */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              Autenticazione a due fattori
            </h2>
            <span style={{
              background: twoFAEnabled ? '#00b89422' : '#e0e0e0',
              color: twoFAEnabled ? '#00917A' : '#888',
              borderRadius: '20px',
              padding: '0.25rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}>
              {twoFAEnabled ? '✓ Attiva' : 'Disattiva'}
            </span>
          </div>
          <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem', lineHeight: 1.5 }}>
            La verifica a due fattori aggiunge un livello di sicurezza extra: dopo aver inserito
            email e password, ti verrà chiesto un codice generato dalla tua app autenticatore
            (Google Authenticator, Authy, ecc.).
          </p>

          {/* ─── Sezione attivazione ─── */}
          {!twoFAEnabled && setupStep === 'idle' && (
            <button
              onClick={startSetup}
              disabled={setupLoading}
              style={{
                background: '#00B894',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '0.75rem 1.5rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: setupLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: setupLoading ? 0.7 : 1,
              }}
            >
              {setupLoading ? 'Caricamento...' : '🔑 Attiva 2FA'}
            </button>
          )}

          {!twoFAEnabled && setupStep === 'qr' && (
            <div>
              <p style={{ margin: '0 0 1rem', color: '#444', fontSize: '0.9rem' }}>
                <strong>1.</strong> Apri la tua app autenticatore (Google Authenticator, Authy…)<br />
                <strong>2.</strong> Scansiona il QR code qui sotto oppure inserisci il codice manualmente:<br />
                <code style={{
                  display: 'inline-block',
                  background: '#f0f0f0',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  letterSpacing: '0.1em',
                  marginTop: '0.25rem',
                }}>
                  {secret}
                </code>
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                margin: '1rem 0',
                padding: '1rem',
                background: 'white',
                borderRadius: '12px',
                border: '2px solid #e0e0e0',
              }}>
                <QRCodeSVG value={qrUri} size={180} />
              </div>

              <form onSubmit={confirmSetup}>
                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: 600, fontSize: '0.875rem', color: '#444' }}>
                  <strong>3.</strong> Inserisci il codice a 6 cifre per confermare
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={setupCode}
                  onChange={e => setSetupCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    fontSize: '1.5rem',
                    letterSpacing: '0.5em',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    marginBottom: '0.75rem',
                  }}
                />
                {setupError && (
                  <p style={{ color: '#C0392B', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>{setupError}</p>
                )}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => { setSetupStep('idle'); setSetupCode(''); setSetupError('') }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'none',
                      border: '2px solid #ddd',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={setupLoading || setupCode.length !== 6}
                    style={{
                      flex: 2,
                      padding: '0.75rem',
                      background: (setupLoading || setupCode.length !== 6) ? '#ccc' : '#00B894',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: (setupLoading || setupCode.length !== 6) ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {setupLoading ? 'Verifica...' : 'Attiva 2FA'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {setupStep === 'done' && (
            <div style={{
              background: '#d4edda',
              color: '#155724',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}>
              ✓ 2FA attivato con successo! Al prossimo login ti verrà chiesto il codice.
            </div>
          )}

          {/* ─── Sezione disattivazione ─── */}
          {twoFAEnabled && (
            <div>
              {!disableOpen ? (
                <button
                  onClick={() => setDisableOpen(true)}
                  style={{
                    background: 'none',
                    border: '2px solid #E74C3C',
                    color: '#E74C3C',
                    borderRadius: '10px',
                    padding: '0.625rem 1.25rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  🗑 Disabilita 2FA
                </button>
              ) : (
                <form onSubmit={doDisable} style={{ marginTop: '0.5rem' }}>
                  <p style={{ margin: '0 0 0.75rem', color: '#444', fontSize: '0.9rem' }}>
                    Inserisci la tua password per disabilitare il 2FA:
                  </p>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={e => setDisablePassword(e.target.value)}
                    placeholder="Password attuale"
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '2px solid #e0e0e0',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      marginBottom: '0.75rem',
                      fontFamily: 'inherit',
                    }}
                  />
                  {disableError && (
                    <p style={{ color: '#C0392B', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>{disableError}</p>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => { setDisableOpen(false); setDisablePassword(''); setDisableError('') }}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'none',
                        border: '2px solid #ddd',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={disableLoading || !disablePassword}
                      style={{
                        flex: 2,
                        padding: '0.75rem',
                        background: (disableLoading || !disablePassword) ? '#ccc' : '#E74C3C',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: (disableLoading || !disablePassword) ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {disableLoading ? 'Disabilito...' : 'Disabilita 2FA'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Link cambio password */}
        <div style={CARD}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Password</h2>
          <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
            Modifica la tua password di accesso.
          </p>
          <Link
            href={`/${locale}/dashboard/change-password`}
            style={{
              display: 'inline-block',
              background: '#6C5CE7',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '10px',
              padding: '0.625rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            🔑 Cambia password
          </Link>
        </div>

      </div>
    </div>
  )
}
