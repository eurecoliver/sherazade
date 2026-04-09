'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsensoGenitore {
  id: number | null
  finalita: string
  finalita_label: string
  mio_consenso: boolean
  mia_data_consenso: string | null
  revocato: boolean
  data_revoca: string | null
}

interface FilioStato {
  id: number
  nome: string
  cognome: string
  non_fotografabile: boolean
  is_genitore2: boolean
  consensi: ConsensoGenitore[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FINALITA_DESC: Record<string, string> = {
  uso_interno:
    'Le foto vengono conservate in modo sicuro e visibili solo allo staff. Utilizzate per attività pedagogiche interne e documentazione del percorso educativo.',
  genitori_diretti:
    'Le foto vengono condivise esclusivamente con i genitori del vostro bambino attraverso il portale sicuro Sherazade.',
  newsletter_scolastica:
    'Alcune foto (senza nome) potrebbero comparire nelle comunicazioni ufficiali della scuola: newsletter, bacheca fisica. Mai su social network.',
}

const FINALITA_ICON: Record<string, string> = {
  uso_interno: '🏫',
  genitori_diretti: '👨‍👩‍👧',
  newsletter_scolastica: '📰',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const BACK_BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
  background: 'rgba(255,255,255,0.15)',
  color: 'white',
  border: '1.5px solid rgba(255,255,255,0.3)',
  borderRadius: '20px',
  padding: '0.35rem 0.875rem 0.35rem 0.625rem',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  marginBottom: '0.875rem',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GenitoreConsensiPage() {
  const router = useRouter()
  const locale = useLocale()

  const [figli, setFigli] = useState<FilioStato[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState<number | null>(null)

  const fetchMiei = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/consensi/miei')
      if (res.status === 401) { router.push(`/${locale}/login`); return }
      if (!res.ok) throw new Error()
      setFigli(await res.json())
    } catch {
      setError('Errore nel caricamento. Riprova.')
    } finally {
      setLoading(false)
    }
  }, [locale, router])

  useEffect(() => { fetchMiei() }, [fetchMiei])

  const handleToggle = async (consenso: ConsensoGenitore) => {
    if (!consenso.id || consenso.revocato) return
    const key = String(consenso.id)
    setActionLoading(key)
    try {
      const endpoint = consenso.mio_consenso
        ? `/api/consensi/${consenso.id}/revoca-consenso`
        : `/api/consensi/${consenso.id}/dai-consenso`
      const res = await fetch(endpoint, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Errore durante il salvataggio.')
        return
      }
      await fetchMiei()
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownloadPdf = async (figlioId: number, nomeCognome: string) => {
    setPdfLoading(figlioId)
    try {
      const res = await fetch(`/api/consensi/pdf?bambino=${figlioId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.detail ?? 'Errore nella generazione del PDF.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `consensi_${nomeCognome.replace(/\s+/g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Errore nella generazione del PDF.')
    } finally {
      setPdfLoading(null)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#FFF3EE' }}>
        <p style={{ color: '#E17055', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF3EE' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #E17055 0%, #C0392B 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(860px, 96vw)', margin: '0 auto' }}>
          <button onClick={() => router.push(`/${locale}/dashboard/genitore`)} style={BACK_BTN}>
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', fontWeight: 800 }}>📷 I miei consensi</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            Gestisci le autorizzazioni fotografiche per i tuoi figli
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'min(860px, 96vw)', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Info GDPR */}
        <div style={{
          background: 'white', borderRadius: '14px', padding: '1rem 1.25rem',
          marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(225,112,85,0.08)',
          borderLeft: '4px solid #E17055',
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#555', lineHeight: 1.6 }}>
            <strong>ℹ️ I tuoi diritti GDPR:</strong> Puoi dare o revocare il consenso in qualsiasi momento.
            La revoca non ha effetto retroattivo. Per richiedere la <strong>riattivazione di un consenso revocato</strong> scarica il modulo PDF, firmalo e consegnalo alla scuola.
          </p>
        </div>

        {error && (
          <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {figli.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👶</div>
            <p style={{ margin: 0 }}>Nessun figlio trovato. Contatta la scuola per associare il tuo account.</p>
          </div>
        ) : figli.map(figlio => (
          <div key={figlio.id} style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', marginBottom: '1.25rem', boxShadow: '0 4px 16px rgba(225,112,85,0.08)' }}>

            {/* Card header: nome + download PDF */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.875rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E17055', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                  {figlio.nome.charAt(0)}{figlio.cognome.charAt(0)}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: '#333', fontSize: '1rem' }}>{figlio.nome} {figlio.cognome}</p>
                  <p style={{ margin: 0, fontSize: '0.775rem', color: '#aaa' }}>
                    {figlio.is_genitore2 ? 'Sei il genitore 2' : 'Sei il genitore 1'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownloadPdf(figlio.id, `${figlio.nome} ${figlio.cognome}`)}
                disabled={pdfLoading === figlio.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.45rem 0.9rem',
                  background: '#FFF3EE', color: '#E17055',
                  border: '1.5px solid #FFD4B3', borderRadius: '10px',
                  fontSize: '0.8rem', fontWeight: 600,
                  cursor: pdfLoading === figlio.id ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: pdfLoading === figlio.id ? 0.6 : 1,
                  flexShrink: 0,
                }}
              >
                📄 {pdfLoading === figlio.id ? 'Generazione...' : 'Riepilogo PDF'}
              </button>
            </div>

            {/* Banner non fotografabile */}
            {figlio.non_fotografabile && (
              <div style={{ background: '#333', color: 'white', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                ⚫ Questo bambino è marcato come <strong>non fotografabile</strong> dalla scuola.
                Nessuna foto può essere scattata indipendentemente dai consensi.
              </div>
            )}

            {/* Sezioni finalità */}
            {figlio.consensi.map(c => (
              <div key={c.finalita} style={{
                borderRadius: '12px',
                border: `2px solid ${c.revocato ? '#FEB2B2' : '#FFE0CC'}`,
                background: c.revocato ? '#FFFAFA' : 'white',
                padding: '1rem',
                marginBottom: '0.75rem',
                opacity: figlio.non_fotografabile ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 0.375rem', fontWeight: 700, color: '#333', fontSize: '0.9rem' }}>
                      {FINALITA_ICON[c.finalita]} {c.finalita_label}
                    </p>
                    <p style={{ margin: 0, color: '#777', fontSize: '0.8rem', lineHeight: 1.5 }}>
                      {FINALITA_DESC[c.finalita]}
                    </p>
                  </div>

                  {/* Azione destra */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                    {c.id === null ? (
                      <span style={{ fontSize: '0.775rem', color: '#aaa', marginTop: '0.25rem' }}>Non configurato</span>
                    ) : c.revocato ? (
                      <>
                        <span style={{ background: '#FADBD8', color: '#C0392B', padding: '0.375rem 0.75rem', borderRadius: '8px', fontSize: '0.775rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          🔴 Revocato
                        </span>
                        <button
                          onClick={() => handleDownloadPdf(figlio.id, `${figlio.nome} ${figlio.cognome}`)}
                          disabled={pdfLoading === figlio.id}
                          style={{
                            padding: '0.3rem 0.65rem',
                            background: 'white', color: '#C53030',
                            border: '1.5px solid #FEB2B2', borderRadius: '8px',
                            fontSize: '0.72rem', fontWeight: 600,
                            cursor: pdfLoading === figlio.id ? 'wait' : 'pointer',
                            fontFamily: 'inherit', whiteSpace: 'nowrap',
                          }}
                        >
                          📄 Modulo riattivazione
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleToggle(c)}
                        disabled={!!actionLoading || figlio.non_fotografabile}
                        style={{
                          padding: '0.5rem 1rem',
                          background: c.mio_consenso ? '#27AE60' : 'white',
                          color: c.mio_consenso ? 'white' : '#888',
                          border: `2px solid ${c.mio_consenso ? '#27AE60' : '#DDD'}`,
                          borderRadius: '10px', fontSize: '0.825rem', fontWeight: 700,
                          cursor: (actionLoading || figlio.non_fotografabile) ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', whiteSpace: 'nowrap',
                          opacity: actionLoading === String(c.id) ? 0.6 : 1,
                          transition: 'all 0.2s',
                        }}
                      >
                        {c.mio_consenso ? '✓ Consenso dato' : '○ Do il consenso'}
                      </button>
                    )}
                  </div>
                </div>

                {c.mio_consenso && c.mia_data_consenso && (
                  <p style={{ margin: '0.625rem 0 0', fontSize: '0.75rem', color: '#27AE60' }}>
                    ✓ Consenso dato il {fmt(c.mia_data_consenso)}
                  </p>
                )}
                {c.revocato && c.data_revoca && (
                  <p style={{ margin: '0.625rem 0 0', fontSize: '0.75rem', color: '#C0392B' }}>
                    Revocato il {fmt(c.data_revoca)}. Scarica il modulo, firmalo e consegnalo in segreteria per riattivarlo.
                  </p>
                )}
                {c.id === null && (
                  <p style={{ margin: '0.625rem 0 0', fontSize: '0.75rem', color: '#aaa' }}>
                    Il registro per questa finalità non è ancora stato configurato dalla scuola.
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
