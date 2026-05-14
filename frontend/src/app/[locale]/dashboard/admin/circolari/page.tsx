'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

interface Gruppo {
  id: number
  nome: string
  colore: string
}

interface Circolare {
  id: number
  titolo: string
  testo: string
  allegato_url: string | null
  autore_nome: string
  gruppi_ids: number[]
  gruppi_nomi: string[]
  pubblicata: boolean
  notifica_inviata: boolean
  num_letture: number
  creato_at: string
}

interface Lettura {
  utente: string
  letto_at: string
}

export default function CircolariAdmin() {
  const router = useRouter()
  const locale = useLocale()

  const [circolari, setCircolari] = useState<Circolare[]>([])
  const [gruppi, setGruppi] = useState<Gruppo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'tutte' | 'bozze' | 'pubblicate'>('tutte')

  // Modal crea/modifica
  const [showForm, setShowForm] = useState(false)
  const [editCircolare, setEditCircolare] = useState<Circolare | null>(null)
  const [form, setForm] = useState({
    titolo: '', testo: '', gruppi: [] as number[],
    pubblicata: false, invia_notifica: false,
  })
  const [allegato, setAllegato] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  // Modal dettaglio / letture
  const [dettaglio, setDettaglio] = useState<Circolare | null>(null)
  const [letture, setLetture] = useState<Lettura[]>([])
  const [loadingLetture, setLoadingLetture] = useState(false)

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
    fetch('/api/config/gruppi')
      .then(r => r.ok ? r.json() : [])
      .then(d => setGruppi(Array.isArray(d) ? d : (d.results ?? [])))
  }, [locale, router, carica])

  const apriCrea = () => {
    setEditCircolare(null)
    setForm({ titolo: '', testo: '', gruppi: [], pubblicata: false, invia_notifica: false })
    setAllegato(null)
    setErrore('')
    setShowForm(true)
  }

  const apriModifica = (c: Circolare) => {
    setEditCircolare(c)
    setForm({ titolo: c.titolo, testo: c.testo, gruppi: c.gruppi_ids, pubblicata: c.pubblicata, invia_notifica: false })
    setAllegato(null)
    setErrore('')
    setShowForm(true)
  }

  const toggleGruppo = (id: number) => {
    setForm(f => ({
      ...f,
      gruppi: f.gruppi.includes(id) ? f.gruppi.filter(g => g !== id) : [...f.gruppi, id],
    }))
  }

  const salva = async () => {
    if (!form.titolo.trim() || !form.testo.trim()) { setErrore('Titolo e testo obbligatori.'); return }
    setSaving(true); setErrore('')

    try {
      let body: FormData | string
      let headers: Record<string, string> = {}

      if (allegato) {
        const fd = new FormData()
        fd.append('titolo', form.titolo.trim())
        fd.append('testo', form.testo)
        fd.append('pubblicata', String(form.pubblicata))
        fd.append('invia_notifica', String(form.invia_notifica))
        form.gruppi.forEach(id => fd.append('gruppi', String(id)))
        fd.append('allegato', allegato)
        body = fd
      } else {
        body = JSON.stringify({
          titolo: form.titolo.trim(),
          testo: form.testo,
          gruppi: form.gruppi,
          pubblicata: form.pubblicata,
          invia_notifica: form.invia_notifica,
        })
        headers['Content-Type'] = 'application/json'
      }

      const url = editCircolare ? `/api/circolari/${editCircolare.id}` : '/api/circolari'
      const method = editCircolare ? 'PATCH' : 'POST'
      const r = await fetch(url, { method, headers, body })
      if (r.ok) { setShowForm(false); carica() }
      else { const d = await r.json(); setErrore(d.detail ?? 'Errore salvataggio.') }
    } finally {
      setSaving(false)
    }
  }

  const elimina = async (id: number) => {
    if (!confirm('Eliminare questa circolare?')) return
    await fetch(`/api/circolari/${id}`, { method: 'DELETE' })
    setShowForm(false)
    carica()
  }

  const pubblicaOra = async (c: Circolare) => {
    await fetch(`/api/circolari/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pubblicata: true }),
    })
    carica()
  }

  const apriLetture = async (c: Circolare) => {
    setDettaglio(c)
    setLoadingLetture(true)
    const r = await fetch(`/api/circolari/${c.id}/letture`)
    if (r.ok) setLetture(await r.json())
    setLoadingLetture(false)
  }

  const circolariFiltrate = circolari.filter(c => {
    if (filtro === 'bozze') return !c.pubblicata
    if (filtro === 'pubblicate') return c.pubblicata
    return true
  })

  const formatData = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F0FF' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)', padding: '2rem 1.5rem 3rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(960px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button
              onClick={() => router.push(`/${locale}/dashboard/admin`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              ‹ Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 800 }}>📢 Circolari</h1>
              <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>Comunicazioni alle famiglie</p>
            </div>
            <button
              onClick={apriCrea}
              style={{ padding: '0.6rem 1.25rem', background: 'white', color: '#6C5CE7', border: 'none', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Nuova circolare
            </button>
          </div>
        </div>
      </div>

      {/* Contenuto */}
      <div style={{ maxWidth: 'min(960px, 96vw)', margin: '-1.5rem auto 0', padding: '0 1rem 3rem', position: 'relative', zIndex: 1 }}>

        {/* Filtri */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {(['tutte', 'pubblicate', 'bozze'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              style={{ padding: '0.4rem 0.875rem', background: filtro === f ? '#6C5CE7' : 'white', color: filtro === f ? 'white' : '#6C5CE7', border: '2px solid #D6CCFF', borderRadius: '20px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize' }}>
              {f === 'tutte' ? 'Tutte' : f === 'pubblicate' ? 'Pubblicate' : 'Bozze'}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#6C5CE7', padding: '2rem' }}>Caricamento...</p>
        ) : circolariFiltrate.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', padding: '2.5rem', textAlign: 'center', color: '#AAA' }}>
            Nessuna circolare {filtro !== 'tutte' ? `(${filtro})` : ''}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {circolariFiltrate.map(c => (
              <div key={c.id} style={{ background: 'white', borderRadius: '14px', padding: '1.125rem 1.25rem', boxShadow: '0 2px 8px rgba(108,92,231,0.06)', borderLeft: `4px solid ${c.pubblicata ? '#6C5CE7' : '#DDD'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#333' }}>{c.titolo}</span>
                      {!c.pubblicata && (
                        <span style={{ fontSize: '0.65rem', background: '#F3F0FF', color: '#6C5CE7', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 700 }}>BOZZA</span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#666', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.testo}</p>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: '#999', flexWrap: 'wrap' }}>
                      <span>📅 {formatData(c.creato_at)}</span>
                      <span>✍️ {c.autore_nome}</span>
                      {c.gruppi_nomi.length > 0
                        ? <span>👥 {c.gruppi_nomi.join(', ')}</span>
                        : <span>👥 Tutti i gruppi</span>}
                      {c.allegato_url && <span>📎 allegato</span>}
                      {c.pubblicata && <span style={{ color: '#38A169', fontWeight: 700 }}>✓ {c.num_letture} letture</span>}
                      {c.notifica_inviata && <span>📧 notifica inviata</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap' }}>
                    {!c.pubblicata && (
                      <button onClick={() => pubblicaOra(c)}
                        style={{ padding: '0.4rem 0.875rem', background: '#F0FFF4', color: '#276749', border: '1.5px solid #9AE6B4', borderRadius: '12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit' }}>
                        Pubblica
                      </button>
                    )}
                    {c.pubblicata && (
                      <button onClick={() => apriLetture(c)}
                        style={{ padding: '0.4rem 0.875rem', background: '#F3F0FF', color: '#6C5CE7', border: '1.5px solid #D6CCFF', borderRadius: '12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit' }}>
                        Letture
                      </button>
                    )}
                    <button onClick={() => apriModifica(c)}
                      style={{ padding: '0.4rem 0.875rem', background: '#F9F8FF', color: '#6C5CE7', border: '1.5px solid #D6CCFF', borderRadius: '12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit' }}>
                      Modifica
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal crea/modifica ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowForm(false)}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#333' }}>
                {editCircolare ? 'Modifica circolare' : 'Nuova circolare'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#999' }}>×</button>
            </div>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Titolo *</span>
              <input value={form.titolo} onChange={e => { setForm(f => ({ ...f, titolo: e.target.value })); if (errore) setErrore('') }}
                style={{ width: '100%', padding: '0.6rem 0.875rem', border: `2px solid ${errore && !form.titolo.trim() ? '#E53E3E' : '#E8E4FF'}`, borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                placeholder="Es. Uscita didattica 15 aprile..." />
            </label>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Testo *</span>
              <textarea value={form.testo} onChange={e => { setForm(f => ({ ...f, testo: e.target.value })); if (errore) setErrore('') }}
                rows={6}
                style={{ width: '100%', padding: '0.6rem 0.875rem', border: `2px solid ${errore && !form.testo.trim() ? '#E53E3E' : '#E8E4FF'}`, borderRadius: '10px', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                placeholder="Testo della comunicazione..." />
            </label>

            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.5rem' }}>Gruppi destinatari (nessuna selezione = tutti)</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {gruppi.map(g => (
                  <button key={g.id} onClick={() => toggleGruppo(g.id)}
                    style={{ padding: '0.3rem 0.75rem', background: form.gruppi.includes(g.id) ? g.colore : '#F3F0FF', color: form.gruppi.includes(g.id) ? 'white' : '#555', border: `2px solid ${g.colore}`, borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>
                    {g.nome}
                  </button>
                ))}
              </div>
            </div>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Allegato (PDF, immagine)</span>
              <input type="file" accept=".pdf,image/*" onChange={e => setAllegato(e.target.files?.[0] ?? null)}
                style={{ fontSize: '0.85rem' }} />
              {editCircolare?.allegato_url && !allegato && (
                <a href={editCircolare.allegato_url} target="_blank" rel="noreferrer"
                  style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.75rem', color: '#6C5CE7' }}>
                  📎 Allegato attuale
                </a>
              )}
            </label>

            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.pubblicata} onChange={e => setForm(f => ({ ...f, pubblicata: e.target.checked }))} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#555' }}>Pubblica subito</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.invia_notifica} onChange={e => setForm(f => ({ ...f, invia_notifica: e.target.checked }))} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#555' }}>📧 Invia email ai genitori</span>
              </label>
            </div>

            {errore && <p style={{ color: '#E17055', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{errore}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {editCircolare && (
                <button onClick={() => elimina(editCircolare.id)}
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
                {saving ? 'Salvataggio...' : (editCircolare ? 'Salva modifiche' : 'Crea circolare')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal letture ── */}
      {dettaglio && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setDettaglio(null)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: 440, maxHeight: '70vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#333' }}>
                Letture — {dettaglio.titolo}
              </h2>
              <button onClick={() => setDettaglio(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#999' }}>×</button>
            </div>
            {loadingLetture ? (
              <p style={{ color: '#999', fontSize: '0.875rem' }}>Caricamento...</p>
            ) : letture.length === 0 ? (
              <p style={{ color: '#AAA', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>Nessun genitore ha ancora letto questa circolare.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {letture.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#F9F8FF', borderRadius: '10px', fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 600, color: '#333' }}>{l.utente}</span>
                    <span style={{ color: '#999' }}>{new Date(l.letto_at).toLocaleDateString('it-IT')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
