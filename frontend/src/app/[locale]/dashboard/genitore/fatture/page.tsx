'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

interface Fattura {
  id: number
  anno: number
  mese: number
  importo: string | null
  note: string
  file_url: string | null
  caricato_il: string
  caricato_da_nome: string
}

const MESI = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

export default function GenitoreFatturePage() {
  const router = useRouter()
  const locale = useLocale()
  const [fatture, setFatture] = useState<Fattura[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/fatture')
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(data => {
        const list: Fattura[] = Array.isArray(data) ? data : (data.results ?? [])
        // Sort by year desc, month desc
        list.sort((a, b) => b.anno !== a.anno ? b.anno - a.anno : b.mese - a.mese)
        setFatture(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#FFF3EE', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/genitore`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', padding: '0.25rem', color: '#E17055' }}
          >
            ←
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#E17055' }}>
              🧾 Le mie fatture
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>
              Documenti di pagamento caricati dalla scuola
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#E17055' }}>Caricamento…</div>
        ) : fatture.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '16px', padding: '3rem 2rem',
            textAlign: 'center', boxShadow: '0 4px 20px rgba(225,112,85,0.08)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧾</div>
            <p style={{ color: '#888', fontSize: '1rem', margin: 0 }}>
              Nessuna fattura disponibile al momento.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {fatture.map(f => (
              <div key={f.id} style={{
                background: 'white',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 4px 20px rgba(225,112,85,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}>
                {/* Month badge */}
                <div style={{
                  flexShrink: 0,
                  background: '#FFF3EE',
                  borderRadius: '12px',
                  padding: '0.6rem 0.9rem',
                  textAlign: 'center',
                  minWidth: '64px',
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#E17055', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {MESI[f.mese].substring(0, 3)}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#333' }}>{f.anno}</div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#333', fontSize: '1rem' }}>
                    {MESI[f.mese]} {f.anno}
                  </p>
                  {f.importo && (
                    <p style={{ margin: '0.15rem 0 0', color: '#E17055', fontWeight: 700, fontSize: '1.05rem' }}>
                      € {parseFloat(f.importo).toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  {f.note && (
                    <p style={{ margin: '0.25rem 0 0', color: '#888', fontSize: '0.82rem' }}>
                      {f.note}
                    </p>
                  )}
                  <p style={{ margin: '0.25rem 0 0', color: '#aaa', fontSize: '0.75rem' }}>
                    Caricata il {new Date(f.caricato_il).toLocaleDateString('it-IT')}
                  </p>
                </div>

                {/* Download */}
                {f.file_url && (
                  <a
                    href={f.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, #E17055, #C0392B)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.6rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    📥 Scarica
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
