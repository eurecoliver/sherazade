'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Gruppo {
  id: number
  nome: string
  colore: string
}

interface Sessione {
  id: number
  titolo: string
  descrizione: string
  data: string
  ora_inizio: string
  ora_fine: string
  durata_slot: number
  aperto: boolean
  gruppi: Gruppo[]
  creato_da_nome: string | null
  num_slot: number
  num_prenotati: number
  creato_at: string
}

interface Slot {
  index: number
  ora_inizio: string
  ora_fine: string
  disponibile: boolean
  prenotazione_id?: number
  genitore_nome?: string
  bambino_nome?: string
  note_genitore?: string
}

interface Me {
  id: number
  role: string
  first_name: string
  last_name: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MANAGER_ROLES = ['admin', 'direttrice', 'coordinatrice']

function fmtData(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtDataShort(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function localIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoToday(): string { return localIso(new Date()) }

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + (m || 0) + minutes
  const hOut = Math.floor(total / 60) % 24
  const mOut = total % 60
  return `${String(hOut).padStart(2, '0')}:${String(mOut).padStart(2, '0')}`
}

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ColloquiStaffPage() {
  const router = useRouter()
  const locale = useLocale()

  const [me, setMe] = useState<Me | null>(null)
  const [gruppi, setGruppi] = useState<Gruppo[]>([])
  const [sessioni, setSessioni] = useState<Sessione[]>([])
  const [loading, setLoading] = useState(true)

  // Vista
  const [mostraPassate, setMostraPassate] = useState(false)

  // Dettaglio sessione con slot
  const [sessioneAperta, setSessioneAperta] = useState<Sessione | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Modal crea/modifica sessione
  const [showForm, setShowForm] = useState(false)
  const [editingSessione, setEditingSessione] = useState<Sessione | null>(null)
  const [formData, setFormData] = useState({
    titolo: '',
    descrizione: '',
    data: isoToday(),
    ora_inizio: '09:00',
    numero_slot: 9,
    durata_slot: 20,
    aperto: true,
    gruppi_ids: [] as number[],
  })
  const [saving, setSaving] = useState(false)
  const [savingToggle, setSavingToggle] = useState<number | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/config/gruppi').then(r => r.ok ? r.json() : []),
    ])
      .then(([meData, gruppiData]) => {
        setMe(meData)
        const list = Array.isArray(gruppiData) ? gruppiData : (gruppiData.results ?? [])
        setGruppi(list)
      })
      .catch(() => router.push(`/${locale}/login`))
  }, [locale, router])

  const fetchSessioni = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/colloqui/sessioni')
      if (res.ok) {
        const d = await res.json()
        setSessioni(Array.isArray(d) ? d : (d.results ?? []))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessioni() }, [fetchSessioni])

  const apriSlots = async (sessione: Sessione) => {
    setSessioneAperta(sessione)
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/colloqui/sessioni/${sessione.id}/slots`)
      if (res.ok) {
        const d = await res.json()
        setSlots(Array.isArray(d) ? d : [])
      }
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleToggleAperto = async (sessione: Sessione) => {
    setSavingToggle(sessione.id)
    try {
      const res = await fetch(`/api/colloqui/sessioni/${sessione.id}/toggle-aperto`, { method: 'PATCH' })
      if (res.ok) {
        const updated: Sessione = await res.json()
        setSessioni(prev => prev.map(s => s.id === updated.id ? updated : s))
        if (sessioneAperta?.id === updated.id) setSessioneAperta(updated)
      }
    } finally {
      setSavingToggle(null)
    }
  }

  const openCrea = () => {
    setEditingSessione(null)
    setFormData({
      titolo: '',
      descrizione: '',
      data: isoToday(),
      ora_inizio: '09:00',
      numero_slot: 9,
      durata_slot: 20,
      aperto: true,
      gruppi_ids: [],
    })
    setShowForm(true)
  }

  const openEdit = (s: Sessione) => {
    setEditingSessione(s)
    const iniMin = toMinutes(s.ora_inizio.slice(0, 5))
    const fineMin = toMinutes(s.ora_fine.slice(0, 5))
    const nSlot = s.durata_slot > 0 ? Math.max(1, Math.round((fineMin - iniMin) / s.durata_slot)) : 9
    setFormData({
      titolo: s.titolo,
      descrizione: s.descrizione,
      data: s.data,
      ora_inizio: s.ora_inizio.slice(0, 5),
      numero_slot: nSlot,
      durata_slot: s.durata_slot,
      aperto: s.aperto,
      gruppi_ids: s.gruppi.map(g => g.id),
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.titolo.trim() || !formData.data) return
    if (formData.numero_slot < 1) return
    const oraFineCalcolata = addMinutes(formData.ora_inizio, formData.numero_slot * formData.durata_slot)
    setSaving(true)
    try {
      const body = {
        titolo: formData.titolo.trim(),
        descrizione: formData.descrizione.trim(),
        data: formData.data,
        ora_inizio: formData.ora_inizio,
        ora_fine: oraFineCalcolata,
        durata_slot: formData.durata_slot,
        aperto: formData.aperto,
        gruppi_ids: formData.gruppi_ids,
      }
      const url = editingSessione
        ? `/api/colloqui/sessioni/${editingSessione.id}`
        : '/api/colloqui/sessioni'
      const method = editingSessione ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setShowForm(false)
        fetchSessioni()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (sessione: Sessione) => {
    if (!confirm(`Eliminare la sessione "${sessione.titolo}"? Verranno eliminate anche tutte le prenotazioni.`)) return
    const res = await fetch(`/api/colloqui/sessioni/${sessione.id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setSessioni(prev => prev.filter(s => s.id !== sessione.id))
      if (sessioneAperta?.id === sessione.id) setSessioneAperta(null)
    }
  }

  const backDashboard = () => {
    const role = me?.role
    if (MANAGER_ROLES.includes(role ?? '')) {
      router.push(`/${locale}/dashboard/admin`)
    } else {
      router.push(`/${locale}/dashboard/staff`)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  if (!me) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#EAF4FF' }}>
        <p style={{ color: '#0984E3', fontWeight: 600 }}>Caricamento…</p>
      </div>
    )
  }

  const oggi = isoToday()
  const canManage = MANAGER_ROLES.includes(me.role)
  const sessioniFuture = sessioni.filter(s => s.data >= oggi)
  const sessioniPassate = sessioni.filter(s => s.data < oggi)
  const sessioniMostrate = mostraPassate ? [...sessioniFuture, ...sessioniPassate] : sessioniFuture

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#EAF4FF' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #0984E3 0%, #0652DD 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(900px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button
              onClick={backDashboard}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', fontWeight: 800 }}>
                🗓️ Colloqui genitori
              </h1>
              <p style={{ margin: '0.2rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
                Gestisci le sessioni di colloquio con le famiglie
              </p>
            </div>
            {canManage && (
              <button
                onClick={openCrea}
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '12px', padding: '0.6rem 1.25rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem' }}
              >
                + Nuova sessione
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 'min(900px, 96vw)', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

        {/* ── Sessione aperta (vista slot) ─────────────────────────────────── */}
        {sessioneAperta && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(9,132,227,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1A202C' }}>
                  {sessioneAperta.titolo}
                </h2>
                <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                  {fmtData(sessioneAperta.data)} · {sessioneAperta.ora_inizio.slice(0,5)}–{sessioneAperta.ora_fine.slice(0,5)} · {sessioneAperta.durata_slot} min/slot
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, background: sessioneAperta.aperto ? '#D1FAE5' : '#FEE2E2', color: sessioneAperta.aperto ? '#065F46' : '#B91C1C' }}>
                  {sessioneAperta.aperto ? '🟢 Aperto' : '🔴 Chiuso'}
                </span>
                {canManage && (
                  <button
                    onClick={() => handleToggleAperto(sessioneAperta)}
                    disabled={savingToggle === sessioneAperta.id}
                    style={{ padding: '0.3rem 0.75rem', borderRadius: '12px', border: '1.5px solid #CBD5E0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, color: '#4A5568' }}
                  >
                    {savingToggle === sessioneAperta.id ? '…' : sessioneAperta.aperto ? 'Chiudi' : 'Apri'}
                  </button>
                )}
                {canManage && (
                  <button
                    onClick={() => openEdit(sessioneAperta)}
                    style={{ padding: '0.3rem 0.75rem', borderRadius: '12px', border: '1.5px solid #BDE0FF', background: '#EAF4FF', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, color: '#0984E3' }}
                  >
                    ✏️ Modifica
                  </button>
                )}
                <button
                  onClick={() => setSessioneAperta(null)}
                  style={{ padding: '0.3rem 0.75rem', borderRadius: '12px', border: '1.5px solid #E2E8F0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, color: '#666' }}
                >
                  ✕ Chiudi
                </button>
              </div>
            </div>

            {sessioneAperta.descrizione && (
              <p style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.875rem', padding: '0.75rem', background: '#F7FAFC', borderRadius: '10px' }}>
                {sessioneAperta.descrizione}
              </p>
            )}

            {/* Gruppi */}
            {sessioneAperta.gruppi.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {sessioneAperta.gruppi.map(g => (
                  <span key={g.id} style={{ padding: '0.25rem 0.625rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: g.colore + '25', color: g.colore, border: `1.5px solid ${g.colore}50` }}>
                    {g.nome}
                  </span>
                ))}
              </div>
            )}

            {/* Griglia slot */}
            <div style={{ borderTop: '1.5px solid #EDF2F7', paddingTop: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#718096' }}>
                SLOT — {sessioneAperta.num_prenotati}/{sessioneAperta.num_slot} prenotati
              </p>
              {loadingSlots ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '1rem' }}>Caricamento…</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))', gap: '0.5rem' }}>
                  {slots.map(slot => (
                    <div
                      key={slot.index}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '12px',
                        border: `2px solid ${slot.disponibile ? '#BDE0FF' : '#FED7D7'}`,
                        background: slot.disponibile ? '#EAF4FF' : '#FFF5F5',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: slot.disponibile ? '#0984E3' : '#E53E3E' }}>
                        {slot.ora_inizio} – {slot.ora_fine}
                      </div>
                      {slot.disponibile ? (
                        <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.25rem' }}>Libero</div>
                      ) : (
                        <div style={{ marginTop: '0.25rem' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#C53030' }}>{slot.genitore_nome}</div>
                          {slot.bambino_nome && (
                            <div style={{ fontSize: '0.78rem', color: '#666' }}>👶 {slot.bambino_nome}</div>
                          )}
                          {slot.note_genitore && (
                            <div style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', marginTop: '0.2rem' }}>"{slot.note_genitore}"</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {slots.length === 0 && (
                    <p style={{ color: '#999', gridColumn: '1 / -1', textAlign: 'center', padding: '1rem' }}>
                      Nessuno slot disponibile (verifica gli orari della sessione).
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Filtro passate ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#555' }}>
            {sessioniFuture.length} sessioni future{sessioniPassate.length > 0 ? `, ${sessioniPassate.length} passate` : ''}
          </p>
          {sessioniPassate.length > 0 && (
            <button
              onClick={() => setMostraPassate(prev => !prev)}
              style={{ padding: '0.3rem 0.75rem', borderRadius: '12px', border: '1.5px solid #CBD5E0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, color: '#555' }}
            >
              {mostraPassate ? 'Nascondi passate' : 'Mostra passate'}
            </button>
          )}
        </div>

        {/* ── Lista sessioni ───────────────────────────────────────────────── */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>Caricamento…</p>
        ) : sessioniMostrate.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', textAlign: 'center', color: '#999', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗓️</p>
            <p>Nessuna sessione di colloquio pianificata.</p>
            {canManage && (
              <button
                onClick={openCrea}
                style={{ marginTop: '0.75rem', padding: '0.6rem 1.5rem', background: '#0984E3', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem' }}
              >
                + Crea la prima sessione
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sessioniMostrate.map(s => {
              const isPassata = s.data < oggi
              return (
                <div
                  key={s.id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '1rem 1.25rem',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                    border: `2px solid ${sessioneAperta?.id === s.id ? '#0984E3' : 'transparent'}`,
                    opacity: isPassata ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A202C' }}>{s.titolo}</span>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: s.aperto ? '#D1FAE5' : '#FEE2E2', color: s.aperto ? '#065F46' : '#B91C1C' }}>
                          {s.aperto ? '🟢 Aperto' : '🔴 Chiuso'}
                        </span>
                        {isPassata && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: '#F7FAFC', color: '#718096' }}>Passata</span>}
                      </div>
                      <p style={{ margin: '0.2rem 0 0', color: '#666', fontSize: '0.82rem', textTransform: 'capitalize' }}>
                        📅 {fmtDataShort(s.data)} · {s.ora_inizio.slice(0,5)}–{s.ora_fine.slice(0,5)} · {s.durata_slot} min
                      </p>
                      <p style={{ margin: '0.2rem 0 0', color: '#888', fontSize: '0.8rem' }}>
                        👥 {s.num_prenotati}/{s.num_slot} slot prenotati
                        {s.gruppi.length > 0 && ` · ${s.gruppi.map(g => g.nome).join(', ')}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => sessioneAperta?.id === s.id ? setSessioneAperta(null) : apriSlots(s)}
                        style={{ padding: '0.4rem 0.875rem', borderRadius: '12px', border: '1.5px solid #BDE0FF', background: sessioneAperta?.id === s.id ? '#0984E3' : '#EAF4FF', color: sessioneAperta?.id === s.id ? 'white' : '#0984E3', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600 }}
                      >
                        {sessioneAperta?.id === s.id ? '✕ Chiudi' : '👁️ Slot'}
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleToggleAperto(s)}
                            disabled={savingToggle === s.id}
                            style={{ padding: '0.4rem 0.875rem', borderRadius: '12px', border: '1.5px solid #CBD5E0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, color: '#4A5568' }}
                          >
                            {savingToggle === s.id ? '…' : s.aperto ? '🔒 Chiudi' : '🔓 Apri'}
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            style={{ padding: '0.4rem 0.875rem', borderRadius: '12px', border: '1.5px solid #FED7AA', background: '#FFF7ED', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, color: '#C05621' }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            style={{ padding: '0.4rem 0.875rem', borderRadius: '12px', border: '1.5px solid #FED7D7', background: '#FFF5F5', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, color: '#E53E3E' }}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal crea/modifica sessione ──────────────────────────────────────── */}
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.15rem', fontWeight: 700, color: '#1A202C' }}>
              {editingSessione ? '✏️ Modifica sessione' : '+ Nuova sessione colloqui'}
            </h2>

            <label style={labelStyle}>Titolo *</label>
            <input
              value={formData.titolo}
              onChange={e => setFormData(p => ({ ...p, titolo: e.target.value }))}
              placeholder="Es. Colloqui novembre 2026"
              style={inputStyle}
            />

            <label style={labelStyle}>Descrizione (opzionale)</label>
            <textarea
              value={formData.descrizione}
              onChange={e => setFormData(p => ({ ...p, descrizione: e.target.value }))}
              placeholder="Note aggiuntive per i genitori…"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Data *</label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={e => setFormData(p => ({ ...p, data: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Durata slot (minuti)</label>
                <input
                  type="number"
                  value={formData.durata_slot}
                  min={5}
                  max={120}
                  step={5}
                  onChange={e => setFormData(p => ({ ...p, durata_slot: parseInt(e.target.value) || 20 }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Ora inizio</label>
                <input
                  type="time"
                  value={formData.ora_inizio}
                  onChange={e => setFormData(p => ({ ...p, ora_inizio: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Numero di slot</label>
                <input
                  type="number"
                  value={formData.numero_slot}
                  min={1}
                  max={50}
                  onChange={e => setFormData(p => ({ ...p, numero_slot: parseInt(e.target.value) || 1 }))}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Preview automatico */}
            {formData.ora_inizio && formData.numero_slot > 0 && formData.durata_slot > 0 && (() => {
              const oraFine = addMinutes(formData.ora_inizio, formData.numero_slot * formData.durata_slot)
              return (
                <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.82rem', color: '#0984E3', fontWeight: 600 }}>
                  → {formData.numero_slot} slot da {formData.durata_slot} min · dalle {formData.ora_inizio} alle {oraFine}
                </p>
              )
            })()}

            <label style={labelStyle}>Gruppi (lascia vuoto = tutti)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {gruppi.map(g => {
                const sel = formData.gruppi_ids.includes(g.id)
                return (
                  <button
                    key={g.id}
                    onClick={() => setFormData(p => ({
                      ...p,
                      gruppi_ids: sel ? p.gruppi_ids.filter(id => id !== g.id) : [...p.gruppi_ids, g.id],
                    }))}
                    style={{
                      padding: '0.35rem 0.875rem',
                      borderRadius: '20px',
                      border: `2px solid ${sel ? g.colore : '#CBD5E0'}`,
                      background: sel ? g.colore : 'white',
                      color: sel ? 'white' : '#555',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                    }}
                  >
                    {g.nome}
                  </button>
                )
              })}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>
              <input
                type="checkbox"
                checked={formData.aperto}
                onChange={e => setFormData(p => ({ ...p, aperto: e.target.checked }))}
              />
              Aperto alle prenotazioni dei genitori
            </label>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', border: '1.5px solid #CBD5E0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, color: '#555' }}
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.titolo.trim() || !formData.data}
                style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', border: 'none', background: saving ? '#93C5FD' : '#0984E3', color: 'white', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem' }}
              >
                {saving ? 'Salvataggio…' : editingSessione ? 'Salva modifiche' : 'Crea sessione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stili ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#4A5568',
  marginBottom: '0.3rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.875rem',
  borderRadius: '10px',
  border: '1.5px solid #CBD5E0',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  marginBottom: '0.75rem',
  boxSizing: 'border-box',
  outline: 'none',
}
