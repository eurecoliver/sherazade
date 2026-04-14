'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'

interface FiglioStato {
  bambino_id: number
  nome: string
  cognome: string
  gruppo: string
  stato: 'nessuno' | 'presente' | 'uscito' | 'assente'
  ora_arrivo: string | null
  ora_uscita: string | null
}

interface CheckinResult {
  azione: 'arrivo' | 'uscita'
  bambino: string
  ora: string
}

function StatoBadge({ stato, ora_arrivo, ora_uscita }: Pick<FiglioStato, 'stato' | 'ora_arrivo' | 'ora_uscita'>) {
  if (stato === 'uscito') {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ background: '#C6F6D5', color: '#276749', borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
          ✓ Entrata {ora_arrivo}
        </span>
        <span style={{ background: '#BEE3F8', color: '#2C5282', borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
          ✓ Uscita {ora_uscita}
        </span>
      </div>
    )
  }
  if (stato === 'presente') {
    return (
      <span style={{ background: '#C6F6D5', color: '#276749', borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
        ✓ Entrato alle {ora_arrivo}
      </span>
    )
  }
  if (stato === 'assente') {
    return (
      <span style={{ background: '#FED7D7', color: '#9B2C2C', borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
        Segnato assente
      </span>
    )
  }
  return (
    <span style={{ background: '#EDF2F7', color: '#718096', borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.8rem' }}>
      Non ancora registrato
    </span>
  )
}

export default function CheckinPage() {
  const router = useRouter()
  const locale = useLocale()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [figli, setFigli] = useState<FiglioStato[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [successo, setSuccesso] = useState<Record<number, CheckinResult>>({})

  useEffect(() => {
    if (!token) {
      setError('QR code non valido. Scansiona di nuovo il codice affisso all\'ingresso.')
      setLoading(false)
      return
    }

    fetch(`/api/presenze/checkin?token=${encodeURIComponent(token)}`)
      .then(res => {
        if (res.status === 401) {
          // Non loggato: redirect al login con callbackUrl
          const callbackUrl = `/${locale}/checkin?token=${encodeURIComponent(token)}`
          router.replace(`/${locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
          return null
        }
        return res.json()
      })
      .then(data => {
        if (!data) return
        if (data.detail) {
          setError(data.detail)
        } else {
          setFigli(data.figli ?? [])
        }
      })
      .catch(() => setError('Errore di connessione. Riprova.'))
      .finally(() => setLoading(false))
  }, [token, locale, router])

  const eseguiCheckin = async (bambinoId: number) => {
    setLoadingId(bambinoId)
    try {
      const res = await fetch('/api/presenze/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, bambino_id: bambinoId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.detail || 'Errore durante il check-in.')
        return
      }
      // Aggiorna stato locale
      setSuccesso(prev => ({ ...prev, [bambinoId]: data }))
      setFigli(prev => prev.map(f => {
        if (f.bambino_id !== bambinoId) return f
        if (data.azione === 'arrivo') return { ...f, stato: 'presente', ora_arrivo: data.ora }
        return { ...f, stato: 'uscito', ora_uscita: data.ora }
      }))
    } catch {
      alert('Errore di connessione. Riprova.')
    } finally {
      setLoadingId(null)
    }
  }

  const azione = (figlio: FiglioStato): { label: string; color: string; bg: string } | null => {
    if (figlio.stato === 'nessuno') return { label: '🏫 Registra Entrata', color: '#276749', bg: '#48BB78' }
    if (figlio.stato === 'presente') return { label: '👋 Registra Uscita', color: '#fff', bg: '#3182CE' }
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '2rem 1rem' }}>

      <div style={{ textAlign: 'center', color: 'white', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏫</div>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900 }}>Check-in</h1>
        <p style={{ margin: '0.3rem 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 'min(440px, 96vw)' }}>

        {loading && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', textAlign: 'center', color: '#718096' }}>
            Caricamento...
          </div>
        )}

        {!loading && error && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
            <p style={{ color: '#C53030', fontWeight: 600, margin: 0 }}>{error}</p>
          </div>
        )}

        {!loading && !error && figli.length === 0 && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', textAlign: 'center', color: '#718096' }}>
            <p style={{ margin: 0 }}>Nessun figlio trovato per questo account.</p>
          </div>
        )}

        {figli.map(figlio => {
          const btn = azione(figlio)
          const esito = successo[figlio.bambino_id]
          const isLoading = loadingId === figlio.bambino_id

          return (
            <div key={figlio.bambino_id} style={{
              background: 'white',
              borderRadius: '20px',
              padding: '1.25rem',
              marginBottom: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#2D3748' }}>
                    {figlio.nome} {figlio.cognome}
                  </div>
                  {figlio.gruppo && (
                    <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.15rem' }}>{figlio.gruppo}</div>
                  )}
                </div>
              </div>

              <StatoBadge stato={figlio.stato} ora_arrivo={figlio.ora_arrivo} ora_uscita={figlio.ora_uscita} />

              {esito && (
                <div style={{
                  background: esito.azione === 'arrivo' ? '#F0FFF4' : '#EBF8FF',
                  border: `2px solid ${esito.azione === 'arrivo' ? '#68D391' : '#63B3ED'}`,
                  borderRadius: '12px',
                  padding: '0.75rem',
                  marginTop: '0.75rem',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: esito.azione === 'arrivo' ? '#276749' : '#2C5282',
                }}>
                  {esito.azione === 'arrivo' ? '✓ Entrata registrata' : '✓ Uscita registrata'} alle {esito.ora}
                </div>
              )}

              {btn && !esito && (
                <button
                  onClick={() => eseguiCheckin(figlio.bambino_id)}
                  disabled={isLoading}
                  style={{
                    marginTop: '0.875rem',
                    width: '100%',
                    padding: '0.875rem',
                    background: isLoading ? '#A0AEC0' : btn.bg,
                    color: btn.color === '#276749' ? 'white' : btn.color,
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {isLoading ? 'Registrazione...' : btn.label}
                </button>
              )}
            </div>
          )
        })}

        {!loading && !error && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              onClick={() => router.push(`/${locale}/dashboard/genitore`)}
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '20px', padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}
            >
              ← Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
