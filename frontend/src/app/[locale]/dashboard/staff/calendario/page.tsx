'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

interface TipoEvento {
  id: number
  nome: string
  colore: string
  icona: string
  attivo: boolean
}

interface Evento {
  id: number
  titolo: string
  descrizione: string
  tipo: number | null
  tipo_dettaglio: TipoEvento | null
  data_inizio: string
  data_fine: string | null
  tutto_il_giorno: boolean
  ora_inizio: string | null
  ora_fine: string | null
  chiusura_scolastica: boolean
  gruppi_ids: number[]
  creato_da_nome: string | null
}

interface Me {
  role: string
}

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
              'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const GIORNI_BREVI = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']
const EDITOR_ROLES = ['admin', 'direttrice', 'coordinatrice', 'insegnante']

function localIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

function meseStr(anno: number, mese: number) {
  return `${anno}-${String(mese + 1).padStart(2, '0')}`
}

function eventiPerGiorno(eventi: Evento[], isoDate: string) {
  return eventi.filter(e => {
    if (e.data_fine) {
      return e.data_inizio <= isoDate && isoDate <= e.data_fine
    }
    return e.data_inizio === isoDate
  })
}

export default function CalendarioStaff() {
  const router = useRouter()
  const locale = useLocale()

  const [me, setMe] = useState<Me | null>(null)
  const [oggi] = useState(() => new Date())
  const [anno, setAnno] = useState(oggi.getFullYear())
  const [mese, setMese] = useState(oggi.getMonth())
  const [vista, setVista] = useState<'mese' | 'lista'>('mese')
  const [eventi, setEventi] = useState<Evento[]>([])
  const [tipi, setTipi] = useState<TipoEvento[]>([])
  const [loading, setLoading] = useState(true)

  // Modal crea/modifica
  const [showForm, setShowForm] = useState(false)
  const [editEvento, setEditEvento] = useState<Evento | null>(null)
  const [form, setForm] = useState({
    titolo: '', descrizione: '', tipo: '', data_inizio: '', data_fine: '',
    tutto_il_giorno: true, ora_inizio: '', ora_fine: '',
    chiusura_scolastica: false, invia_notifica: false,
  })
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  // Modal tipi evento
  const [showTipi, setShowTipi] = useState(false)
  const [nuovoTipo, setNuovoTipo] = useState({ nome: '', colore: '#6C5CE7', icona: '📅' })

  const canEdit = me ? EDITOR_ROLES.includes(me.role) : false
  const isManager = me ? ['admin', 'direttrice'].includes(me.role) : false

  const caricaEventi = useCallback(async () => {
    setLoading(true)
    try {
      const ms = meseStr(anno, mese)
      const r = await fetch(`/api/calendario?mese=${ms}`)
      if (r.ok) {
        const data = await r.json()
        setEventi(Array.isArray(data) ? data : (data.results ?? []))
      }
    } finally {
      setLoading(false)
    }
  }, [anno, mese])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setMe)
      .catch(() => router.push(`/${locale}/login`))
  }, [locale, router])

  useEffect(() => {
    caricaEventi()
  }, [caricaEventi])

  useEffect(() => {
    fetch('/api/calendario/tipi')
      .then(r => r.ok ? r.json() : [])
      .then(data => setTipi(Array.isArray(data) ? data : (data.results ?? [])))
  }, [])

  const apriCrea = (dataDefault?: string) => {
    setEditEvento(null)
    setForm({
      titolo: '', descrizione: '', tipo: '', invia_notifica: false,
      data_inizio: dataDefault ?? localIso(oggi), data_fine: '',
      tutto_il_giorno: true, ora_inizio: '', ora_fine: '', chiusura_scolastica: false,
    })
    setErrore('')
    setShowForm(true)
  }

  const apriModifica = (e: Evento) => {
    setEditEvento(e)
    setForm({
      titolo: e.titolo, descrizione: e.descrizione,
      tipo: e.tipo ? String(e.tipo) : '',
      data_inizio: e.data_inizio, data_fine: e.data_fine ?? '',
      tutto_il_giorno: e.tutto_il_giorno,
      ora_inizio: e.ora_inizio ?? '', ora_fine: e.ora_fine ?? '',
      chiusura_scolastica: e.chiusura_scolastica, invia_notifica: false,
    })
    setErrore('')
    setShowForm(true)
  }

  const salva = async () => {
    if (!form.titolo.trim() || !form.data_inizio) { setErrore('Titolo e data obbligatori.'); return }
    setSaving(true); setErrore('')
    const payload: Record<string, unknown> = {
      titolo: form.titolo.trim(),
      descrizione: form.descrizione,
      tipo: form.tipo ? Number(form.tipo) : null,
      data_inizio: form.data_inizio,
      data_fine: form.data_fine || null,
      tutto_il_giorno: form.tutto_il_giorno,
      ora_inizio: form.tutto_il_giorno ? null : (form.ora_inizio || null),
      ora_fine: form.tutto_il_giorno ? null : (form.ora_fine || null),
      chiusura_scolastica: form.chiusura_scolastica,
      invia_notifica: form.invia_notifica,
    }
    try {
      const url = editEvento ? `/api/calendario/${editEvento.id}` : '/api/calendario'
      const method = editEvento ? 'PATCH' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (r.ok) { setShowForm(false); caricaEventi() }
      else { const d = await r.json(); setErrore(d.detail ?? 'Errore salvataggio.') }
    } finally { setSaving(false) }
  }

  const elimina = async (id: number) => {
    if (!confirm('Eliminare questo evento?')) return
    await fetch(`/api/calendario/${id}`, { method: 'DELETE' })
    setShowForm(false)
    caricaEventi()
  }

  const salvaTipo = async () => {
    if (!nuovoTipo.nome.trim()) return
    const r = await fetch('/api/calendario/tipi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuovoTipo),
    })
    if (r.ok) {
      const d = await r.json()
      setTipi(prev => [...prev, d])
      setNuovoTipo({ nome: '', colore: '#6C5CE7', icona: '📅' })
    }
  }

  const disattivaTipo = async (id: number) => {
    await fetch(`/api/calendario/tipi/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: false }),
    })
    setTipi(prev => prev.map(t => t.id === id ? { ...t, attivo: false } : t))
  }

  // Costruisce le settimane per la griglia mensile
  const primoGiorno = new Date(anno, mese, 1)
  const ultimoGiorno = new Date(anno, mese + 1, 0)
  const startDow = (primoGiorno.getDay() + 6) % 7 // lunedì=0
  const giorni: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) giorni.push(null)
  for (let d = 1; d <= ultimoGiorno.getDate(); d++) giorni.push(new Date(anno, mese, d))
  while (giorni.length % 7 !== 0) giorni.push(null)

  const navMese = (delta: number) => {
    const d = new Date(anno, mese + delta, 1)
    setAnno(d.getFullYear())
    setMese(d.getMonth())
  }

  const oggiIso = localIso(oggi)

  // Lista eventi ordinata
  const eventiLista = [...eventi].sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))

  return (
    <div style={{ minHeight: '100vh', background: '#F3F0FF' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)', padding: '2rem 1.5rem 3rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(960px, 96vw)', margin: '0 auto' }}>
          <button
            onClick={() => router.push(me?.role === 'admin' || me?.role === 'direttrice' ? `/${locale}/dashboard/admin` : `/${locale}/dashboard/staff`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', marginBottom: '0.875rem' }}
          >
            ‹ Dashboard
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 800 }}>📅 Calendario</h1>
              <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>Eventi e chiusure scolastiche</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {isManager && (
                <button
                  onClick={() => setShowTipi(true)}
                  style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ⚙️ Tipi evento
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => apriCrea()}
                  style={{ padding: '0.5rem 1rem', background: 'white', color: '#6C5CE7', border: 'none', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  + Nuovo evento
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenuto */}
      <div style={{ maxWidth: 'min(960px, 96vw)', margin: '-1.5rem auto 0', padding: '0 1rem 3rem', position: 'relative', zIndex: 1 }}>

        {/* Toolbar navigazione mese */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', boxShadow: '0 2px 12px rgba(108,92,231,0.08)' }}>
          <button onClick={() => navMese(-1)} style={{ background: '#F3F0FF', border: 'none', borderRadius: '10px', width: 36, height: 36, cursor: 'pointer', fontSize: '1.1rem', color: '#6C5CE7', fontWeight: 700 }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#333' }}>{MESI[mese]} {anno}</p>
          </div>
          <button onClick={() => navMese(1)} style={{ background: '#F3F0FF', border: 'none', borderRadius: '10px', width: 36, height: 36, cursor: 'pointer', fontSize: '1.1rem', color: '#6C5CE7', fontWeight: 700 }}>›</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => setVista('mese')} style={{ padding: '0.35rem 0.75rem', background: vista === 'mese' ? '#6C5CE7' : '#F3F0FF', color: vista === 'mese' ? 'white' : '#6C5CE7', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>Mese</button>
            <button onClick={() => setVista('lista')} style={{ padding: '0.35rem 0.75rem', background: vista === 'lista' ? '#6C5CE7' : '#F3F0FF', color: vista === 'lista' ? 'white' : '#6C5CE7', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>Lista</button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#6C5CE7', padding: '2rem' }}>Caricamento...</p>
        ) : vista === 'mese' ? (
          /* ── Vista Mese ── */
          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(108,92,231,0.08)' }}>
            {/* Intestazione giorni */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#F3F0FF' }}>
              {GIORNI_BREVI.map(g => (
                <div key={g} style={{ textAlign: 'center', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#6C5CE7' }}>{g}</div>
              ))}
            </div>
            {/* Griglia giorni */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#EEE' }}>
              {giorni.map((giorno, idx) => {
                if (!giorno) return <div key={idx} style={{ background: '#FAFAFA', minHeight: 80 }} />
                const iso = localIso(giorno)
                const evG = eventiPerGiorno(eventi, iso)
                const isOggi = iso === oggiIso
                return (
                  <div
                    key={iso}
                    onClick={() => canEdit && apriCrea(iso)}
                    style={{
                      background: isOggi ? '#F3F0FF' : 'white',
                      minHeight: 80, padding: '0.4rem',
                      cursor: canEdit ? 'pointer' : 'default',
                      position: 'relative',
                    }}
                  >
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, borderRadius: '50%', fontSize: '0.78rem', fontWeight: isOggi ? 800 : 600,
                      color: isOggi ? 'white' : (giorno.getDay() === 0 || giorno.getDay() === 6 ? '#AAA' : '#333'),
                      background: isOggi ? '#6C5CE7' : 'transparent',
                    }}>
                      {giorno.getDate()}
                    </span>
                    <div style={{ marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      {evG.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          onClick={e => { e.stopPropagation(); apriModifica(ev) }}
                          style={{
                            fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.3rem',
                            borderRadius: '4px', color: 'white', cursor: 'pointer',
                            background: ev.tipo_dettaglio?.colore ?? '#6C5CE7',
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                            display: 'flex', alignItems: 'center', gap: '0.2rem',
                          }}
                        >
                          {ev.chiusura_scolastica && <span>⚠️</span>}
                          {ev.titolo}
                        </div>
                      ))}
                      {evG.length > 3 && (
                        <span style={{ fontSize: '0.6rem', color: '#999' }}>+{evG.length - 3} altri</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ── Vista Lista ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {eventiLista.length === 0 && (
              <div style={{ background: 'white', borderRadius: '14px', padding: '2rem', textAlign: 'center', color: '#999' }}>
                Nessun evento in questo mese.
              </div>
            )}
            {eventiLista.map(ev => {
              const colore = ev.tipo_dettaglio?.colore ?? '#6C5CE7'
              const [y, m, d] = ev.data_inizio.split('-')
              const dataLabel = `${d}/${m}/${y}`
              return (
                <div
                  key={ev.id}
                  onClick={() => canEdit ? apriModifica(ev) : undefined}
                  style={{
                    background: 'white', borderRadius: '14px', padding: '1rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    boxShadow: '0 2px 8px rgba(108,92,231,0.06)',
                    cursor: canEdit ? 'pointer' : 'default',
                    borderLeft: `4px solid ${colore}`,
                  }}
                >
                  <div style={{ minWidth: 48, textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '1.5rem' }}>{ev.tipo_dettaglio?.icona ?? '📅'}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: '#999' }}>{dataLabel}</p>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#333' }}>
                      {ev.chiusura_scolastica && <span style={{ marginRight: '0.3rem' }}>⚠️</span>}
                      {ev.titolo}
                    </p>
                    {ev.descrizione && <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.descrizione}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      {ev.tipo_dettaglio && (
                        <span style={{ fontSize: '0.7rem', background: colore + '20', color: colore, padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600 }}>{ev.tipo_dettaglio.nome}</span>
                      )}
                      {ev.chiusura_scolastica && (
                        <span style={{ fontSize: '0.7rem', background: '#FFF3EE', color: '#E17055', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600 }}>Chiusura</span>
                      )}
                    </div>
                  </div>
                  {canEdit && <span style={{ color: '#CCC', fontSize: '1.2rem' }}>›</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal crea/modifica evento ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowForm(false)}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#333' }}>
                {editEvento ? 'Modifica evento' : 'Nuovo evento'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#999' }}>×</button>
            </div>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Titolo *</span>
              <input
                value={form.titolo}
                onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.875rem', border: '2px solid #E8E4FF', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                placeholder="Es. Uscita al parco, Chiusura festiva..."
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <label>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Data inizio *</span>
                <input type="date" value={form.data_inizio} onChange={e => setForm(f => ({ ...f, data_inizio: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.875rem', border: '2px solid #E8E4FF', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </label>
              <label>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Data fine</span>
                <input type="date" value={form.data_fine} onChange={e => setForm(f => ({ ...f, data_fine: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.875rem', border: '2px solid #E8E4FF', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </label>
            </div>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Tipo evento</span>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.875rem', border: '2px solid #E8E4FF', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' }}>
                <option value="">— Nessun tipo —</option>
                {tipi.filter(t => t.attivo).map(t => (
                  <option key={t.id} value={t.id}>{t.icona} {t.nome}</option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.tutto_il_giorno} onChange={e => setForm(f => ({ ...f, tutto_il_giorno: e.target.checked }))} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#555' }}>Tutto il giorno</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.chiusura_scolastica} onChange={e => setForm(f => ({ ...f, chiusura_scolastica: e.target.checked }))} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#E17055' }}>⚠️ Chiusura scolastica</span>
              </label>
            </div>

            {!form.tutto_il_giorno && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <label>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Ora inizio</span>
                  <input type="time" value={form.ora_inizio} onChange={e => setForm(f => ({ ...f, ora_inizio: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.875rem', border: '2px solid #E8E4FF', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </label>
                <label>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Ora fine</span>
                  <input type="time" value={form.ora_fine} onChange={e => setForm(f => ({ ...f, ora_fine: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.875rem', border: '2px solid #E8E4FF', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </label>
              </div>
            )}

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Descrizione</span>
              <textarea
                value={form.descrizione}
                onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
                rows={3}
                style={{ width: '100%', padding: '0.6rem 0.875rem', border: '2px solid #E8E4FF', borderRadius: '10px', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                placeholder="Note aggiuntive (facoltativo)..."
              />
            </label>

            {!editEvento && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.invia_notifica} onChange={e => setForm(f => ({ ...f, invia_notifica: e.target.checked }))} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#555' }}>📧 Invia notifica email ai genitori</span>
              </label>
            )}

            {errore && <p style={{ color: '#E17055', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{errore}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {editEvento && (
                <button onClick={() => elimina(editEvento.id)}
                  style={{ padding: '0.7rem 1rem', background: '#FFF3EE', color: '#E17055', border: '2px solid #FFD4B3', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'inherit' }}>
                  Elimina
                </button>
              )}
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '0.7rem 1rem', background: '#F3F0FF', color: '#6C5CE7', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit' }}>
                Annulla
              </button>
              <button onClick={salva} disabled={saving}
                style={{ flex: 2, padding: '0.7rem 1rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '12px', cursor: saving ? 'default' : 'pointer', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvataggio...' : (editEvento ? 'Salva modifiche' : 'Crea evento')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal gestione tipi evento ── */}
      {showTipi && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setShowTipi(false)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#333' }}>Tipi evento</h2>
              <button onClick={() => setShowTipi(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#999' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {tipi.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.875rem', background: '#F9F8FF', borderRadius: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{t.icona}</span>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: t.colore, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', flex: 1, color: t.attivo ? '#333' : '#AAA' }}>{t.nome}</span>
                  {!t.attivo && <span style={{ fontSize: '0.7rem', color: '#AAA' }}>disattivo</span>}
                  {t.attivo && (
                    <button onClick={() => disattivaTipo(t.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#999' }}>
                      Disattiva
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #EEE', paddingTop: '1.25rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.875rem', color: '#555' }}>Nuovo tipo evento</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  value={nuovoTipo.icona}
                  onChange={e => setNuovoTipo(n => ({ ...n, icona: e.target.value }))}
                  style={{ width: 52, padding: '0.5rem', border: '2px solid #E8E4FF', borderRadius: '10px', fontSize: '1rem', textAlign: 'center', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  placeholder="📅"
                />
                <input
                  value={nuovoTipo.nome}
                  onChange={e => setNuovoTipo(n => ({ ...n, nome: e.target.value }))}
                  style={{ flex: 1, padding: '0.5rem 0.875rem', border: '2px solid #E8E4FF', borderRadius: '10px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  placeholder="Nome tipo evento..."
                />
                <input
                  type="color"
                  value={nuovoTipo.colore}
                  onChange={e => setNuovoTipo(n => ({ ...n, colore: e.target.value }))}
                  style={{ width: 44, height: 44, border: '2px solid #E8E4FF', borderRadius: '10px', cursor: 'pointer', padding: '0.2rem', boxSizing: 'border-box' }}
                />
              </div>
              <button onClick={salvaTipo}
                style={{ width: '100%', padding: '0.65rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.875rem' }}>
                + Aggiungi tipo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
