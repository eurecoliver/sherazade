'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BambinoLive {
  id: number
  nome: string
  cognome: string
  stato: 'presente' | 'uscito' | 'assente' | 'non_registrato'
  ora_arrivo: string | null
  ora_uscita: string | null
  via_qr: boolean
}

interface GruppoLive {
  gruppo_id: number
  gruppo_nome: string
  gruppo_colore: string
  bambini: BambinoLive[]
}

interface InsegnanteLive {
  id: number
  nome: string
  cognome: string
  ruolo: string
  presente: boolean
  ora_entrata: string | null
  ora_uscita: string | null
  via_qr: boolean
}

interface LiveData {
  data: string
  aggiornato_at: string
  totali: {
    presenti: number
    assenti: number
    non_registrati: number
    totale: number
  }
  gruppi: GruppoLive[]
  insegnanti: InsegnanteLive[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 30_000 // 30 secondi

const STATO_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  presente:        { label: 'Presente',        bg: '#D5F5E3', text: '#1E8449', dot: '#27AE60' },
  uscito:          { label: 'Uscito',           bg: '#EAF4FF', text: '#1A5276', dot: '#2E86C1' },
  assente:         { label: 'Assente',          bg: '#FADBD8', text: '#922B21', dot: '#E74C3C' },
  non_registrato:  { label: 'Non registrato',   bg: '#F2F3F4', text: '#7F8C8D', dot: '#BDC3C7' },
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── BambinoPill ─────────────────────────────────────────────────────────────

function BambinoPill({ b }: { b: BambinoLive }) {
  const cfg = STATO_CONFIG[b.stato]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      background: cfg.bg, borderRadius: '10px',
      padding: '0.5rem 0.75rem', minWidth: 0,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, color: '#222', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {b.nome} {b.cognome}
        </p>
        <p style={{ margin: 0, fontSize: '0.72rem', color: cfg.text, fontWeight: 600 }}>
          {cfg.label}
          {b.ora_arrivo && ` · ${b.ora_arrivo}`}
          {b.ora_uscita && ` → ${b.ora_uscita}`}
          {b.via_qr && ' 📱'}
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BachecaPresenzePage() {
  const router = useRouter()
  const locale = useLocale()
  const [data, setData] = useState<LiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000)
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d?.role) setUserRole(d.role) }).catch(() => {})
  }, [])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/presenze/live-oggi', { cache: 'no-store' })
      if (res.status === 401) { router.push(`/${locale}/login`); return }
      if (res.ok) setData(await res.json())
    } catch { /* silenzioso */ }
    finally { setLoading(false) }
  }, [locale, router])

  const resetCountdown = useCallback(() => {
    setCountdown(REFRESH_INTERVAL / 1000)
    if (countRef.current) clearInterval(countRef.current)
    countRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
  }, [])

  useEffect(() => {
    fetchLive()
    resetCountdown()
    intervalRef.current = setInterval(() => {
      fetchLive()
      resetCountdown()
    }, REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [fetchLive, resetCountdown])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  // Determina il ruolo per il back button
  const getRoleDashboard = () => ['admin', 'direttrice'].includes(userRole) ? `/${locale}/dashboard/admin` : `/${locale}/dashboard/staff`

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2D3436 0%, #636E72 100%)',
        padding: '1rem 1.5rem', color: 'white',
      }}>
        <div style={{ maxWidth: 'min(1400px, 98vw)', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => router.push(getRoleDashboard())}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.3rem 0.875rem 0.3rem 0.625rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              ← Dashboard
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 800 }}>
                📺 Bacheca Presenze Live
              </h1>
              {data && (
                <p style={{ margin: 0, opacity: 0.8, fontSize: '0.8rem' }}>
                  {fmtData(data.data)}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Countdown refresh */}
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>
              🔄 {countdown}s
            </div>
            <button
              onClick={() => { fetchLive(); resetCountdown() }}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '10px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
            >
              ↻ Aggiorna
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#636E72', fontWeight: 600 }}>Caricamento...</div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#aaa' }}>Errore nel caricamento dei dati.</div>
      ) : (
        <div style={{ maxWidth: 'min(1400px, 98vw)', margin: '0 auto', padding: '1.25rem 1rem' }}>

          {/* Totali */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Presenti', value: data.totali.presenti, color: '#27AE60', bg: '#D5F5E3' },
              { label: 'Usciti', value: data.gruppi.flatMap(g => g.bambini).filter(b => b.stato === 'uscito').length, color: '#2E86C1', bg: '#EAF4FF' },
              { label: 'Assenti', value: data.totali.assenti, color: '#E74C3C', bg: '#FADBD8' },
              { label: 'Non registrati', value: data.totali.non_registrati, color: '#7F8C8D', bg: '#F2F3F4' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color }}>{value}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color, fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Gruppi bambini */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {data.gruppi.map(gruppo => {
              const presenti = gruppo.bambini.filter(b => b.stato === 'presente' || b.stato === 'uscito').length
              return (
                <div key={gruppo.gruppo_id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {/* Header gruppo */}
                  <div style={{ background: gruppo.gruppo_colore, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 800 }}>
                      {gruppo.gruppo_nome}
                    </h2>
                    <span style={{ background: 'rgba(255,255,255,0.25)', color: 'white', borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
                      {presenti}/{gruppo.bambini.length}
                    </span>
                  </div>
                  {/* Lista bambini */}
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {gruppo.bambini.length === 0 ? (
                      <p style={{ margin: 0, color: '#aaa', fontSize: '0.8rem', textAlign: 'center', padding: '0.5rem' }}>Nessun bambino</p>
                    ) : (
                      gruppo.bambini.map(b => <BambinoPill key={b.id} b={b} />)
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Insegnanti */}
          {data.insegnanti.length > 0 && (
            <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '1rem' }}>
              <div style={{ background: '#2D3436', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 800 }}>👩‍🏫 Staff</h2>
                <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
                  {data.insegnanti.filter(i => i.presente && i.ora_entrata).length}/{data.insegnanti.length}
                </span>
              </div>
              <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.375rem' }}>
                {data.insegnanti.map(ins => {
                  const statoIns = !ins.presente ? 'assente' : ins.ora_uscita ? 'uscito' : ins.ora_entrata ? 'presente' : 'non_registrato'
                  const cfg = STATO_CONFIG[statoIns]
                  return (
                    <div key={ins.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: cfg.bg, borderRadius: '10px', padding: '0.5rem 0.75rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#222', fontSize: '0.875rem' }}>
                          {ins.nome} {ins.cognome}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: cfg.text, fontWeight: 600 }}>
                          {cfg.label}
                          {ins.ora_entrata && ` · ${ins.ora_entrata}`}
                          {ins.ora_uscita && ` → ${ins.ora_uscita}`}
                          {ins.via_qr && ' 📱'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Legenda */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#888', padding: '0.5rem 0' }}>
            <span>📱 = registrato via QR</span>
            <span>· HH:MM = ora arrivo</span>
            <span>→ HH:MM = ora uscita</span>
            <span>🔄 aggiornamento automatico ogni 30 secondi</span>
          </div>
        </div>
      )}
    </div>
  )
}
