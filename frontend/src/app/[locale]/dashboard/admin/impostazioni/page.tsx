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

const RUOLI_LABEL: Record<string, string> = {
  coordinatrice: 'Coordinatrice',
  insegnante: 'Insegnante',
  cuoca: 'Cuoca',
  genitore: 'Genitore',
}
const RUOLI = Object.keys(RUOLI_LABEL)

const RISORSE_LABEL: Record<string, string> = {
  bambini:    '👶 Anagrafica bambini',
  consensi:   '📷 Consensi fotografici',
  presenze:   '📅 Presenze',
  diario:     '📖 Diario',
  pappe:      '🥣 Pappe e menu',
  circolari:  '📢 Circolari',
  calendario: '🗓️ Calendario',
  agenda:     '📝 Agenda note',
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

  // Permessi state
  const [permessi, setPermessi] = useState<PermessoRuolo[]>([])
  const [loadingPermessi, setLoadingPermessi] = useState(false)
  const [ruoloSelezionato, setRuoloSelezionato] = useState('coordinatrice')
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

  const fetchPermessi = useCallback(async () => {
    setLoadingPermessi(true)
    const res = await fetch('/api/config/permessi')
    if (res.ok) {
      const data = await res.json()
      setPermessi(Array.isArray(data) ? data : data.results ?? [])
    }
    setLoadingPermessi(false)
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
  useEffect(() => { if (activeTab === 'permessi' && permessi.length === 0) fetchPermessi() }, [activeTab, fetchPermessi, permessi.length])

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
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(108,92,231,0.08)' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700, color: '#444' }}>Permessi granulari per ruolo</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>
                Admin e Direttrice hanno sempre accesso completo. Le modifiche sono immediate.
              </p>
            </div>

            {/* Selettore ruolo */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {RUOLI.map(r => (
                <button
                  key={r}
                  onClick={() => setRuoloSelezionato(r)}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '20px',
                    border: '2px solid #D6CCFF',
                    background: ruoloSelezionato === r ? '#6C5CE7' : 'white',
                    color: ruoloSelezionato === r ? 'white' : '#6C5CE7',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                  }}
                >
                  {RUOLI_LABEL[r]}
                </button>
              ))}
            </div>

            {loadingPermessi ? (
              <div style={{ color: '#999', padding: '1rem 0' }}>Caricamento...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {Object.entries(RISORSE_LABEL).map(([risorsa, risorsaLabel]) => {
                  const rigaPermessi = AZIONI.map(({ key: azione }) =>
                    permessi.find(p => p.ruolo === ruoloSelezionato && p.risorsa === risorsa && p.azione === azione)
                  )
                  return (
                    <div key={risorsa} style={{
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '0.75rem 1rem', borderRadius: '10px',
                      background: '#FAFAFA', border: '1px solid #EEE',
                      flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: 1, minWidth: 160, fontWeight: 600, fontSize: '0.875rem', color: '#333' }}>
                        {risorsaLabel}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {AZIONI.map(({ key: azione, label, color }, idx) => {
                          const p = rigaPermessi[idx]
                          if (!p) return null
                          const attivo = p.consentito
                          const saving = savingPermesso === p.id
                          return (
                            <button
                              key={azione}
                              onClick={() => !saving && togglePermesso(p)}
                              disabled={saving}
                              title={label}
                              style={{
                                padding: '0.3rem 0.75rem',
                                borderRadius: '20px',
                                border: `2px solid ${attivo ? color : '#DDD'}`,
                                background: attivo ? color : 'white',
                                color: attivo ? 'white' : '#999',
                                fontWeight: 700,
                                cursor: saving ? 'default' : 'pointer',
                                fontSize: '0.75rem',
                                fontFamily: 'inherit',
                                opacity: saving ? 0.5 : 1,
                                transition: 'all 0.15s',
                              }}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
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
