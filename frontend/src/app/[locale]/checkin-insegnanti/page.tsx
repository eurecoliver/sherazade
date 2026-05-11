'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'

interface PresenzaInsegnante {
  ora_entrata: string | null
  ora_uscita: string | null
}

interface CheckinInfo {
  data: string
  insegnante: {
    id: number
    nome: string
    cognome: string
    email: string
  }
  stato: 'nessuno' | 'entrata_registrata' | 'uscita_registrata'
  presenza: PresenzaInsegnante | null
}

interface CheckinResult {
  azione: 'entrata' | 'uscita'
  ora: string
}

export default function CheckinInsegnantiPage() {
  const router = useRouter()
  const locale = useLocale()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState<CheckinInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const [esito, setEsito] = useState<CheckinResult | null>(null)

  useEffect(() => {
    if (!token) {
      setError('QR code non valido. Scansiona di nuovo il codice staff.')
      setLoading(false)
      return
    }

    fetch(`/api/presenze/checkin-insegnanti?token=${encodeURIComponent(token)}`)
      .then(res => {
        if (res.status === 401) {
          const callbackUrl = `/${locale}/checkin-insegnanti?token=${encodeURIComponent(token)}`
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
          setInfo(data as CheckinInfo)
        }
      })
      .catch(() => setError('Errore di connessione. Riprova.'))
      .finally(() => setLoading(false))
  }, [token, locale, router])

  const timbra = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/presenze/checkin-insegnanti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.detail || 'Errore durante la timbratura.')
        return
      }
      setEsito(data)
      setInfo(prev => {
        if (!prev) return prev
        if (data.azione === 'entrata') {
          return {
            ...prev,
            stato: 'entrata_registrata',
            presenza: { ...prev.presenza, ora_entrata: data.ora, ora_uscita: prev.presenza?.ora_uscita ?? null },
          }
        }
        return {
          ...prev,
          stato: 'uscita_registrata',
          presenza: { ...prev.presenza, ora_entrata: prev.presenza?.ora_entrata ?? null, ora_uscita: data.ora },
        }
      })
    } catch {
      alert('Errore di connessione. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  const ctaLabel = () => {
    if (!info) return ''
    if (info.stato === 'nessuno') return '🏫 Registra entrata'
    if (info.stato === 'entrata_registrata') return '👋 Registra uscita'
    return ''
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #2D3436 0%, #636E72 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', color: 'white', marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👩‍🏫</div>
        <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900 }}>Check-in Insegnanti</h1>
        <p style={{ margin: '0.35rem 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
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

        {!loading && !error && info && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
            <div style={{ marginBottom: '0.8rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#2D3748' }}>
                {info.insegnante.nome} {info.insegnante.cognome}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.15rem' }}>{info.insegnante.email}</div>
            </div>

            {info.stato === 'nessuno' && (
              <span style={{ background: '#EDF2F7', color: '#4A5568', borderRadius: '20px', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                Nessuna timbratura registrata
              </span>
            )}
            {info.stato === 'entrata_registrata' && (
              <span style={{ background: '#C6F6D5', color: '#276749', borderRadius: '20px', padding: '0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
                ✓ Entrata alle {info.presenza?.ora_entrata?.slice(0, 5)}
              </span>
            )}
            {info.stato === 'uscita_registrata' && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ background: '#C6F6D5', color: '#276749', borderRadius: '20px', padding: '0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
                  ✓ Entrata {info.presenza?.ora_entrata?.slice(0, 5)}
                </span>
                <span style={{ background: '#BEE3F8', color: '#2B6CB0', borderRadius: '20px', padding: '0.25rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
                  ✓ Uscita {info.presenza?.ora_uscita?.slice(0, 5)}
                </span>
              </div>
            )}

            {esito && (
              <div style={{ background: esito.azione === 'entrata' ? '#F0FFF4' : '#EBF8FF', border: `2px solid ${esito.azione === 'entrata' ? '#68D391' : '#63B3ED'}`, borderRadius: '12px', padding: '0.75rem', marginTop: '0.9rem', textAlign: 'center', fontWeight: 700, color: esito.azione === 'entrata' ? '#276749' : '#2C5282' }}>
                {esito.azione === 'entrata' ? '✓ Entrata registrata' : '✓ Uscita registrata'} alle {esito.ora}
              </div>
            )}

            {info.stato !== 'uscita_registrata' && !esito?.azione && (
              <button
                onClick={timbra}
                disabled={saving}
                style={{ marginTop: '0.9rem', width: '100%', padding: '0.875rem', background: saving ? '#A0AEC0' : '#2D3436', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                {saving ? 'Registrazione...' : ctaLabel()}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
