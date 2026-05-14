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
}

interface Slot {
  index: number
  ora_inizio: string
  ora_fine: string
  disponibile: boolean
  prenotazione_id?: number
  is_mine?: boolean
}

interface Bambino {
  id: number
  nome: string
  cognome: string
  alias_nome: string
  alias_attivo: boolean
}

interface Prenotazione {
  id: number
  sessione: number
  slot_index: number
  note_genitore: string
  disdetta: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtData(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function localIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoToday(): string { return localIso(new Date()) }

function nomeBambino(b: Bambino): string {
  if (b.alias_attivo && b.alias_nome) return `${b.alias_nome} ${b.cognome}`
  return `${b.nome} ${b.cognome}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ColloquiGenitore() {
  const router = useRouter()
  const locale = useLocale()

  const [bambini, setBambini] = useState<Bambino[]>([])
  const [bambinoCurrent, setBambinoCurrent] = useState<Bambino | null>(null)
  const [sessioni, setSessioni] = useState<Sessione[]>([])
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([])
  const [loading, setLoading] = useState(true)

  // Dettaglio sessione con slot
  const [sessioneAperta, setSessioneAperta] = useState<Sessione | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Prenotazione in corso
  const [slotSelezionato, setSlotSelezionato] = useState<Slot | null>(null)
  const [noteGenitore, setNoteGenitore] = useState('')
  const [saving, setSaving] = useState(false)
  const [disdettaId, setDisdettaId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/bambini').then(r => r.ok ? r.json() : []),
    ])
      .then(([_me, bambiniData]) => {
        const list: Bambino[] = Array.isArray(bambiniData) ? bambiniData : (bambiniData.results ?? [])
        setBambini(list)
        if (list.length > 0) setBambinoCurrent(list[0])
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

  const fetchPrenotazioni = useCallback(async () => {
    try {
      const res = await fetch('/api/colloqui/prenotazioni')
      if (res.ok) {
        const d = await res.json()
        setPrenotazioni(Array.isArray(d) ? d : (d.results ?? []))
      }
    } catch {
      // silenzioso
    }
  }, [])

  useEffect(() => {
    fetchSessioni()
    fetchPrenotazioni()
  }, [fetchSessioni, fetchPrenotazioni])

  const apriSlots = async (sessione: Sessione) => {
    if (sessioneAperta?.id === sessione.id) {
      setSessioneAperta(null)
      setSlotSelezionato(null)
      return
    }
    setSessioneAperta(sessione)
    setSlotSelezionato(null)
    setNoteGenitore('')
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

  const handlePrenota = async () => {
    if (!slotSelezionato || !sessioneAperta) return
    setSaving(true)
    setFeedback(null)
    try {
      const body: Record<string, unknown> = {
        sessione: sessioneAperta.id,
        slot_index: slotSelezionato.index,
        note_genitore: noteGenitore.trim(),
      }
      if (bambinoCurrent) body.bambino = bambinoCurrent.id
      const res = await fetch('/api/colloqui/prenotazioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setFeedback({ tipo: 'ok', testo: `✅ Prenotazione confermata: ${slotSelezionato.ora_inizio}–${slotSelezionato.ora_fine}` })
        setSlotSelezionato(null)
        setNoteGenitore('')
        await Promise.all([fetchPrenotazioni(), apriSlots(sessioneAperta)])
        // Ricarica i dati della sessione
        fetchSessioni()
      } else {
        const data = await res.json()
        const msg = data.non_field_errors?.[0] || data.detail || 'Prenotazione non riuscita.'
        setFeedback({ tipo: 'errore', testo: msg })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDisdici = async (prenotazioneId: number) => {
    if (!confirm('Vuoi disdire questa prenotazione?')) return
    setDisdettaId(prenotazioneId)
    try {
      const res = await fetch(`/api/colloqui/prenotazioni/${prenotazioneId}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setFeedback({ tipo: 'ok', testo: 'Prenotazione annullata.' })
        fetchPrenotazioni()
        if (sessioneAperta) {
          const sRes = await fetch(`/api/colloqui/sessioni/${sessioneAperta.id}/slots`)
          if (sRes.ok) setSlots(await sRes.json())
        }
        fetchSessioni()
      }
    } finally {
      setDisdettaId(null)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  const oggi = isoToday()
  const sessioniFuture = sessioni.filter(s => s.data >= oggi)

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F0' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #E17055 0%, #D63031 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(640px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button
              onClick={() => router.push(`/${locale}/dashboard/genitore`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', fontWeight: 800 }}>
            🗓️ Colloqui con le insegnanti
          </h1>
          <p style={{ margin: '0.2rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            Prenota il tuo slot per parlare con le insegnanti
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'min(640px, 96vw)', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

        {/* ── Feedback ────────────────────────────────────────────────────── */}
        {feedback && (
          <div style={{ padding: '0.875rem 1rem', borderRadius: '12px', marginBottom: '1rem', background: feedback.tipo === 'ok' ? '#D1FAE5' : '#FEE2E2', color: feedback.tipo === 'ok' ? '#065F46' : '#B91C1C', fontWeight: 600, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{feedback.testo}</span>
            <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', color: 'inherit' }}>✕</button>
          </div>
        )}

        {/* ── Selettore figlio ─────────────────────────────────────────────── */}
        {bambini.length > 1 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '1rem', marginBottom: '1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>
              Per quale figlio?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {bambini.map(b => (
                <button
                  key={b.id}
                  onClick={() => setBambinoCurrent(b)}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '20px',
                    border: `2px solid ${bambinoCurrent?.id === b.id ? '#E17055' : '#CBD5E0'}`,
                    background: bambinoCurrent?.id === b.id ? '#E17055' : 'white',
                    color: bambinoCurrent?.id === b.id ? 'white' : '#555',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  {nomeBambino(b)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Le mie prenotazioni ───────────────────────────────────────────── */}
        {prenotazioni.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '2px solid #D1FAE5' }}>
            <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#065F46' }}>
              ✅ Le tue prenotazioni
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {prenotazioni.map(p => {
                const s = sessioni.find(s => s.id === p.sessione)
                const slot = s ? (() => {
                  const start = s.ora_inizio.split(':').map(Number)
                  const startMin = start[0] * 60 + (start[1] || 0) + p.slot_index * s.durata_slot
                  const endMin = startMin + s.durata_slot
                  const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
                  return { ora: `${fmt(startMin)}–${fmt(endMin)}` }
                })() : null
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', background: '#F0FFF4', borderRadius: '10px', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A202C' }}>
                        {s ? s.titolo : `Sessione #${p.sessione}`}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#555' }}>
                        {s ? `📅 ${fmtData(s.data)} · ${slot?.ora}` : `Slot ${p.slot_index}`}
                      </div>
                      {p.note_genitore && (
                        <div style={{ fontSize: '0.76rem', color: '#888', fontStyle: 'italic' }}>"{p.note_genitore}"</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDisdici(p.id)}
                      disabled={disdettaId === p.id}
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '10px', border: '1.5px solid #FED7D7', background: '#FFF5F5', color: '#E53E3E', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      {disdettaId === p.id ? '…' : 'Disdici'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Lista sessioni disponibili ────────────────────────────────────── */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>Caricamento…</p>
        ) : sessioniFuture.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', textAlign: 'center', color: '#999', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗓️</p>
            <p>Nessuna sessione di colloquio aperta al momento.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {sessioniFuture.map(s => {
              const miaPren = prenotazioni.find(p => p.sessione === s.id)
              return (
                <div key={s.id} style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `2px solid ${sessioneAperta?.id === s.id ? '#E17055' : 'transparent'}` }}>
                  {/* Header sessione */}
                  <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A202C' }}>{s.titolo}</div>
                      <p style={{ margin: '0.2rem 0 0', color: '#666', fontSize: '0.82rem', textTransform: 'capitalize' }}>
                        📅 {fmtData(s.data)} · {s.ora_inizio.slice(0,5)}–{s.ora_fine.slice(0,5)}
                      </p>
                      <p style={{ margin: '0.15rem 0 0', color: '#888', fontSize: '0.8rem' }}>
                        {s.num_slot - s.num_prenotati} slot liberi su {s.num_slot}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {miaPren && (
                        <span style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: '#D1FAE5', color: '#065F46' }}>
                          ✅ Prenotato
                        </span>
                      )}
                      {s.aperto && !miaPren && s.num_prenotati < s.num_slot && (
                        <button
                          onClick={() => apriSlots(s)}
                          style={{ padding: '0.4rem 0.875rem', borderRadius: '12px', border: '1.5px solid #E17055', background: sessioneAperta?.id === s.id ? '#E17055' : '#FFF8F0', color: sessioneAperta?.id === s.id ? 'white' : '#E17055', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700 }}
                        >
                          {sessioneAperta?.id === s.id ? '✕ Chiudi' : '📅 Prenota'}
                        </button>
                      )}
                    </div>
                  </div>

                  {s.descrizione && (
                    <p style={{ margin: '0 1.25rem 0.75rem', color: '#555', fontSize: '0.82rem', padding: '0.625rem 0.875rem', background: '#FFF8F0', borderRadius: '8px' }}>
                      {s.descrizione}
                    </p>
                  )}

                  {/* Slot ─ solo se la sessione è aperta */}
                  {sessioneAperta?.id === s.id && (
                    <div style={{ borderTop: '1.5px solid #FEE2E2', padding: '1rem 1.25rem' }}>
                      {loadingSlots ? (
                        <p style={{ color: '#999', textAlign: 'center' }}>Caricamento slot…</p>
                      ) : (
                        <>
                          <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.82rem', color: '#888', textTransform: 'uppercase' }}>
                            Scegli un orario
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(120px, 100%), 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                            {slots.filter(sl => sl.disponibile || sl.is_mine).map(slot => {
                              const isMine = slot.is_mine
                              const selected = slotSelezionato?.index === slot.index
                              return (
                                <button
                                  key={slot.index}
                                  onClick={() => {
                                    if (isMine) return
                                    setSlotSelezionato(selected ? null : slot)
                                  }}
                                  disabled={isMine}
                                  style={{
                                    padding: '0.625rem',
                                    borderRadius: '10px',
                                    border: `2px solid ${isMine ? '#D1FAE5' : selected ? '#E17055' : '#CBD5E0'}`,
                                    background: isMine ? '#D1FAE5' : selected ? '#FFF0EC' : 'white',
                                    color: isMine ? '#065F46' : selected ? '#E17055' : '#333',
                                    cursor: isMine ? 'default' : 'pointer',
                                    fontFamily: 'inherit',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textAlign: 'center',
                                  }}
                                >
                                  {slot.ora_inizio}
                                  {isMine && <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>✅ Tuo</div>}
                                </button>
                              )
                            })}
                          </div>

                          {slots.filter(sl => sl.disponibile).length === 0 && !slots.some(sl => sl.is_mine) && (
                            <p style={{ color: '#E53E3E', fontWeight: 600, fontSize: '0.88rem', textAlign: 'center' }}>
                              Tutti gli slot sono stati prenotati.
                            </p>
                          )}

                          {slotSelezionato && (
                            <div style={{ background: '#FFF8F0', borderRadius: '12px', padding: '1rem', border: '1.5px solid #FED7AA' }}>
                              <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.88rem', color: '#C05621' }}>
                                Slot selezionato: {slotSelezionato.ora_inizio}–{slotSelezionato.ora_fine}
                                {bambinoCurrent && ` · 👶 ${nomeBambino(bambinoCurrent)}`}
                              </p>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                                Note (facoltative)
                              </label>
                              <textarea
                                value={noteGenitore}
                                onChange={e => setNoteGenitore(e.target.value)}
                                placeholder="Argomenti da trattare…"
                                rows={2}
                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1.5px solid #FED7AA', fontFamily: 'inherit', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.75rem' }}
                              />
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => { setSlotSelezionato(null); setNoteGenitore('') }}
                                  style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1.5px solid #CBD5E0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem', color: '#555' }}
                                >
                                  Annulla
                                </button>
                                <button
                                  onClick={handlePrenota}
                                  disabled={saving}
                                  style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: 'none', background: saving ? '#FCA99E' : '#E17055', color: 'white', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.875rem' }}
                                >
                                  {saving ? 'Prenotando…' : 'Conferma prenotazione'}
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
