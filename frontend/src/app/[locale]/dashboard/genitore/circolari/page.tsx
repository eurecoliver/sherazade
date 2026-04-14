'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

interface Circolare {
  id: number
  titolo: string
  testo: string
  allegato_url: string | null
  autore_nome: string
  gruppi_nomi: string[]
  pubblicata: boolean
  letta: boolean
  creato_at: string
}

export default function CircolariGenitore() {
  const router = useRouter()
  const locale = useLocale()

  const [circolari, setCircolari] = useState<Circolare[]>([])
  const [loading, setLoading] = useState(true)
  const [aperta, setAperta] = useState<Circolare | null>(null)

  const carica = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/circolari')
      if (r.ok) {
        const d = await r.json()
        setCircolari(Array.isArray(d) ? d : (d.results ?? []))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => router.push(`/${locale}/login`))
    carica()
  }, [locale, router, carica])

  const apri = async (c: Circolare) => {
    setAperta(c)
    if (!c.letta) {
      const r = await fetch(`/api/circolari/${c.id}/segna-letta`, { method: 'POST' })
      if (r.ok) {
        setCircolari(prev => prev.map(x => x.id === c.id ? { ...x, letta: true } : x))
      }
    }
  }

  const nonLette = circolari.filter(c => !c.letta).length

  const formatData = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF3EE' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #E17055 0%, #C0392B 100%)', padding: '2rem 1.5rem 3rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(720px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button
              onClick={() => router.push(`/${locale}/dashboard/genitore`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              ‹ Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 800 }}>📢 Circolari</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            Comunicazioni dal nido
            {nonLette > 0 && (
              <span style={{ marginLeft: '0.5rem', background: 'white', color: '#E17055', borderRadius: '12px', padding: '0.1rem 0.6rem', fontSize: '0.8rem', fontWeight: 800 }}>
                {nonLette} nuove
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Contenuto */}
      <div style={{ maxWidth: 'min(720px, 96vw)', margin: '-1.5rem auto 0', padding: '0 1rem 3rem', position: 'relative', zIndex: 1 }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#E17055', padding: '2rem' }}>Caricamento...</p>
        ) : circolari.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', padding: '2.5rem', textAlign: 'center', color: '#BBB' }}>
            Nessuna comunicazione ricevuta.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {circolari.map(c => (
              <button
                key={c.id}
                onClick={() => apri(c)}
                style={{
                  background: 'white', borderRadius: '14px', padding: '1.125rem 1.25rem',
                  display: 'flex', alignItems: 'center', gap: '1rem', width: '100%',
                  boxShadow: '0 2px 8px rgba(225,112,85,0.06)',
                  border: c.letta ? '2px solid #F0F0F0' : '2px solid #FFD4B3',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '12px', background: c.letta ? '#F5F5F5' : 'linear-gradient(135deg, #E17055, #C0392B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  📢
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                    <span style={{ fontWeight: c.letta ? 600 : 800, fontSize: '0.9rem', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.titolo}</span>
                    {!c.letta && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E17055', flexShrink: 0 }} />
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#999' }}>
                    {formatData(c.creato_at)}
                    {c.gruppi_nomi.length > 0 && ` · ${c.gruppi_nomi.join(', ')}`}
                  </p>
                </div>
                <span style={{ color: '#DDD', fontSize: '1.1rem' }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal lettura */}
      {aperta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setAperta(null)}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#333' }}>{aperta.titolo}</h2>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#999' }}>
                  {formatData(aperta.creato_at)} · {aperta.autore_nome}
                  {aperta.gruppi_nomi.length > 0 && ` · ${aperta.gruppi_nomi.join(', ')}`}
                </p>
              </div>
              <button onClick={() => setAperta(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#999', flexShrink: 0 }}>×</button>
            </div>

            <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: '#444', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{aperta.testo}</p>

            {aperta.allegato_url && (
              <a
                href={aperta.allegato_url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', background: '#FFF3EE', color: '#E17055', border: '1.5px solid #FFD4B3', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', marginBottom: '1rem' }}
              >
                📎 Scarica allegato
              </a>
            )}

            <button onClick={() => setAperta(null)}
              style={{ width: '100%', padding: '0.75rem', background: '#FFF3EE', color: '#E17055', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
