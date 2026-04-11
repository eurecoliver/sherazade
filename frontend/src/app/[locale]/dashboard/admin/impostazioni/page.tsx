'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

interface PermessoRuolo {
  id: number
  ruolo: string
  risorsa: string
  azione: string
  consentito: boolean
}

interface Ruolo {
  id: number
  codice: string
  nome: string
  sistema: boolean
  ordine: number
  user_count: number
}

const RISORSE_LABEL: Record<string, string> = {
  bambini:    '👶 Anagrafica bambini',
  consensi:   '📷 Consensi fotografici',
  presenze:   '📅 Presenze',
  diario:     '📖 Diario',
  pappe:      '🥣 Pappe e menu',
  circolari:  '📢 Circolari',
  calendario: '🗓️ Calendario',
  agenda:     '📝 Agenda note',
  fatture:    '🧾 Fatture',
  utenti:     '👤 Gestione utenti',
}

const AZIONI: { key: string; label: string; color: string }[] = [
  { key: 'leggi',   label: 'Leggi',    color: '#0984E3' },
  { key: 'scrivi',  label: 'Scrivi',   color: '#00B894' },
  { key: 'elimina', label: 'Elimina',  color: '#E17055' },
]

interface Gruppo {
  id: number
  nome: string
  colore: string
  ordine: number
  attivo: boolean
  bambini_count: number
}

interface OrarioUscita {
  id: number
  etichetta: string
  orario: string
  ordine: number
  attivo: boolean
}

const EMPTY_GRUPPO = { nome: '', colore: '#6C5CE7', ordine: 0, attivo: true }
const EMPTY_ORARIO = { etichetta: '', orario: '16:00', ordine: 0, attivo: true }

export default function ImpostazioniPage() {
  const router = useRouter()
  const locale = useLocale()

  const [activeTab, setActiveTab] = useState<'gruppi' | 'orari' | 'permessi'>('gruppi')

  // Ruoli state
  const [ruoli, setRuoli] = useState<Ruolo[]>([])
  const [loadingRuoli, setLoadingRuoli] = useState(false)
  const [ruoloSelezionato, setRuoloSelezionato] = useState<Ruolo | null>(null)
  const [showRuoloModal, setShowRuoloModal] = useState(false)
  const [editingRuolo, setEditingRuolo] = useState<Ruolo | null>(null)
  const [ruoloForm, setRuoloForm] = useState({ codice: '', nome: '', ordine: 0 })
  const [savingRuolo, setSavingRuolo] = useState(false)
  const [ruoloError, setRuoloError] = useState('')
  const [deletingRuolo, setDeletingRuolo] = useState<number | null>(null)

  // Permessi state
  const [permessi, setPermessi] = useState<PermessoRuolo[]>([])
  const [savingPermesso, setSavingPermesso] = useState<number | null>(null)

  // Gruppi state
  const [gruppi, setGruppi] = useState<Gruppo[]>([])
  const [loadingGruppi, setLoadingGruppi] = useState(true)
  const [showGruppoModal, setShowGruppoModal] = useState(false)
  const [editingGruppoId, setEditingGruppoId] = useState<number | null>(null)
  const [gruppoForm, setGruppoForm] = useState({ ...EMPTY_GRUPPO })
  const [savingGruppo, setSavingGruppo] = useState(false)
  const [gruppoError, setGruppoError] = useState('')

  // Orari state
  const [orari, setOrari] = useState<OrarioUscita[]>([])
  const [loadingOrari, setLoadingOrari] = useState(true)
  const [showOrarioModal, setShowOrarioModal] = useState(false)
  const [editingOrarioId, setEditingOrarioId] = useState<number | null>(null)
  const [orarioForm, setOrarioForm] = useState({ ...EMPTY_ORARIO })
  const [savingOrario, setSavingOrario] = useState(false)
  const [orarioError, setOrarioError] = useState('')

  const fetchRuoli = useCallback(async () => {
    setLoadingRuoli(true)
    const res = await fetch('/api/config/ruoli')
    if (res.ok) {
      const data = await res.json()
      const list: Ruolo[] = Array.isArray(data) ? data : data.results ?? []
      setRuoli(list)
      // Auto-seleziona il primo ruolo non-admin
      if (!ruoloSelezionato) setRuoloSelezionato(list.find(r => !r.sistema) ?? list[0] ?? null)
    }
    setLoadingRuoli(false)
  }, [ruoloSelezionato])

  const fetchPermessiPerRuolo = useCallback(async (codice: string) => {
    const res = await fetch(`/api/config/permessi?ruolo=${codice}`)
    if (res.ok) {
      const data = await res.json()
      const nuovi: PermessoRuolo[] = Array.isArray(data) ? data : data.results ?? []
      // Merge con permessi esistenti (altri ruoli restano in cache)
      setPermessi(prev => {
        const filtered = prev.filter(p => p.ruolo !== codice)
        return [...filtered, ...nuovi]
      })
    }
  }, [])

  const togglePermesso = async (p: PermessoRuolo) => {
    setSavingPermesso(p.id)
    const res = await fetch(`/api/config/permessi/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consentito: !p.consentito }),
    })
    if (res.ok) {
      setPermessi(prev => prev.map(x => x.id === p.id ? { ...x, consentito: !x.consentito } : x))
    }
    setSavingPermesso(null)
  }

  const openNuovoRuolo = () => {
    setEditingRuolo(null)
    setRuoloForm({ codice: '', nome: '', ordine: ruoli.length })
    setRuoloError('')
    setShowRuoloModal(true)
  }

  const openEditRuolo = (r: Ruolo) => {
    setEditingRuolo(r)
    setRuoloForm({ codice: r.codice, nome: r.nome, ordine: r.ordine })
    setRuoloError('')
    setShowRuoloModal(true)
  }

  const saveRuolo = async () => {
    setSavingRuolo(true)
    setRuoloError('')
    const url = editingRuolo ? `/api/config/ruoli/${editingRuolo.id}` : '/api/config/ruoli'
    const method = editingRuolo ? 'PATCH' : 'POST'
    const body = editingRuolo
      ? { nome: ruoloForm.nome, ordine: ruoloForm.ordine }
      : { codice: ruoloForm.codice, nome: ruoloForm.nome, ordine: ruoloForm.ordine }
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setShowRuoloModal(false)
      fetchRuoli()
    } else {
      const data = await res.json()
      setRuoloError(data.detail ?? JSON.stringify(data))
    }
    setSavingRuolo(false)
  }

  const deleteRuolo = async (r: Ruolo) => {
    if (r.sistema) return
    setDeletingRuolo(r.id)
    try {
      const res = await fetch(`/api/config/ruoli/${r.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setRuoli(prev => prev.filter(x => x.id !== r.id))
        if (ruoloSelezionato?.id === r.id) setRuoloSelezionato(null)
      } else {
        const data = await res.json()
        alert(data.detail ?? 'Impossibile eliminare il ruolo.')
      }
    } catch {
      alert('Errore di rete. Riprova.')
    } finally {
      setDeletingRuolo(null)
    }
  }

  const selezionaRuolo = (r: Ruolo) => {
    setRuoloSelezionato(r)
    // Il fetch permessi è gestito dall'useEffect che osserva ruoloSelezionato
  }

  const fetchGruppi = useCallback(async () => {
    setLoadingGruppi(true)
    const res = await fetch('/api/config/gruppi?attivo=false')
    if (res.ok) {
      const data = await res.json()
      setGruppi(Array.isArray(data) ? data : data.results ?? [])
    }
    setLoadingGruppi(false)
  }, [])

  const fetchOrari = useCallback(async () => {
    setLoadingOrari(true)
    const res = await fetch('/api/config/orari?attivo=false')
    if (res.ok) {
      const data = await res.json()
      setOrari(Array.isArray(data) ? data : data.results ?? [])
    }
    setLoadingOrari(false)
  }, [])

  useEffect(() => { fetchGruppi() }, [fetchGruppi])
  useEffect(() => { fetchOrari() }, [fetchOrari])
  useEffect(() => { if (activeTab === 'permessi' && ruoli.length === 0) fetchRuoli() }, [activeTab, fetchRuoli, ruoli.length])
  // Carica permessi appena viene selezionato un ruolo (inclusa auto-selezione al primo caricamento)
  useEffect(() => {
    if (ruoloSelezionato && !ruoloSelezionato.sistema) {
      fetchPermessiPerRuolo(ruoloSelezionato.codice)
    }
  }, [ruoloSelezionato, fetchPermessiPerRuolo])

  // ── Gruppo CRUD ──

  const openNewGruppo = () => {
    setEditingGruppoId(null)
    setGruppoForm({ ...EMPTY_GRUPPO })
    setGruppoError('')
    setShowGruppoModal(true)
  }

  const openEditGruppo = (g: Gruppo) => {
    setEditingGruppoId(g.id)
    setGruppoForm({ nome: g.nome, colore: g.colore, ordine: g.ordine, attivo: g.attivo })
    setGruppoError('')
    setShowGruppoModal(true)
  }

  const saveGruppo = async () => {
    setSavingGruppo(true)
    setGruppoError('')
    const url = editingGruppoId ? `/api/config/gruppi/${editingGruppoId}` : '/api/config/gruppi'
    const method = editingGruppoId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gruppoForm),
    })
    if (res.ok) {
      setShowGruppoModal(false)
      fetchGruppi()
    } else {
      const data = await res.json()
      setGruppoError(JSON.stringify(data))
    }
    setSavingGruppo(false)
  }

  const deleteGruppo = async (g: Gruppo) => {
    if (!confirm(`Eliminare il gruppo "${g.nome}"? Non sarà possibile se ha bambini associati.`)) return
    const res = await fetch(`/api/config/gruppi/${g.id}`, { method: 'DELETE' })
    if (res.ok) fetchGruppi()
  }

  // ── Orario CRUD ──

  const openNewOrario = () => {
    setEditingOrarioId(null)
    setOrarioForm({ ...EMPTY_ORARIO })
    setOrarioError('')
    setShowOrarioModal(true)
  }

  const openEditOrario = (o: OrarioUscita) => {
    setEditingOrarioId(o.id)
    setOrarioForm({ etichetta: o.etichetta, orario: o.orario, ordine: o.ordine, attivo: o.attivo })
    setOrarioError('')
    setShowOrarioModal(true)
  }

  const saveOrario = async () => {
    setSavingOrario(true)
    setOrarioError('')
    const url = editingOrarioId ? `/api/config/orari/${editingOrarioId}` : '/api/config/orari'
    const method = editingOrarioId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orarioForm),
    })
    if (res.ok) {
      setShowOrarioModal(false)
      fetchOrari()
    } else {
      const data = await res.json()
      setOrarioError(JSON.stringify(data))
    }
    setSavingOrario(false)
  }

  const deleteOrario = async (o: OrarioUscita) => {
    if (!confirm(`Eliminare l'orario "${o.etichetta}"?`)) return
    const res = await fetch(`/api/config/orari/${o.id}`, { method: 'DELETE' })
    if (res.ok) fetchOrari()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F0FF' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(860px, 96vw)', margin: '0 auto' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/admin`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', marginBottom: '0.875rem' }}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', fontWeight: 800 }}>⚙️ Impostazioni</h1>
          <p style={{ margin: '0.2rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>Gruppi sezione e orari di uscita</p>
        </div>
      </div>

      <div style={{ maxWidth: 'min(860px, 96vw)', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {([['gruppi', '🎨 Gruppi'], ['orari', '🕐 Orari uscita'], ['permessi', '🔒 Permessi ruoli']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                border: '2px solid #D6CCFF',
                background: activeTab === tab ? '#6C5CE7' : 'white',
                color: activeTab === tab ? 'white' : '#6C5CE7',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── GRUPPI TAB ── */}
        {activeTab === 'gruppi' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(108,92,231,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#444' }}>Gruppi / Sezioni</h2>
              <button
                onClick={openNewGruppo}
                style={{ padding: '0.5rem 1rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}
              >
                + Nuovo
              </button>
            </div>

            {loadingGruppi ? (
              <div style={{ color: '#999', padding: '1rem 0' }}>Caricamento...</div>
            ) : gruppi.length === 0 ? (
              <div style={{ color: '#999', padding: '1rem 0', textAlign: 'center' }}>
                Nessun gruppo configurato.<br />
                <small>Crea almeno un gruppo per assegnarlo ai bambini.</small>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {gruppi.map(g => (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                    borderRadius: '10px', background: g.attivo ? '#FAFAFA' : '#FFF5F5',
                    border: `1px solid ${g.attivo ? '#EEE' : '#FED7D7'}`,
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', background: g.colore, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: g.attivo ? '#333' : '#999', fontSize: '0.9rem' }}>
                        {g.nome}
                        {!g.attivo && <span style={{ marginLeft: '0.5rem', color: '#E53E3E', fontSize: '0.75rem' }}>(disabilitato)</span>}
                      </div>
                      <div style={{ color: '#888', fontSize: '0.78rem' }}>
                        {g.bambini_count} bambini · ordine {g.ordine}
                      </div>
                    </div>
                    <button
                      onClick={() => openEditGruppo(g)}
                      style={{ padding: '0.35rem 0.75rem', background: '#F3F0FF', color: '#6C5CE7', border: '1px solid #D6CCFF', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => deleteGruppo(g)}
                      style={{ padding: '0.35rem 0.75rem', background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Elimina
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PERMESSI TAB ── */}
        {activeTab === 'permessi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Lista ruoli */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(108,92,231,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem', fontWeight: 700, color: '#444' }}>Ruoli</h2>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#999' }}>Admin ha sempre accesso completo e non è modificabile.</p>
                </div>
                <button onClick={openNuovoRuolo}
                  style={{ padding: '0.5rem 1rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}>
                  + Nuovo ruolo
                </button>
              </div>

              {loadingRuoli ? (
                <div style={{ color: '#999', padding: '1rem 0' }}>Caricamento...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {ruoli.map(r => {
                    const selezionato = ruoloSelezionato?.id === r.id
                    return (
                      <div key={r.id}
                        onClick={() => selezionaRuolo(r)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.75rem 1rem', borderRadius: '10px', cursor: 'pointer',
                          background: selezionato ? '#F3F0FF' : '#FAFAFA',
                          border: `2px solid ${selezionato ? '#6C5CE7' : '#EEE'}`,
                          transition: 'all 0.12s',
                        }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#333' }}>{r.nome}</span>
                            {r.sistema && <span style={{ fontSize: '0.65rem', background: '#DDD', color: '#666', padding: '0.1rem 0.4rem', borderRadius: '8px', fontWeight: 700 }}>SISTEMA</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#999' }}>
                            {r.sistema ? 'Accesso completo · non configurabile' : `${r.user_count} utenti · codice: ${r.codice}`}
                          </div>
                        </div>
                        {!r.sistema && (
                          <div style={{ display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEditRuolo(r)}
                              style={{ padding: '0.3rem 0.65rem', background: '#F3F0FF', color: '#6C5CE7', border: '1px solid #D6CCFF', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                              Modifica
                            </button>
                            <button
                              onClick={() => {
                                if (r.user_count > 0) {
                                  alert(`Ci sono ${r.user_count} utenti con questo ruolo. Riassegnali prima di eliminarlo.`)
                                  return
                                }
                                if (confirm(`Eliminare il ruolo "${r.nome}"?`)) deleteRuolo(r)
                              }}
                              disabled={deletingRuolo === r.id}
                              style={{ padding: '0.3rem 0.65rem', background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: deletingRuolo === r.id ? 0.5 : 1 }}>
                              Elimina
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Matrice permessi per ruolo selezionato */}
            {ruoloSelezionato && (
              <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(108,92,231,0.08)' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#444' }}>
                  Permessi — {ruoloSelezionato.nome}
                </h3>

                {ruoloSelezionato.sistema ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', background: '#F9F9F9', borderRadius: '10px', fontSize: '0.9rem' }}>
                    🔒 Questo ruolo ha accesso completo a tutte le funzionalità e non è configurabile.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.entries(RISORSE_LABEL).map(([risorsa, risorsaLabel]) => (
                      <div key={risorsa} style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.625rem 0.875rem', borderRadius: '10px',
                        background: '#FAFAFA', border: '1px solid #EEE', flexWrap: 'wrap',
                      }}>
                        <div style={{ flex: 1, minWidth: 150, fontWeight: 600, fontSize: '0.85rem', color: '#333' }}>
                          {risorsaLabel}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {AZIONI.map(({ key: azione, label, color }) => {
                            const p = permessi.find(x => x.ruolo === ruoloSelezionato.codice && x.risorsa === risorsa && x.azione === azione)
                            if (!p) return <span key={azione} style={{ width: 60, fontSize: '0.72rem', color: '#CCC', textAlign: 'center' }}>—</span>
                            const saving = savingPermesso === p.id
                            return (
                              <button key={azione}
                                onClick={() => !saving && togglePermesso(p)}
                                disabled={saving}
                                style={{
                                  width: 64, padding: '0.28rem 0',
                                  borderRadius: '20px',
                                  border: `2px solid ${p.consentito ? color : '#DDD'}`,
                                  background: p.consentito ? color : 'white',
                                  color: p.consentito ? 'white' : '#BBB',
                                  fontWeight: 700, cursor: saving ? 'default' : 'pointer',
                                  fontSize: '0.72rem', fontFamily: 'inherit',
                                  opacity: saving ? 0.5 : 1, transition: 'all 0.12s',
                                }}>
                                {label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ORARI TAB ── */}
        {activeTab === 'orari' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(108,92,231,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#444' }}>Orari di uscita</h2>
              <button
                onClick={openNewOrario}
                style={{ padding: '0.5rem 1rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}
              >
                + Nuovo
              </button>
            </div>

            {loadingOrari ? (
              <div style={{ color: '#999', padding: '1rem 0' }}>Caricamento...</div>
            ) : orari.length === 0 ? (
              <div style={{ color: '#999', padding: '1rem 0', textAlign: 'center' }}>
                Nessun orario configurato.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {orari.map(o => (
                  <div key={o.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                    borderRadius: '10px', background: o.attivo ? '#FAFAFA' : '#FFF5F5',
                    border: `1px solid ${o.attivo ? '#EEE' : '#FED7D7'}`,
                  }}>
                    <div style={{ fontSize: '1.25rem', flexShrink: 0 }}>🕐</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: o.attivo ? '#333' : '#999', fontSize: '0.9rem' }}>
                        {o.etichetta}
                        {!o.attivo && <span style={{ marginLeft: '0.5rem', color: '#E53E3E', fontSize: '0.75rem' }}>(disabilitato)</span>}
                      </div>
                      <div style={{ color: '#888', fontSize: '0.78rem' }}>
                        {o.orario} · ordine {o.ordine}
                      </div>
                    </div>
                    <button
                      onClick={() => openEditOrario(o)}
                      style={{ padding: '0.35rem 0.75rem', background: '#F3F0FF', color: '#6C5CE7', border: '1px solid #D6CCFF', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => deleteOrario(o)}
                      style={{ padding: '0.35rem 0.75rem', background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Elimina
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ruolo Modal */}
      {showRuoloModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 1.5rem', color: '#6C5CE7', fontSize: '1.15rem', fontWeight: 800 }}>
              {editingRuolo ? 'Modifica ruolo' : 'Nuovo ruolo'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {!editingRuolo && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Codice *</label>
                  <input value={ruoloForm.codice}
                    onChange={e => setRuoloForm(f => ({ ...f, codice: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                    placeholder="es. logopedista, psicologo..."
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: '#999' }}>Solo lettere minuscole, numeri e underscore. Non modificabile dopo la creazione.</p>
                </div>
              )}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Nome visualizzato *</label>
                <input value={ruoloForm.nome}
                  onChange={e => setRuoloForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="es. Logopedista, Psicologo..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Ordine</label>
                <input type="number" value={ruoloForm.ordine}
                  onChange={e => setRuoloForm(f => ({ ...f, ordine: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>
            {ruoloError && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#FFF5F5', borderRadius: '8px', color: '#E53E3E', fontSize: '0.85rem' }}>
                {ruoloError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowRuoloModal(false)}
                style={{ flex: 1, padding: '0.75rem', background: '#F3F0FF', color: '#6C5CE7', border: '2px solid #D6CCFF', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}>
                Annulla
              </button>
              <button onClick={saveRuolo} disabled={savingRuolo}
                style={{ flex: 2, padding: '0.75rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: savingRuolo ? 'default' : 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', opacity: savingRuolo ? 0.7 : 1 }}>
                {savingRuolo ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gruppo Modal */}
      {showGruppoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 1.5rem', color: '#6C5CE7', fontSize: '1.15rem', fontWeight: 800 }}>
              {editingGruppoId ? 'Modifica gruppo' : 'Nuovo gruppo'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Nome *</label>
                <input value={gruppoForm.nome} onChange={e => setGruppoForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="es. Gialli, Rossi, Nido A..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Colore</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="color" value={gruppoForm.colore} onChange={e => setGruppoForm(f => ({ ...f, colore: e.target.value }))}
                    style={{ width: '48px', height: '40px', borderRadius: '8px', border: '1.5px solid #D6CCFF', cursor: 'pointer', padding: '2px' }} />
                  <input value={gruppoForm.colore} onChange={e => setGruppoForm(f => ({ ...f, colore: e.target.value }))}
                    placeholder="#6C5CE7"
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Ordine di visualizzazione</label>
                <input type="number" value={gruppoForm.ordine} onChange={e => setGruppoForm(f => ({ ...f, ordine: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={gruppoForm.attivo} onChange={e => setGruppoForm(f => ({ ...f, attivo: e.target.checked }))} />
                Gruppo attivo
              </label>
            </div>

            {gruppoError && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#FFF5F5', borderRadius: '8px', color: '#E53E3E', fontSize: '0.85rem' }}>
                {gruppoError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowGruppoModal(false)}
                style={{ flex: 1, padding: '0.75rem', background: '#F3F0FF', color: '#6C5CE7', border: '2px solid #D6CCFF', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}>
                Annulla
              </button>
              <button onClick={saveGruppo} disabled={savingGruppo}
                style={{ flex: 2, padding: '0.75rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: savingGruppo ? 'default' : 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', opacity: savingGruppo ? 0.7 : 1 }}>
                {savingGruppo ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orario Modal */}
      {showOrarioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 1.5rem', color: '#6C5CE7', fontSize: '1.15rem', fontWeight: 800 }}>
              {editingOrarioId ? 'Modifica orario' : 'Nuovo orario di uscita'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Etichetta *</label>
                <input value={orarioForm.etichetta} onChange={e => setOrarioForm(f => ({ ...f, etichetta: e.target.value }))}
                  placeholder="es. Standard, Anticipo, Posticipo..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Orario</label>
                <input type="time" value={orarioForm.orario} onChange={e => setOrarioForm(f => ({ ...f, orario: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Ordine</label>
                <input type="number" value={orarioForm.ordine} onChange={e => setOrarioForm(f => ({ ...f, ordine: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={orarioForm.attivo} onChange={e => setOrarioForm(f => ({ ...f, attivo: e.target.checked }))} />
                Orario attivo
              </label>
            </div>

            {orarioError && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#FFF5F5', borderRadius: '8px', color: '#E53E3E', fontSize: '0.85rem' }}>
                {orarioError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowOrarioModal(false)}
                style={{ flex: 1, padding: '0.75rem', background: '#F3F0FF', color: '#6C5CE7', border: '2px solid #D6CCFF', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}>
                Annulla
              </button>
              <button onClick={saveOrario} disabled={savingOrario}
                style={{ flex: 2, padding: '0.75rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: savingOrario ? 'default' : 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', opacity: savingOrario ? 0.7 : 1 }}>
                {savingOrario ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
