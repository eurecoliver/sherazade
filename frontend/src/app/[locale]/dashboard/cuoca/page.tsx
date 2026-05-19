'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
}

// ── Design tokens ─────────────────────────────────────────────────────────
const A       = '#EA580C'      // orange-600
const A_DARK  = '#C2410C'      // orange-700
const A_LIGHT = '#FFF7ED'      // orange-50
const BG      = '#F2F2F7'
const CARD    = '#FFFFFF'
const T1      = '#1C1C1E'
const T2      = '#6B7280'
const TSEC    = '#8E8E93'
const SEP     = '#F4F4F8'

export default function CuocaDashboard() {
  const router = useRouter()
  const locale = useLocale()
  const [user, setUser] = useState<User | null>(null)
  const [presentiOggi, setPresentiOggi] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/presenze/presenti-oggi').then(r => r.ok ? r.json() : null),
    ])
      .then(([me, presenze]) => {
        setUser(me)
        if (presenze) setPresentiOggi(presenze.presenti)
      })
      .catch(() => router.push(`/${locale}/login`))
  }, [locale, router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: BG }}>
        <p style={{ color: A, fontWeight: 600 }}>Caricamento…</p>
      </div>
    )
  }

  const dateStr = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ minHeight: '100vh', background: BG }}>

      {/* ── Sticky frosted header ──────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(242,242,247,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        padding: '0.625rem 1.25rem',
      }}>
        <div style={{ maxWidth: 'min(720px, 96vw)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: A_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              🏫
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: T1 }}>Sherazade</span>
          </div>
          <UserChip onLogout={handleLogout} />
        </div>
      </header>

      <div style={{ maxWidth: 'min(720px, 96vw)', margin: '0 auto', padding: '1.25rem 1rem 4rem' }}>

        {/* ── Greeting card ─────────────────────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${A} 0%, ${A_DARK} 100%)`,
          borderRadius: 20, padding: '1.5rem 1.5rem 1.75rem', color: 'white',
          marginBottom: '1.75rem', position: 'relative', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(234,88,12,0.28)',
        }}>
          <div style={{ position: 'absolute', right: -24, top: -24, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 32, bottom: -38, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <p style={{ margin: '0 0 0.3rem', fontSize: '0.7rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.12em', position: 'relative' }}>
            Area Cucina
          </p>
          <h1 style={{ margin: '0 0 0.4rem', fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.02em', position: 'relative' }}>
            Ciao, {user.first_name || user.email.split('@')[0]}! 👋
          </h1>
          <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.68, position: 'relative' }}>
            {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
          </p>
        </div>

        {/* ── Section label ─────────────────────────────────────────────────── */}
        <p style={{ margin: '0 0 0.4rem 0.375rem', fontSize: '0.7rem', fontWeight: 700, color: TSEC, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Oggi in cucina
        </p>

        {/* ── Grouped card: counter + CTA ───────────────────────────────────── */}
        <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

          {/* Presenti oggi row */}
          <div style={{ padding: '1.1rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: `1px solid ${SEP}` }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: A_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
              🧒
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bambini presenti oggi
              </p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '2rem', fontWeight: 800, color: A, lineHeight: 1 }}>
                {presentiOggi !== null ? presentiOggi : '—'}
              </p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.73rem', color: T2 }}>
                {presentiOggi !== null ? 'calibra le porzioni di conseguenza' : 'caricamento in corso…'}
              </p>
            </div>
          </div>

          {/* Pappe del giorno button */}
          <button
            onClick={() => router.push(`/${locale}/dashboard/cuoca/pappe`)}
            style={{
              width: '100%', background: 'none', border: 'none',
              padding: '0.85rem 1rem',
              display: 'flex', alignItems: 'center', gap: '0.875rem',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FAFAFA' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 11, background: A_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              🍽️
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: T1 }}>Pappe del giorno</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: T2, marginTop: '0.1rem' }}>Menu, allergie e registro pasti</p>
            </div>
            <span style={{ color: '#C7C7CC', fontSize: '1.2rem', fontWeight: 400, flexShrink: 0, lineHeight: 1 }}>›</span>
          </button>

        </div>

      </div>
    </div>
  )
}
