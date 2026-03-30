'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type Stato = 'non_fotografabile' | 'revocato' | 'completo' | 'parziale' | 'nessuno'

interface ConsensoRecord {
  id: number | null
  stato: Stato
  consenso_genitore1: boolean
  consenso_genitore2: boolean | null
  data_consenso_genitore1: string | null
  data_consenso_genitore2: string | null
  revocato: boolean
  data_revoca: string | null
  note: string
}

interface BambinoStato {
  id: number
  nome: string
  cognome: string
  non_fotografabile: boolean
  ha_famiglia: boolean
  has_genitore2: boolean
  consensi: {
    uso_interno: ConsensoRecord
    genitori_diretti: ConsensoRecord
    newsletter_scolastica: ConsensoRecord
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FINALITA = [
  { key: 'uso_interno', label: 'Uso interno', desc: 'Foto visibili solo allo staff della scuola.' },
  { key: 'genitori_diretti', label: 'Genitori', desc: 'Foto condivise con i genitori del bambino.' },
  { key: 'newsletter_scolastica', label: 'Newsletter', desc: 'Foto usate nelle comunicazioni ufficiali.' },
] as const

type FinalitaKey = 'uso_interno' | 'genitori_diretti' | 'newsletter_scolastica'

const SEMAFORO: Record<Stato, string> = {
  non_fotografabile: '⚫',
  revocato: '🔴',
  completo: '🟢',
  parziale: '🟡',
  nessuno: '🔴',
}

const STATO_LABEL: Record<Stato, string> = {
  non_fotografabile: 'Non fotografabile',
  revocato: 'Revocato',
  completo: 'Completo',
  parziale: 'Parziale',
  nessuno: 'Nessuno',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminConsensiPage() {
  const router = useRouter()
  const locale = useLocale()

  const [bambini, setBambini] = useState<BambinoStato[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<BambinoStato | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  // Filtro ricerca
  const [search, setSearch] = useState('')

  const fetchStato = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/consensi/stato')
      if (res.status === 401) { router.push(`/${locale}/login`); return }
      if (!res.ok) throw new Error()
      setBambini(await res.json())
    } catch {
      setError('Errore nel caricamento. Riprova.')
    } finally {
      setLoading(false)
    }
  }, [locale, router])

  useEffect(() => { fetchStato() }, [fetchStato])

  const refresh = async () => {
    await fetchStato()
    if (selected) {
      // Aggiorna i dati del bambino selezionato
      const res = await fetch('/api/consensi/stato')
      if (res.ok) {
        const all: BambinoStato[] = await res.json()
        const updated = all.find(b => b.id === selected.id)
        if (updated) setSelected(updated)
      }
    }
  }

  // ── Azioni admin ───────────────────────────────────────────────────────────

  const toggleNonFotografabile = async (bambino: BambinoStato) => {
    setActionLoading(true); setActionError('')
    try {
      const res = await fetch(`/api/bambini/${bambino.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ non_fotografabile: !bambino.non_fotografabile }),
      })
      if (!res.ok) { setActionError('Errore durante il salvataggio.'); return }
      await refresh()
    } finally { setActionLoading(false) }
  }

  const creaConsenso = async (bambinoId: number, finalita: string) => {
    setActionLoading(true); setActionError('')
    try {
      const res = await fetch('/api/consensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bambino: bambinoId, finalita }),
      })
      if (!res.ok) {
        const data = await res.json()
        setActionError(Object.values(data).flat().join(' '))
        return
      }
      await refresh()
    } finally { setActionLoading(false) }
  }

  const toggleConsensoGenitore = async (consensoId: number, campo: 'consenso_genitore1' | 'consenso_genitore2', valore: boolean) => {
    setActionLoading(true); setActionError('')
    try {
      const res = await fetch(`/api/consensi/${consensoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [campo]: valore }),
      })
      if (!res.ok) { setActionError('Errore durante il salvataggio.'); return }
      await refresh()
    } finally { setActionLoading(false) }
  }

  const revocaSingolo = async (consensoId: number) => {
    if (!confirm('Revocare questo consenso?')) return
    setActionLoading(true); setActionError('')
    try {
      const res = await fetch(`/api/consensi/${consensoId}/revoca-consenso`, { method: 'POST' })
      if (!res.ok) { setActionError('Errore durante la revoca.'); return }
      await refresh()
    } finally { setActionLoading(false) }
  }

  const revocaTutti = async (bambinoId: number) => {
    if (!confirm('Revocare TUTTI i consensi per questo bambino? Questa azione è irreversibile.')) return
    setActionLoading(true); setActionError('')
    try {
      const res = await fetch('/api/consensi/revoca-tutti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bambino: bambinoId }),
      })
      if (!res.ok) { setActionError('Errore durante la revoca.'); return }
      await refresh()
    } finally { setActionLoading(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const filtered = bambini.filter(b =>
    `${b.nome} ${b.cognome}`.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#FFF8F4' }}>
        <p style={{ color: '#E8562A', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F4' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #FF9A3C 0%, #E8562A 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <button onClick={() => router.push(`/${locale}/dashboard/admin`)} style={backBtn}>← Dashboard</button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>📷 Consensi Fotografici</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            {bambini.length} bambini · gestione consensi GDPR
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Legenda */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.825rem' }}>
          {Object.entries(SEMAFORO).filter(([k]) => k !== 'revocato').map(([k, emoji]) => (
            <span key={k}>{emoji} {STATO_LABEL[k as Stato]}</span>
          ))}
          <span>🔴 Revocato / Nessuno</span>
        </div>

        {/* Ricerca */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <input
            type="search" placeholder="🔍 Cerca bambino..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 0.875rem', border: '2px solid #FFD4B3', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {error && <div style={errorBox}>{error}</div>}

        {/* Tabella bambini */}
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {/* Header colonne */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 80px) 100px', gap: '0.5rem', padding: '0.75rem 1.25rem', background: '#FFF3EE', borderBottom: '1px solid #FFE0CC', fontSize: '0.775rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>
            <span>Bambino</span>
            {FINALITA.map(f => <span key={f.key} style={{ textAlign: 'center' }}>{f.label}</span>)}
            <span></span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
              <p style={{ margin: 0 }}>Nessun bambino trovato.</p>
            </div>
          ) : filtered.map((b, i) => (
            <div key={b.id} style={{
              display: 'grid', gridTemplateColumns: '1fr repeat(3, 80px) 100px',
              gap: '0.5rem', padding: '0.875rem 1.25rem', alignItems: 'center',
              borderBottom: i < filtered.length - 1 ? '1px solid #FFF0E8' : 'none',
              background: b.non_fotografabile ? '#F9F9F9' : 'white',
            }}>
              <div>
                <span style={{ fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>
                  {b.nome} {b.cognome}
                </span>
                {b.non_fotografabile && (
                  <span style={{ marginLeft: '0.5rem', background: '#333', color: 'white', padding: '1px 7px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700 }}>
                    ⚫ NON FOT.
                  </span>
                )}
              </div>
              {FINALITA.map(f => {
                const c = b.consensi[f.key]
                return (
                  <div key={f.key} style={{ textAlign: 'center', fontSize: '1.3rem' }} title={STATO_LABEL[c.stato]}>
                    {SEMAFORO[c.stato]}
                  </div>
                )
              })}
              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={() => { setSelected(b); setActionError('') }}
                  style={{ padding: '0.4rem 0.875rem', background: '#E8562A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Gestisci
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal dettaglio consensi bambino ────────────────────────────────── */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, color: '#E8562A', fontSize: '1.2rem', fontWeight: 800 }}>
                  📷 {selected.nome} {selected.cognome}
                </h2>
                {!selected.ha_famiglia && (
                  <p style={{ margin: '0.25rem 0 0', color: '#E67E22', fontSize: '0.8rem' }}>⚠️ Nessuna famiglia registrata</p>
                )}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#aaa' }}>×</button>
            </div>

            {/* Non fotografabile toggle */}
            <div style={{ background: selected.non_fotografabile ? '#333' : '#F8F9FA', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: selected.non_fotografabile ? 'white' : '#333', fontSize: '0.9rem' }}>
                  ⚫ Non fotografabile
                </p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.775rem', color: selected.non_fotografabile ? 'rgba(255,255,255,0.7)' : '#888' }}>
                  Blocca qualsiasi foto indipendentemente dai consensi
                </p>
              </div>
              <button
                onClick={() => toggleNonFotografabile(selected)}
                disabled={actionLoading}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.8rem',
                  background: selected.non_fotografabile ? '#FC5C65' : '#26DE81',
                  color: 'white',
                }}
              >
                {selected.non_fotografabile ? 'Riabilita' : 'Disabilita'}
              </button>
            </div>

            {/* Sezioni finalità */}
            {FINALITA.map(f => {
              const c = selected.consensi[f.key]
              return (
                <div key={f.key} style={{ borderRadius: '12px', border: '2px solid #FFE0CC', padding: '1rem', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#333', fontSize: '0.9rem' }}>
                        {SEMAFORO[c.stato]} {f.label}
                      </p>
                      <p style={{ margin: '0.1rem 0 0', color: '#aaa', fontSize: '0.775rem' }}>{f.desc}</p>
                    </div>
                    {c.id && !c.revocato && (
                      <button
                        onClick={() => revocaSingolo(c.id!)}
                        disabled={actionLoading}
                        style={{ padding: '0.375rem 0.75rem', background: 'none', border: '2px solid #FC5C65', color: '#FC5C65', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Revoca
                      </button>
                    )}
                  </div>

                  {c.revocato && (
                    <div style={{ background: '#FADBD8', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#C0392B' }}>
                      🔴 Revocato il {fmt(c.data_revoca)}
                    </div>
                  )}

                  {c.id === null ? (
                    <button
                      onClick={() => creaConsenso(selected.id, f.key)}
                      disabled={actionLoading}
                      style={{ padding: '0.5rem 1rem', background: '#FF9A3C', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      + Crea registro consenso
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {/* Genitore 1 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8F9FA', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555' }}>Genitore 1</span>
                          {c.data_consenso_genitore1 && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: '#aaa' }}>{fmt(c.data_consenso_genitore1)}</span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleConsensoGenitore(c.id!, 'consenso_genitore1', !c.consenso_genitore1)}
                          disabled={actionLoading || c.revocato}
                          style={toggleBtn(c.consenso_genitore1)}
                        >
                          {c.consenso_genitore1 ? '✓ Dato' : '○ Non dato'}
                        </button>
                      </div>

                      {/* Genitore 2 */}
                      {selected.has_genitore2 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8F9FA', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555' }}>Genitore 2</span>
                            {c.data_consenso_genitore2 && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: '#aaa' }}>{fmt(c.data_consenso_genitore2)}</span>
                            )}
                          </div>
                          <button
                            onClick={() => toggleConsensoGenitore(c.id!, 'consenso_genitore2', !c.consenso_genitore2)}
                            disabled={actionLoading || c.revocato}
                            style={toggleBtn(!!c.consenso_genitore2)}
                          >
                            {c.consenso_genitore2 ? '✓ Dato' : '○ Non dato'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {actionError && <div style={{ ...errorBox, marginTop: '0.5rem' }}>{actionError}</div>}

            {/* Revoca tutti */}
            <div style={{ borderTop: '2px solid #FFE0CC', paddingTop: '1.25rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Export PDF riepilogo</p>
                <button style={{ padding: '0.4rem 0.875rem', border: '2px solid #FFD4B3', borderRadius: '8px', background: 'white', color: '#888', fontSize: '0.775rem', cursor: 'not-allowed', fontFamily: 'inherit' }} disabled>
                  📄 Scarica PDF (prossimamente)
                </button>
              </div>
              <button
                onClick={() => revocaTutti(selected.id)}
                disabled={actionLoading}
                style={{ padding: '0.625rem 1.25rem', background: '#C0392B', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                🔴 Revoca tutti i consensi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const backBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)',
  cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.5rem', fontFamily: 'inherit',
}

const errorBox: React.CSSProperties = {
  background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem',
  borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem',
}

function toggleBtn(active: boolean): React.CSSProperties {
  return {
    padding: '0.375rem 0.875rem',
    background: active ? '#27AE60' : 'white',
    color: active ? 'white' : '#888',
    border: `2px solid ${active ? '#27AE60' : '#DDD'}`,
    borderRadius: '8px', fontSize: '0.775rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
