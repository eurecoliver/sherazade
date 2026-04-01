'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
}

interface Bambino {
  id: number
  nome: string
  cognome: string
  alias_nome: string
  alias_attivo: boolean
  foto_profilo: string | null
  gruppo_nome: string
  gruppo_colore: string
  eta: number
}

export default function GenitoreDashboard() {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const locale = useLocale()
  const [user, setUser] = useState<User | null>(null)
  const [bambini, setBambini] = useState<Bambino[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/bambini').then(r => r.ok ? r.json() : []),
    ])
      .then(([meData, bambiniData]) => {
        setUser(meData)
        const list = Array.isArray(bambiniData) ? bambiniData : (bambiniData.results ?? [])
        setBambini(list)
      })
      .catch(() => router.push(`/${locale}/login`))
  }, [locale, router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#FFF3EE' }}>
        <p style={{ color: '#E17055', fontWeight: 600 }}>{t('loading')}</p>
      </div>
    )
  }

  const roleLabel = t(`roles.${user.role}` as Parameters<typeof t>[0])

  return (
    <div style={{ minHeight: '100vh', background: '#FFF3EE', padding: '2rem 1rem' }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        boxShadow: '0 8px 30px rgba(225,112,85,0.12)',
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>👨‍👩‍👧</div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#E17055' }}>
            {t('genitoreTitle')}
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: '#888', fontSize: '0.9rem' }}>
            {roleLabel}
          </p>
        </div>

        <div style={{
          background: '#FFF3EE',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: bambini.length > 0 ? '1.25rem' : '2rem',
        }}>
          <p style={{ margin: 0, color: '#555' }}>
            {t('welcome')},{' '}
            <strong style={{ color: '#E17055' }}>
              {user.first_name || user.email}
            </strong>
          </p>
        </div>

        {/* Figli registrati con alias */}
        {bambini.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {bambini.length === 1 ? 'Tuo figlio' : 'I tuoi figli'}
            </p>
            {bambini.map(b => {
              const nomeMostrato = b.alias_attivo && b.alias_nome ? b.alias_nome : b.nome
              const colore = b.gruppo_colore || '#E17055'
              const ini = `${nomeMostrato.charAt(0)}${b.cognome.charAt(0)}`.toUpperCase()
              return (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.75rem', borderRadius: '12px',
                  background: '#FFF3EE', marginBottom: '0.5rem',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: colore,
                    overflow: 'hidden', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: '0.95rem',
                  }}>
                    {b.foto_profilo
                      ? <img src={b.foto_profilo} alt={ini} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : ini}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#333' }}>
                      {nomeMostrato} {b.cognome}
                    </p>
                    {b.gruppo_nome && (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>{b.gruppo_nome} · {b.eta} anni</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/genitore/consensi`)}
            style={{ padding: '0.75rem 1.25rem', background: '#FFF3EE', color: '#E17055', border: '2px solid #FFD4B3', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            📷 I miei consensi
          </button>
          <button
            onClick={() => router.push(`/${locale}/dashboard/genitore/diario`)}
            style={{ padding: '0.75rem 1.25rem', background: '#FFF3EE', color: '#E17055', border: '2px solid #FFD4B3', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            📖 Diario
          </button>
          <button
            onClick={() => router.push(`/${locale}/dashboard/genitore/pappe`)}
            style={{ padding: '0.75rem 1.25rem', background: '#FFF3EE', color: '#E17055', border: '2px solid #FFD4B3', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            🥣 Pappe
          </button>
          <button
            onClick={() => router.push(`/${locale}/dashboard/genitore/presenze`)}
            style={{ padding: '0.75rem 1.25rem', background: '#F0F4FF', color: '#6C63FF', border: '2px solid #C5BFFF', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            📅 Presenze
          </button>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#E17055',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {t('logout')}
        </button>
      </div>
    </div>
  )
}
