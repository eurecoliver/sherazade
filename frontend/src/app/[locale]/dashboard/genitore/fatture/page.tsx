'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

interface Fattura {
  id: number
  anno: number
  mese: number
  importo: string | null
  note: string
  file_url: string | null
  caricato_at: string
  caricato_da_nome: string
  bambino: number | null
  bambino_nome: string | null
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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF3EE' }}>
      {/* Header gradient */}
      <div style={{ background: 'linear-gradient(135deg, #276749 0%, #1a4731 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(860px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button
              onClick={() => router.push(`/${locale}/dashboard/genitore`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', fontWeight: 800 }}>🧾 Le mie fatture</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>Documenti di pagamento caricati dalla scuola</p>
        </div>
      </div>
      <div style={{ maxWidth: 'min(860px, 96vw)', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

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
                  {f.bambino_nome && (
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: '#6C63FF', fontWeight: 600 }}>
                      👶 {f.bambino_nome}
                    </p>
                  )}
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
                    Caricata il {new Date(f.caricato_at).toLocaleDateString('it-IT')}
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
