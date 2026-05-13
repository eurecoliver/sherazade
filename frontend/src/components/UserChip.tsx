'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'

interface MeData {
  first_name: string
  last_name: string
  role: string
  email: string
}

// Cache a livello di modulo: una sola fetch per tutta la sessione
let _cache: MeData | null = null
let _promise: Promise<MeData | null> | null = null

/** Da chiamare in ogni handler logout prima del redirect. */
export function clearUserCache() {
  _cache = null
  _promise = null
}

function getMe(): Promise<MeData | null> {
  if (_cache) return Promise.resolve(_cache)
  if (!_promise) {
    _promise = fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { _cache = d; return d })
      .catch(() => null)
  }
  return _promise
}

const ROLE_COLOR: Record<string, string> = {
  admin:         '#6C5CE7',
  direttrice:    '#9B59B6',
  coordinatrice: '#0984E3',
  insegnante:    '#0652DD',
  cuoca:         '#00B894',
  genitore:      '#E17055',
}

function getInitials(me: MeData): string {
  const f = me.first_name?.trim()
  const l = me.last_name?.trim()
  if (f && l) return (f[0] + l[0]).toUpperCase()
  if (f)      return f[0].toUpperCase()
  return me.role?.[0]?.toUpperCase() ?? '?'
}

export default function UserChip({ onLogout }: { onLogout: () => void }) {
  const locale = useLocale()
  const [me, setMe] = useState<MeData | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { getMe().then(setMe) }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!me) return null

  const color = ROLE_COLOR[me.role] ?? '#636E72'
  const displayName = me.first_name?.trim() || me.role
  const ini = getInitials(me)

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Chip */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(255,255,255,0.15)',
          border: '1.5px solid rgba(255,255,255,0.3)',
          borderRadius: '24px',
          padding: '0.25rem 0.7rem 0.25rem 0.25rem',
          cursor: 'pointer', color: 'white', fontFamily: 'inherit',
        }}
      >
        {/* Avatar con iniziali colorato per ruolo */}
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.68rem', fontWeight: 800, color, flexShrink: 0,
        }}>
          {ini}
        </div>
        <span style={{
          fontSize: '0.82rem', fontWeight: 600,
          maxWidth: '120px', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {displayName}
        </span>
        <span style={{ fontSize: '0.6rem', opacity: 0.65 }}>▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: 'white', borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          padding: '0.5rem', minWidth: '200px', zIndex: 200,
        }}>
          {/* Info utente */}
          <div style={{ padding: '0.5rem 0.75rem 0.75rem', borderBottom: '1px solid #F0EDF8' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: color, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem',
            }}>
              {ini}
            </div>
            <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.9rem', lineHeight: 1.3 }}>
              {me.first_name} {me.last_name}
            </div>
            <div style={{ color: '#999', fontSize: '0.75rem', marginTop: '0.15rem' }}>
              {me.email}
            </div>
          </div>

          {/* Sicurezza (2FA + password) */}
          <Link
            href={`/${locale}/dashboard/sicurezza`}
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              width: '100%', padding: '0.6rem 0.75rem',
              color: '#4A5568', fontWeight: 600, fontSize: '0.875rem',
              textDecoration: 'none', borderRadius: '8px',
              marginTop: '0.25rem',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#F7FAFC')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
          >
            🔐 Sicurezza
          </Link>

          {/* Cambia password */}
          <Link
            href={`/${locale}/dashboard/change-password`}
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              width: '100%', padding: '0.6rem 0.75rem',
              color: '#4A5568', fontWeight: 600, fontSize: '0.875rem',
              textDecoration: 'none', borderRadius: '8px',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#F7FAFC')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
          >
            🔑 Cambia password
          </Link>

          {/* Logout */}
          <button
            onClick={() => { _cache = null; _promise = null; setOpen(false); onLogout() }}
            style={{
              width: '100%', padding: '0.6rem 0.75rem',
              background: 'none', border: 'none', borderRadius: '8px',
              color: '#E53E3E', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              marginTop: '0.25rem',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#FFF5F5')}
            onMouseOut={e => (e.currentTarget.style.background = 'none')}
          >
            🚪 Esci dall&apos;account
          </button>
        </div>
      )}
    </div>
  )
}
