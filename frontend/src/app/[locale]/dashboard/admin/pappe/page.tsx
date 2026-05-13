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

interface Piatto {
  id: number
  descrizione: string
  tipo: string
  tipo_label: string
  note: string
  attivo: boolean
}

interface Assegnazione {
  id: number
  piatto: number
  piatto_descrizione: string
  piatto_tipo: string
  gruppi: number[]
  gruppi_nomi: string[]
  sempre: boolean
  giorni_per_settimana: Record<string, number[]>
}

interface Sostituzione {
  id: number
  gruppi: number[]
  gruppi_nomi: string[]
  data: string
  tipo: string
  tipo_label: string
  descrizione: string
  note: string
}

interface ConfigCiclo {
  id?: number
  data_inizio_ciclo: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPI_PIATTO = [
  { value: 'colazione', label: 'Colazione', color: '#F39C12' },
  { value: 'primo', label: 'Primo', color: '#E17055' },
  { value: 'secondo', label: 'Secondo', color: '#D63031' },
  { value: 'monopiatto', label: 'Monopiatto', color: '#6C5CE7' },
  { value: 'contorno', label: 'Contorno', color: '#00B894' },
  { value: 'pane', label: 'Pane', color: '#FDCB6E' },
  { value: 'frutta', label: 'Frutta', color: '#00CEC9' },
  { value: 'merenda', label: 'Merenda', color: '#A29BFE' },
]

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']

const TIPO_COLOR: Record<string, string> = Object.fromEntries(TIPI_PIATTO.map(t => [t.value, t.color]))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tipoColor(tipo: string) {
  return TIPO_COLOR[tipo] ?? '#888'
}

function fmt(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── Tab: Configurazione Ciclo ────────────────────────────────────────────────

function TabConfig({ gruppi }: { gruppi: Gruppo[] }) {
  const [config, setConfig] = useState<ConfigCiclo | null>(null)
  const [dataInput, setDataInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/pappe/config')
      .then(r => r.json())
      .then(d => {
        if (d && d.data_inizio_ciclo) {
          setConfig(d)
          setDataInput(d.data_inizio_ciclo)
        }
      })
  }, [])

  const salva = async () => {
    setSaving(true); setMsg('')
    const res = await fetch('/api/pappe/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_inizio_ciclo: dataInput }),
    })
    if (res.ok) {
      const d = await res.json()
      setConfig(d)
      setMsg('✓ Configurazione salvata')
    } else {
      setMsg('Errore nel salvataggio.')
    }
    setSaving(false)
  }

  // Preview settimane per le prossime 5 dalla data impostata
  const preview = () => {
    if (!dataInput) return []
    const start = new Date(dataInput)
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i * 7)
      return `Sett. ${i + 1}: ${d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}`
    })
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 1rem', color: '#333', fontSize: '1rem', fontWeight: 700 }}>
        ⚙️ Configurazione Menu Ciclico
      </h3>
      <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        Imposta il lunedì della settimana 1 del ciclo. Il sistema calcola automaticamente
        la settimana corrente (1–5) per qualsiasi data futura.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '0.3rem' }}>
            Lunedì settimana 1
          </label>
          <input
            type="date"
            value={dataInput}
            onChange={e => setDataInput(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '2px solid #D6CCFF', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}
          />
        </div>
        <button
          onClick={salva}
          disabled={saving || !dataInput}
          style={{ padding: '0.5rem 1.25rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
        >
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>

      {msg && (
        <div style={{ padding: '0.5rem 0.875rem', background: msg.startsWith('✓') ? '#F0FFF4' : '#FADBD8', color: msg.startsWith('✓') ? '#276749' : '#C0392B', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {msg}
        </div>
      )}

      {dataInput && (
        <div style={{ background: '#F3F0FF', borderRadius: '12px', padding: '1rem', marginTop: '0.5rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#6C5CE7' }}>
            Preview ciclo
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {preview().map((s, i) => (
              <span key={i} style={{ background: 'white', border: '1.5px solid #D6CCFF', borderRadius: '8px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', color: '#555' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#FFFAF0', borderRadius: '10px', border: '1px solid #FED7AA', fontSize: '0.825rem', color: '#744210' }}>
        <strong>Come funziona il ciclo:</strong> Il menu si ripete ogni 5 settimane.
        La settimana corrente viene calcolata automaticamente in base alla data impostata sopra.
        Puoi cambiare la data di partenza in qualsiasi momento — il calcolo si ricalibra immediatamente.
      </div>
    </div>
  )
}

// ─── Tab: Piatti ──────────────────────────────────────────────────────────────

function TabPiatti() {
  const [piatti, setPiatti] = useState<Piatto[]>([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ descrizione: '', tipo: 'primo', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/pappe/piatti')
    if (res.ok) { const d = await res.json(); setPiatti(d.results ?? d) }
  }, [])

  useEffect(() => { load() }, [load])

  const salva = async () => {
    setSaving(true); setError('')
    const method = editId ? 'PATCH' : 'POST'
    const url = editId ? `/api/pappe/piatti/${editId}` : '/api/pappe/piatti'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      await load()
      setShowForm(false)
      setEditId(null)
      setForm({ descrizione: '', tipo: 'primo', note: '' })
    } else {
      const d = await res.json()
      setError(Object.values(d).flat().join(' '))
    }
    setSaving(false)
  }

  const disattiva = async (id: number) => {
    if (!confirm('Disattivare questo piatto? Rimarrà visibile negli storici.')) return
    await fetch(`/api/pappe/piatti/${id}`, { method: 'DELETE' })
    await load()
  }

  const startEdit = (p: Piatto) => {
    setEditId(p.id)
    setForm({ descrizione: p.descrizione, tipo: p.tipo, note: p.note })
    setShowForm(true)
  }

  const filtered = filtroTipo ? piatti.filter(p => p.tipo === filtroTipo) : piatti
  const attivi = filtered.filter(p => p.attivo)
  const disattivati = filtered.filter(p => !p.attivo)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: 700 }}>🍽️ Catalogo Piatti</h3>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ descrizione: '', tipo: 'primo', note: '' }) }}
          style={{ padding: '0.4rem 1rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer' }}
        >
          + Nuovo piatto
        </button>
      </div>

      {/* Filtro tipo */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button onClick={() => setFiltroTipo('')} style={filterChip(filtroTipo === '')}>Tutti</button>
        {TIPI_PIATTO.map(t => (
          <button key={t.value} onClick={() => setFiltroTipo(t.value)} style={filterChip(filtroTipo === t.value, t.color)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Form nuovo/modifica */}
      {showForm && (
        <div style={{ background: '#F3F0FF', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.875rem', fontSize: '0.9rem', color: '#6C5CE7' }}>
            {editId ? 'Modifica piatto' : 'Nuovo piatto'}
          </h4>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inputStyle}>
                {TIPI_PIATTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={labelStyle}>Descrizione</label>
              <input
                value={form.descrizione}
                onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && salva()}
                placeholder="es. Pasta al pomodoro"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={labelStyle}>Note (opz.)</label>
              <input
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Note allergie, varianti..."
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={salva} disabled={saving || !form.descrizione} style={saveBtn}>
              {saving ? '...' : editId ? 'Aggiorna' : 'Crea'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null) }} style={cancelBtn}>✕</button>
          </div>
          {error && <p style={{ margin: '0.5rem 0 0', color: '#C0392B', fontSize: '0.8rem' }}>{error}</p>}
        </div>
      )}

      {/* Lista piatti attivi */}
      {attivi.length === 0 && <p style={{ color: '#aaa', fontSize: '0.875rem' }}>Nessun piatto attivo per questo tipo.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {attivi.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'white', borderRadius: '10px', padding: '0.625rem 0.875rem', border: '1.5px solid #E8E0FF' }}>
            <span style={{ background: `${tipoColor(p.tipo)}22`, color: tipoColor(p.tipo), border: `1px solid ${tipoColor(p.tipo)}55`, borderRadius: '6px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {p.tipo_label}
            </span>
            <span style={{ flex: 1, fontSize: '0.875rem', color: '#333', fontWeight: 600 }}>{p.descrizione}</span>
            {p.note && <span style={{ fontSize: '0.775rem', color: '#888', fontStyle: 'italic' }}>{p.note}</span>}
            <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C5CE7', fontSize: '0.8rem', padding: '2px 6px' }}>✏️</button>
            <button onClick={() => disattiva(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E17055', fontSize: '0.8rem', padding: '2px 6px' }}>🗑</button>
          </div>
        ))}
      </div>

      {/* Disattivati */}
      {disattivati.length > 0 && (
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#aaa' }}>
            {disattivati.length} piatti disattivati
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
            {disattivati.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.5, fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}>
                <span style={{ color: '#888' }}>{p.tipo_label}</span>
                <span style={{ color: '#aaa', textDecoration: 'line-through' }}>{p.descrizione}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ─── Tab: Calendario ─────────────────────────────────────────────────────────

type CalForm = { piatto?: string; sempre: boolean; giorni: Record<string, number[]>; gruppi: number[] }
const EMPTY_CAL_FORM = (): CalForm => ({ piatto: '', sempre: false, giorni: {}, gruppi: [] })

function TabCalendario({ gruppi }: { gruppi: Gruppo[] }) {
  const [selectedGruppo, setSelectedGruppo] = useState<number | null>(gruppi[0]?.id ?? null)
  const [piatti, setPiatti] = useState<Piatto[]>([])
  const [assegnazioni, setAssegnazioni] = useState<Assegnazione[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<CalForm>(EMPTY_CAL_FORM())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<CalForm>(EMPTY_CAL_FORM())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/pappe/piatti?attivo=true').then(r => r.json()).then(d => setPiatti(d.results ?? d))
  }, [])

  const loadAssegnazioni = useCallback(async () => {
    if (!selectedGruppo) return
    const res = await fetch(`/api/pappe/assegnazioni?gruppo=${selectedGruppo}`)
    if (res.ok) { const d = await res.json(); setAssegnazioni(d.results ?? d) }
  }, [selectedGruppo])

  useEffect(() => { loadAssegnazioni() }, [loadAssegnazioni])

  const salvaAssegnazione = async () => {
    if (!addForm.piatto || addForm.gruppi.length === 0) return
    setSaving(true)
    const res = await fetch('/api/pappe/assegnazioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        piatto: parseInt(addForm.piatto),
        gruppi: addForm.gruppi,
        sempre: addForm.sempre,
        giorni_per_settimana: addForm.sempre ? {} : addForm.giorni,
      }),
    })
    if (res.ok) {
      await loadAssegnazioni()
      setShowAddForm(false)
      setAddForm(EMPTY_CAL_FORM())
    }
    setSaving(false)
  }

  const apriEdit = (a: Assegnazione) => {
    setEditingId(a.id)
    setEditForm({ sempre: a.sempre, giorni: { ...a.giorni_per_settimana }, gruppi: [...a.gruppi] })
  }

  const salvaEdit = async () => {
    if (!editingId) return
    setSaving(true)
    const res = await fetch(`/api/pappe/assegnazioni/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gruppi: editForm.gruppi,
        sempre: editForm.sempre,
        giorni_per_settimana: editForm.sempre ? {} : editForm.giorni,
      }),
    })
    if (res.ok) {
      await loadAssegnazioni()
      setEditingId(null)
    }
    setSaving(false)
  }

  const eliminaAssegnazione = async (id: number) => {
    if (!confirm('Eliminare questa assegnazione?')) return
    await fetch(`/api/pappe/assegnazioni/${id}`, { method: 'DELETE' })
    await loadAssegnazioni()
  }

  // Raggruppa assegnazioni per tipo piatto
  const byTipo: Record<string, Assegnazione[]> = {}
  assegnazioni.forEach(a => {
    byTipo[a.piatto_tipo] = [...(byTipo[a.piatto_tipo] ?? []), a]
  })

  const GiornoGrid = ({ form, setter }: { form: CalForm; setter: (fn: (f: CalForm) => CalForm) => void }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {Array.from({ length: 5 }, (_, si) => (
        <div key={si} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 70, fontSize: '0.8rem', color: '#555', fontWeight: 600 }}>Sett. {si + 1}</span>
          {GIORNI.map((g, gi) => {
            const sel = (form.giorni[String(si + 1)] ?? []).includes(gi)
            return (
              <button key={gi} type="button"
                onClick={() => setter(f => { const key = String(si + 1); const curr = f.giorni[key] ?? []; return { ...f, giorni: { ...f.giorni, [key]: curr.includes(gi) ? curr.filter(d => d !== gi) : [...curr, gi] } } })}
                style={{ width: 36, height: 28, background: sel ? '#6C5CE7' : 'white', color: sel ? 'white' : '#888', border: `1.5px solid ${sel ? '#6C5CE7' : '#D6CCFF'}`, borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {g}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )

  const GruppiCheckbox = ({ form, setter }: { form: CalForm; setter: (fn: (f: CalForm) => CalForm) => void }) => (
    <div>
      <label style={labelStyle}>Gruppi</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
        {gruppi.map(g => {
          const sel = form.gruppi.includes(g.id)
          return (
            <button key={g.id} type="button"
              onClick={() => setter(f => ({ ...f, gruppi: f.gruppi.includes(g.id) ? f.gruppi.filter(x => x !== g.id) : [...f.gruppi, g.id] }))}
              style={{ padding: '0.3rem 0.75rem', background: sel ? g.colore : 'white', color: sel ? 'white' : '#555', border: `2px solid ${g.colore}`, borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {g.nome}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div>
      <h3 style={{ margin: '0 0 1rem', color: '#333', fontSize: '1rem', fontWeight: 700 }}>
        📅 Calendario Ciclo — 5 Settimane
      </h3>

      {/* Selettore gruppo (solo per visualizzazione) */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {gruppi.map(g => (
          <button key={g.id} onClick={() => setSelectedGruppo(g.id)}
            style={{ padding: '0.4rem 0.875rem', background: selectedGruppo === g.id ? g.colore : 'white', color: selectedGruppo === g.id ? 'white' : '#555', border: `2px solid ${g.colore}`, borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {g.nome}
          </button>
        ))}
      </div>

      {!selectedGruppo ? (
        <p style={{ color: '#aaa', fontSize: '0.875rem' }}>Seleziona un gruppo per vedere il calendario.</p>
      ) : (
        <>
          {/* Lista assegnazioni */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {assegnazioni.length === 0 && (
              <p style={{ color: '#aaa', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem' }}>
                Nessun piatto assegnato a questo gruppo. Clicca &quot;+ Assegna piatto&quot; per iniziare.
              </p>
            )}
            {TIPI_PIATTO.map(tipo => {
              const list = byTipo[tipo.value] ?? []
              if (list.length === 0) return null
              return (
                <div key={tipo.value}>
                  <p style={{ margin: '0.5rem 0 0.25rem', fontSize: '0.775rem', fontWeight: 700, color: tipo.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {tipo.label}
                  </p>
                  {list.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', background: 'white', borderRadius: '10px', padding: '0.625rem 0.875rem', border: '1.5px solid #E8E0FF', marginBottom: '0.375rem' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, color: '#333', fontSize: '0.875rem' }}>{a.piatto_descrizione}</span>
                        <div style={{ marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {/* Gruppi */}
                          {a.gruppi_nomi.map(n => (
                            <span key={n} style={{ background: '#F3F0FF', color: '#6C5CE7', border: '1px solid #D6CCFF', borderRadius: '6px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: 600 }}>{n}</span>
                          ))}
                          {/* Giorni / sempre */}
                          {a.sempre ? (
                            <span style={{ background: '#00B89422', color: '#00B894', border: '1px solid #00B89455', borderRadius: '6px', padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700 }}>ogni giorno</span>
                          ) : (
                            Object.entries(a.giorni_per_settimana).map(([sett, giorni]) =>
                              (giorni as number[]).map(g => (
                                <span key={`${sett}-${g}`} style={{ background: '#EEF2FF', color: '#555', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem' }}>
                                  S{sett}/{GIORNI[g]}
                                </span>
                              ))
                            )
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                        <button onClick={() => apriEdit(a)} style={{ background: '#F3F0FF', border: 'none', color: '#6C5CE7', cursor: 'pointer', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>✏️</button>
                        <button onClick={() => eliminaAssegnazione(a.id)} style={{ background: '#FFF0EE', border: 'none', color: '#E17055', cursor: 'pointer', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          <button onClick={() => { setShowAddForm(!showAddForm); setAddForm({ ...EMPTY_CAL_FORM(), gruppi: selectedGruppo ? [selectedGruppo] : [] }) }}
            style={{ padding: '0.5rem 1rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer', marginBottom: '1rem' }}>
            + Assegna piatto
          </button>

          {/* Form aggiungi */}
          {showAddForm && (
            <div style={{ background: '#F3F0FF', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#6C5CE7' }}>Assegna piatto al ciclo</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label style={labelStyle}>Piatto</label>
                  <select value={addForm.piatto} onChange={e => setAddForm(f => ({ ...f, piatto: e.target.value }))} style={inputStyle}>
                    <option value="">— seleziona —</option>
                    {TIPI_PIATTO.map(tipo => (
                      <optgroup key={tipo.value} label={tipo.label}>
                        {piatti.filter(p => p.tipo === tipo.value).map(p => (
                          <option key={p.id} value={p.id}>{p.descrizione}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <GruppiCheckbox form={addForm} setter={setAddForm} />

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: '#555', cursor: 'pointer' }}>
                  <input type="checkbox" checked={addForm.sempre} onChange={e => setAddForm(f => ({ ...f, sempre: e.target.checked }))} />
                  Ogni giorno (es. pane, acqua)
                </label>

                {!addForm.sempre && (
                  <div>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#555', fontWeight: 600 }}>Settimana e giorno:</p>
                    <GiornoGrid form={addForm} setter={setAddForm} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={salvaAssegnazione} disabled={saving || !addForm.piatto || addForm.gruppi.length === 0} style={saveBtn}>
                  {saving ? '...' : 'Assegna'}
                </button>
                <button onClick={() => setShowAddForm(false)} style={cancelBtn}>Annulla</button>
              </div>
            </div>
          )}

          {/* Modal modifica */}
          {editingId !== null && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', maxWidth: 480, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
                <h4 style={{ margin: '0 0 1.25rem', fontSize: '1rem', color: '#333' }}>Modifica assegnazione</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <GruppiCheckbox form={editForm} setter={setEditForm} />

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: '#555', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editForm.sempre} onChange={e => setEditForm(f => ({ ...f, sempre: e.target.checked }))} />
                    Ogni giorno
                  </label>

                  {!editForm.sempre && (
                    <div>
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#555', fontWeight: 600 }}>Settimana e giorno:</p>
                      <GiornoGrid form={editForm} setter={setEditForm} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button onClick={salvaEdit} disabled={saving || editForm.gruppi.length === 0} style={saveBtn}>
                    {saving ? '...' : 'Salva'}
                  </button>
                  <button onClick={() => setEditingId(null)} style={cancelBtn}>Annulla</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Tab: Sostituzioni ────────────────────────────────────────────────────────

function TabSostituzioni({ gruppi }: { gruppi: Gruppo[] }) {
  const [sostituzioni, setSostituzioni] = useState<Sostituzione[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ data: '', tipo: 'primo', descrizione: '', note: '', gruppi: [] as number[] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/pappe/sostituzioni')
    if (res.ok) { const d = await res.json(); setSostituzioni(d.results ?? d) }
  }, [])

  useEffect(() => { load() }, [load])

  const salva = async () => {
    setSaving(true); setError('')
    const res = await fetch('/api/pappe/sostituzioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      await load()
      setShowForm(false)
      setForm({ data: '', tipo: 'primo', descrizione: '', note: '', gruppi: [] })
    } else {
      const d = await res.json()
      setError(Object.values(d).flat().join(' '))
    }
    setSaving(false)
  }

  const elimina = async (id: number) => {
    if (!confirm('Eliminare questa sostituzione?')) return
    await fetch(`/api/pappe/sostituzioni/${id}`, { method: 'DELETE' })
    await load()
  }

  const toggleGruppo = (id: number) => {
    setForm(f => ({
      ...f,
      gruppi: f.gruppi.includes(id) ? f.gruppi.filter(g => g !== id) : [...f.gruppi, id],
    }))
  }

  // Raggruppa per data
  const byData: Record<string, Sostituzione[]> = {}
  sostituzioni.forEach(s => {
    byData[s.data] = [...(byData[s.data] ?? []), s]
  })
  const dateOrdinate = Object.keys(byData).sort().reverse()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: 700 }}>🔄 Sostituzioni Giornaliere</h3>
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '0.4rem 1rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer' }}
        >
          + Nuova sostituzione
        </button>
      </div>

      <p style={{ color: '#666', fontSize: '0.825rem', marginBottom: '1rem' }}>
        Una sostituzione rimpiazza tutti i piatti di quel tipo per la data e i gruppi indicati.
        Utile per variazioni al menu (es. menu alternativo per allergie, piatto straordinario).
      </p>

      {showForm && (
        <div style={{ background: '#F3F0FF', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', color: '#6C5CE7' }}>Nuova sostituzione</h4>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tipo portata</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inputStyle}>
                {TIPI_PIATTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Piatto sostitutivo</label>
              <input value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="es. Risotto allo zafferano" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Gruppi coinvolti (nessuna selezione = tutti i gruppi)</label>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
              {gruppi.map(g => {
                const sel = form.gruppi.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGruppo(g.id)}
                    style={{ padding: '0.25rem 0.75rem', background: sel ? g.colore : 'white', color: sel ? 'white' : '#555', border: `2px solid ${g.colore}`, borderRadius: '8px', fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {g.nome}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ marginBottom: '0.875rem' }}>
            <label style={labelStyle}>Note (opz.)</label>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Note aggiuntive..." style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          </div>
          {error && <p style={{ margin: '0 0 0.5rem', color: '#C0392B', fontSize: '0.8rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={salva} disabled={saving || !form.data || !form.descrizione} style={saveBtn}>
              {saving ? '...' : 'Crea sostituzione'}
            </button>
            <button onClick={() => setShowForm(false)} style={cancelBtn}>Annulla</button>
          </div>
        </div>
      )}

      {dateOrdinate.length === 0 && <p style={{ color: '#aaa', fontSize: '0.875rem' }}>Nessuna sostituzione configurata.</p>}

      {dateOrdinate.map(data => (
        <div key={data} style={{ marginBottom: '0.875rem' }}>
          <p style={{ margin: '0 0 0.375rem', fontSize: '0.8rem', fontWeight: 700, color: '#555' }}>{fmt(data)}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {byData[data].map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'white', borderRadius: '10px', padding: '0.625rem 0.875rem', border: '1.5px solid #E8E0FF' }}>
                <span style={{ background: `${tipoColor(s.tipo)}22`, color: tipoColor(s.tipo), borderRadius: '6px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {s.tipo_label}
                </span>
                <span style={{ flex: 1, fontWeight: 600, color: '#333', fontSize: '0.875rem' }}>{s.descrizione}</span>
                <span style={{ fontSize: '0.775rem', color: '#888' }}>
                  {s.gruppi_nomi.length > 0 ? s.gruppi_nomi.join(', ') : 'Tutti i gruppi'}
                </span>
                <button onClick={() => elimina(s.id)} style={{ background: 'none', border: 'none', color: '#E17055', cursor: 'pointer', fontSize: '0.85rem' }}>🗑</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPappePage() {
  const router = useRouter()
  const locale = useLocale()
  const [tab, setTab] = useState<'config' | 'piatti' | 'calendario' | 'sostituzioni'>('piatti')
  const [gruppi, setGruppi] = useState<Gruppo[]>([])

  useEffect(() => {
    fetch('/api/config/gruppi').then(r => r.json()).then(d => setGruppi(d.results ?? d))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F0FF' }}>
      <div style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(1080px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button onClick={() => router.push(`/${locale}/dashboard/admin`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}>
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>🍽️ Gestione Menu</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            Menu ciclico 5 settimane — catalogo piatti e calendario
          </p>
          <div style={{ marginTop: '0.75rem' }}>
            <button
              onClick={() => window.open('/api/pappe/export-pdf', '_blank')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              📄 Esporta menu PDF (settimana corrente)
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', background: 'white', borderRadius: '12px', padding: '0.375rem', boxShadow: '0 2px 8px rgba(108,92,231,0.08)' }}>
          {([
            { key: 'piatti', label: '🍽️ Piatti' },
            { key: 'calendario', label: '📅 Calendario' },
            { key: 'sostituzioni', label: '🔄 Sostituzioni' },
            { key: 'config', label: '⚙️ Ciclo' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '0.5rem 0.25rem',
                background: tab === t.key ? '#6C5CE7' : 'transparent',
                color: tab === t.key ? 'white' : '#888',
                border: 'none', borderRadius: '8px',
                fontFamily: 'inherit', fontWeight: 600, fontSize: '0.825rem',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(108,92,231,0.06)' }}>
          {tab === 'config' && <TabConfig gruppi={gruppi} />}
          {tab === 'piatti' && <TabPiatti />}
          {tab === 'calendario' && <TabCalendario gruppi={gruppi} />}
          {tab === 'sostituzioni' && <TabSostituzioni gruppi={gruppi} />}
        </div>
      </div>
    </div>
  )
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#555', marginBottom: '0.25rem',
}

const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.625rem', border: '1.5px solid #D6CCFF', borderRadius: '7px',
  fontSize: '0.825rem', fontFamily: 'inherit', outline: 'none',
}

const saveBtn: React.CSSProperties = {
  padding: '0.4rem 1rem', background: '#6C5CE7', color: 'white',
  border: 'none', borderRadius: '7px', fontFamily: 'inherit',
  fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer',
}

const cancelBtn: React.CSSProperties = {
  padding: '0.4rem 0.875rem', background: 'white', color: '#888',
  border: '1.5px solid #DDD', borderRadius: '7px', fontFamily: 'inherit',
  fontSize: '0.825rem', cursor: 'pointer',
}

const thStyle: React.CSSProperties = {
  padding: '0.4rem 0.5rem', background: '#F3F0FF', textAlign: 'center',
  border: '1px solid #E8E0FF', fontSize: '0.775rem', fontWeight: 600, color: '#555',
}

const tdStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem', border: '1px solid #F0ECFF', fontSize: '0.8rem',
}

function filterChip(active: boolean, color?: string): React.CSSProperties {
  return {
    padding: '0.25rem 0.75rem',
    background: active ? (color ?? '#6C5CE7') : 'white',
    color: active ? 'white' : (color ?? '#555'),
    border: `1.5px solid ${color ?? '#D6CCFF'}`,
    borderRadius: '20px', fontSize: '0.775rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
