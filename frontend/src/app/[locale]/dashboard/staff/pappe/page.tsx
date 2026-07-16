'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Allergia {
  id: number
  tipo_label: string
  descrizione: string
  gravita: string
  gravita_label: string
}

interface PiattoRef {
  id: number
  descrizione: string
  tipo: string
  tipo_label?: string
}

interface PreferenzaMenu {
  id: number
  tipo: string
  tipo_label: string
  descrizione: string
  piatti_alternativi: PiattoRef[]
}

interface BambinoInfo {
  id: number
  nome: string
  cognome: string
  sezione: string
  gruppo_id: number | null
  allergie: Allergia[]
  ha_allergie_gravi: boolean
  preferenza_menu: PreferenzaMenu | null
}

interface RegistroPasto {
  id: number
  colazione_quantita: string
  primo_quantita: string
  secondo_quantita: string
  monopiatto_quantita: string
  contorno_quantita: string
  pane_quantita: string
  frutta_quantita: string
  merenda_quantita: string
  note_pasto: string
  tipo_menu: string
  piatti_serviti: number[]
  piatti_serviti_dettaglio: PiattoRef[]
}

interface GiornataEntry {
  bambino: BambinoInfo
  registro: RegistroPasto | null
}

interface PiattoMenu {
  id: number | null
  descrizione: string
  tipo: string
  note?: string
  is_sostituzione?: boolean
}

interface MenuGiorno {
  settimana_ciclo: number | null
  piatti: Record<string, PiattoMenu[]>
}

interface Gruppo {
  id: number
  nome: string
  colore: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUANTITA_OPTIONS = [
  { value: '', label: '—' },
  { value: 'tutto', label: 'Tutto' },
  { value: 'meta', label: 'Metà' },
  { value: 'poco', label: 'Poco' },
  { value: 'nulla', label: 'Nulla' },
]

const QUANTITA_BG: Record<string, string> = {
  tutto: '#D5F5E3', meta: '#FEF9E7', poco: '#FDEBD0', nulla: '#FADBD8',
}

const PORTATE: { key: string; label: string }[] = [
  { key: 'colazione_quantita', label: 'Colaz.' },
  { key: 'primo_quantita', label: 'Primo' },
  { key: 'secondo_quantita', label: 'Secondo' },
  { key: 'monopiatto_quantita', label: 'Mono' },
  { key: 'contorno_quantita', label: 'Contorno' },
  { key: 'pane_quantita', label: 'Pane' },
  { key: 'frutta_quantita', label: 'Frutta' },
  { key: 'merenda_quantita', label: 'Merenda' },
]

const TIPO_COLOR: Record<string, string> = {
  colazione: '#F39C12', primo: '#E17055', secondo: '#D63031',
  monopiatto: '#6C5CE7', contorno: '#00B894', pane: '#FDCB6E',
  frutta: '#00CEC9', merenda: '#A29BFE',
}

interface PastoForm {
  colazione_quantita: string
  primo_quantita: string
  secondo_quantita: string
  monopiatto_quantita: string
  contorno_quantita: string
  pane_quantita: string
  frutta_quantita: string
  merenda_quantita: string
  note_pasto: string
  tipo_menu: string
  piatti_serviti: number[]
}

function emptyForm(): PastoForm {
  return {
    colazione_quantita: '', primo_quantita: '', secondo_quantita: '',
    monopiatto_quantita: '', contorno_quantita: '', pane_quantita: '',
    frutta_quantita: '', merenda_quantita: '', note_pasto: '', tipo_menu: '',
    piatti_serviti: [],
  }
}

function formStr(form: PastoForm, key: string): string {
  return (form as unknown as Record<string, string>)[key] ?? ''
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

// ─── MenuBanner ───────────────────────────────────────────────────────────────

function MenuBanner({ menu, gruppoNome }: { menu: MenuGiorno; gruppoNome: string }) {
  const piatti = menu.piatti
  const settimana = menu.settimana_ciclo

  const tipiConPiatti = Object.entries(piatti).filter(([, list]) => list.length > 0)

  if (tipiConPiatti.length === 0) {
    return (
      <div style={{ background: '#FFF9E6', borderRadius: '12px', padding: '0.875rem 1.25rem', marginBottom: '1rem', border: '1.5px solid #FED7AA', fontSize: '0.825rem', color: '#744210' }}>
        ℹ️ Nessun menu configurato per {gruppoNome} in questa data.
        {!settimana && ' (Ciclo non configurato — vai in Admin → Menu)'}
      </div>
    )
  }

  return (
    <div style={{ background: 'white', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(9,132,227,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <p style={{ margin: 0, fontWeight: 700, color: '#333', fontSize: '0.875rem' }}>
          📋 Menu del giorno — {gruppoNome}
        </p>
        {settimana && (
          <span style={{ background: '#EAF4FF', color: '#0984E3', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
            Settimana {settimana}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {tipiConPiatti.map(([tipo, list]) => (
          list.map((p, i) => (
            <span
              key={`${tipo}-${i}`}
              style={{
                background: `${TIPO_COLOR[tipo] ?? '#888'}18`,
                color: TIPO_COLOR[tipo] ?? '#888',
                border: `1px solid ${TIPO_COLOR[tipo] ?? '#888'}44`,
                borderRadius: '8px', padding: '0.2rem 0.625rem',
                fontSize: '0.775rem', fontWeight: 600,
              }}
            >
              {p.is_sostituzione && '🔄 '}{p.descrizione}
            </span>
          ))
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPappePage() {
  const router = useRouter()
  const locale = useLocale()

  const [dataStr, setDataStr] = useState(todayISO())
  const [gruppi, setGruppi] = useState<Gruppo[]>([])
  const [selectedGruppo, setSelectedGruppo] = useState<number | null>(null)
  const [entries, setEntries] = useState<GiornataEntry[]>([])
  const [menu, setMenu] = useState<MenuGiorno | null>(null)
  const [forms, setForms] = useState<Record<number, PastoForm>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState('')
  const [catalogoPiatti, setCatalogoPiatti] = useState<PiattoRef[]>([])
  const [gestioneBambino, setGestioneBambino] = useState<BambinoInfo | null>(null)
  const [gestioneForm, setGestioneForm] = useState<{ tipo: string; descrizione: string; piatti: number[] }>({ tipo: 'differente', descrizione: '', piatti: [] })
  const [gestioneSaving, setGestioneSaving] = useState(false)
  const [gestioneError, setGestioneError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d?.role) setUserRole(d.role) }).catch(() => {})
  }, [])

  // Carica gruppi e catalogo piatti una volta sola
  useEffect(() => {
    fetch('/api/config/gruppi')
      .then(r => r.json())
      .then(d => {
        const list: Gruppo[] = d.results ?? d
        setGruppi(list)
        if (list.length > 0) setSelectedGruppo(list[0].id)
      })
    fetch('/api/pappe/piatti')
      .then(r => r.json())
      .then(d => setCatalogoPiatti((d.results ?? d) as PiattoRef[]))
      .catch(() => {})
  }, [])

  const fetchGiornata = useCallback(async () => {
    if (!selectedGruppo) return
    setLoading(true); setError('')
    try {
      const [giornataRes, menuRes] = await Promise.all([
        fetch(`/api/meals/pasti/giornata?data=${dataStr}&gruppo=${selectedGruppo}`),
        fetch(`/api/pappe/piatti/menu-giorno?data=${dataStr}&gruppo=${selectedGruppo}`),
      ])
      if (giornataRes.status === 401) { router.push(`/${locale}/login`); return }
      if (!giornataRes.ok) throw new Error()

      const giornata: GiornataEntry[] = await giornataRes.json()
      setEntries(giornata)

      if (menuRes.ok) {
        setMenu(await menuRes.json())
      } else {
        setMenu(null)
      }

      const newForms: Record<number, PastoForm> = {}
      for (const e of giornata) {
        newForms[e.bambino.id] = e.registro ? {
          colazione_quantita: e.registro.colazione_quantita,
          primo_quantita: e.registro.primo_quantita,
          secondo_quantita: e.registro.secondo_quantita,
          monopiatto_quantita: e.registro.monopiatto_quantita,
          contorno_quantita: e.registro.contorno_quantita,
          pane_quantita: e.registro.pane_quantita,
          frutta_quantita: e.registro.frutta_quantita,
          merenda_quantita: e.registro.merenda_quantita,
          note_pasto: e.registro.note_pasto,
          tipo_menu: e.registro.tipo_menu ?? '',
          piatti_serviti: e.registro.piatti_serviti ?? (e.registro.piatti_serviti_dettaglio ?? []).map(p => p.id),
        } : emptyForm()
      }
      setForms(newForms)
    } catch {
      setError('Errore nel caricamento.')
    } finally {
      setLoading(false)
    }
  }, [dataStr, selectedGruppo, locale, router])

  useEffect(() => {
    if (selectedGruppo) fetchGiornata()
  }, [fetchGiornata, selectedGruppo])

  const handleFieldChange = (bambinoId: number, field: string, value: string) => {
    setForms(prev => ({ ...prev, [bambinoId]: { ...(prev[bambinoId] ?? emptyForm()), [field]: value } as PastoForm }))
  }

  const togglePiattoServito = (bambinoId: number, piattoId: number) => {
    setForms(prev => {
      const current = prev[bambinoId] ?? emptyForm()
      const has = current.piatti_serviti.includes(piattoId)
      const piatti_serviti = has ? current.piatti_serviti.filter(id => id !== piattoId) : [...current.piatti_serviti, piattoId]
      return { ...prev, [bambinoId]: { ...current, piatti_serviti } }
    })
  }

  const apriGestionePreferenza = (bambino: BambinoInfo) => {
    setGestioneBambino(bambino)
    setGestioneError('')
    setGestioneForm(bambino.preferenza_menu ? {
      tipo: bambino.preferenza_menu.tipo,
      descrizione: bambino.preferenza_menu.descrizione,
      piatti: bambino.preferenza_menu.piatti_alternativi.map(p => p.id),
    } : { tipo: 'differente', descrizione: '', piatti: [] })
  }

  const salvaGestionePreferenza = async () => {
    if (!gestioneBambino) return
    setGestioneSaving(true); setGestioneError('')
    try {
      const existingId = gestioneBambino.preferenza_menu?.id
      const payload = {
        bambino: gestioneBambino.id,
        tipo: gestioneForm.tipo,
        descrizione: gestioneForm.descrizione,
        piatti_alternativi: gestioneForm.piatti,
        attivo: true,
      }
      const res = await fetch(existingId ? `/api/pappe/preferenze-menu/${existingId}` : '/api/pappe/preferenze-menu', {
        method: existingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setGestioneError(d.detail || JSON.stringify(d) || 'Errore di salvataggio.'); return }
      setGestioneBambino(null)
      await fetchGiornata()
    } catch {
      setGestioneError('Errore di rete.')
    } finally {
      setGestioneSaving(false)
    }
  }

  const eliminaGestionePreferenza = async () => {
    if (!gestioneBambino?.preferenza_menu?.id) return
    setGestioneSaving(true); setGestioneError('')
    try {
      const res = await fetch(`/api/pappe/preferenze-menu/${gestioneBambino.preferenza_menu.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) { setGestioneError('Errore durante l\'eliminazione.'); return }
      setGestioneBambino(null)
      await fetchGiornata()
    } catch {
      setGestioneError('Errore di rete.')
    } finally {
      setGestioneSaving(false)
    }
  }

  const handleSalva = async () => {
    setSaving(true); setSaved(false); setError('')
    try {
      const pasti = entries.map(e => ({ bambino: e.bambino.id, ...forms[e.bambino.id] }))
      const res = await fetch('/api/meals/pasti/salva-sezione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataStr, pasti }),
      })
      if (!res.ok) { setError('Errore durante il salvataggio.'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await fetchGiornata()
    } finally {
      setSaving(false)
    }
  }

  const compilati = entries.filter(e => e.registro !== null).length
  const gruppoSelezionato = gruppi.find(g => g.id === selectedGruppo)

  // Determina le portate visibili dal menu (mostra solo quelle con piatti, + sempre primo/secondo)
  const portateVisibili = PORTATE.filter(p => {
    if (!menu) return true
    const tipo = p.key.replace('_quantita', '')
    return (menu.piatti[tipo]?.length ?? 0) > 0 || ['primo', 'secondo'].includes(tipo)
  })

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EAF4FF' }}>

      <div style={{ background: 'linear-gradient(135deg, #0984E3 0%, #0652DD 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(1080px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button onClick={() => router.push(['admin', 'direttrice'].includes(userRole) ? `/${locale}/dashboard/admin` : `/${locale}/dashboard/staff`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}>
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>🥣 Foglio Pappe</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
            {compilati}/{entries.length} bambini compilati
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'min(1080px, 96vw)', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Filtri */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(9,132,227,0.08)', display: 'flex', gap: '0.875rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={lblStyle}>Data</label>
            <input type="date" value={dataStr} onChange={e => setDataStr(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '2px solid #E8F4FD', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={lblStyle}>Gruppo</label>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {gruppi.map(g => (
                <button key={g.id} onClick={() => setSelectedGruppo(g.id)}
                  style={{ padding: '0.4rem 0.875rem', background: selectedGruppo === g.id ? g.colore : 'white', color: selectedGruppo === g.id ? 'white' : '#555', border: `2px solid ${g.colore}`, borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {g.nome}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        {/* Menu del giorno */}
        {menu && gruppoSelezionato && (
          <MenuBanner menu={menu} gruppoNome={gruppoSelezionato.nome} />
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#0984E3', fontWeight: 600 }}>Caricamento...</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👶</div>
            <p style={{ margin: 0 }}>Nessun bambino trovato per questo gruppo.</p>
          </div>
        ) : (
          <>
            {/* Tabella pappe */}
            <div style={{ background: 'white', borderRadius: '16px', overflow: 'auto', boxShadow: '0 4px 16px rgba(9,132,227,0.08)', marginBottom: '1.25rem' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: '#EAF4FF', borderBottom: '2px solid #BDE0FF' }}>
                    <th style={thStyle}>Bambino</th>
                    {portateVisibili.map(p => (
                      <th key={p.key} style={{ ...thStyle, width: 72 }}>
                        <span style={{ color: TIPO_COLOR[p.key.replace('_quantita', '')] ?? '#0984E3' }}>{p.label}</span>
                        {menu && (menu.piatti[p.key.replace('_quantita', '')] ?? []).length > 0 && (
                          <div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 400, lineHeight: 1.1, marginTop: 2 }}>
                            {menu.piatti[p.key.replace('_quantita', '')].map(p2 => p2.descrizione).join(', ').slice(0, 20)}
                          </div>
                        )}
                      </th>
                    ))}
                    <th style={{ ...thStyle, minWidth: 120 }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => {
                    const { bambino } = entry
                    const form = forms[bambino.id] ?? emptyForm()
                    // Tipo menu effettivo: override giornaliero > preferenza permanente > standard
                    const tipoEffettivo = form.tipo_menu || bambino.preferenza_menu?.tipo || 'standard'
                    const isMonopiatto = tipoEffettivo === 'monopiatto'
                    const isDifferente = tipoEffettivo === 'differente'
                    return (
                      <tr key={bambino.id} style={{ borderBottom: '1px solid #F0F6FF', background: bambino.ha_allergie_gravi ? '#FFF5F5' : 'white' }}>
                        <td style={{ padding: '0.5rem 0.875rem' }}>
                          <p style={{ margin: 0, fontWeight: 700, color: '#333', fontSize: '0.875rem' }}>
                            {bambino.nome} {bambino.cognome}
                          </p>
                          {/* Badge preferenza permanente + override giornaliero */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem', alignItems: 'center' }}>
                            {bambino.preferenza_menu && (
                              <span title={bambino.preferenza_menu.descrizione || bambino.preferenza_menu.tipo_label}
                                style={{ background: bambino.preferenza_menu.tipo === 'monopiatto' ? '#EDE9FE' : '#FFF3CD', color: bambino.preferenza_menu.tipo === 'monopiatto' ? '#6C5CE7' : '#856404', border: `1px solid ${bambino.preferenza_menu.tipo === 'monopiatto' ? '#C4B5FD' : '#FFECB5'}`, borderRadius: '5px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700 }}>
                                {bambino.preferenza_menu.tipo === 'monopiatto' ? '🍽️ MONO' : '🍀 DIFF'}
                              </span>
                            )}
                            {/* Dropdown override giornaliero */}
                            <select
                              value={form.tipo_menu ?? ''}
                              onChange={e => handleFieldChange(bambino.id, 'tipo_menu', e.target.value)}
                              title="Override menu per oggi"
                              style={{ padding: '1px 4px', border: `1.5px solid ${form.tipo_menu ? '#6C5CE7' : '#E8F4FD'}`, borderRadius: '5px', fontSize: '0.65rem', fontFamily: 'inherit', background: form.tipo_menu === 'monopiatto' ? '#EDE9FE' : form.tipo_menu === 'differente' ? '#FFF3CD' : 'white', color: form.tipo_menu ? '#333' : '#aaa', cursor: 'pointer' }}
                            >
                              <option value="">Oggi: standard</option>
                              <option value="monopiatto">Oggi: monopiatto</option>
                              <option value="differente">Oggi: menu diff.</option>
                            </select>
                            <button onClick={() => apriGestionePreferenza(bambino)} title="Gestisci menu personalizzato"
                              style={{ background: '#F0F6FF', border: '1px solid #BDE0FF', borderRadius: '5px', padding: '1px 5px', fontSize: '0.7rem', cursor: 'pointer', lineHeight: 1.4 }}>
                              ⚙️
                            </button>
                          </div>
                          {bambino.allergie.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.2rem' }}>
                              {bambino.allergie.map(a => (
                                <span key={a.id} title={`${a.tipo_label}: ${a.descrizione} — ${a.gravita_label}`}
                                  style={{ background: a.gravita === 'anafilassi' ? '#C0392B' : a.gravita === 'grave' ? '#E74C3C' : a.gravita === 'moderata' ? '#F39C12' : '#0984E3', color: 'white', padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                                  {a.descrizione}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {portateVisibili.map(p => {
                          const tipoPortata = p.key.replace('_quantita', '')
                          // Evidenziazione celle in base al tipo menu
                          let cellBg = ''
                          if (isMonopiatto) {
                            if (tipoPortata === 'monopiatto') cellBg = '#EDE9FE'
                            else if (tipoPortata === 'primo' || tipoPortata === 'secondo') cellBg = '#F8F8F8'
                          } else if (isDifferente) {
                            if (['primo', 'secondo', 'monopiatto'].includes(tipoPortata)) cellBg = '#FFFBEB'
                          }
                          return (
                            <td key={p.key} style={{ padding: '0.3rem 0.25rem', textAlign: 'center', background: cellBg }}>
                              <select
                                value={formStr(form, p.key)}
                                onChange={e => handleFieldChange(bambino.id, p.key, e.target.value)}
                                style={{
                                  padding: '0.3rem 0.1rem', border: `1.5px solid ${cellBg ? '#D4B8FF' : '#E8F4FD'}`, borderRadius: '7px',
                                  fontSize: '0.75rem', fontFamily: 'inherit', width: 66, textAlign: 'center',
                                  background: QUANTITA_BG[formStr(form, p.key)] ?? (cellBg || 'white'),
                                  opacity: isMonopiatto && (tipoPortata === 'primo' || tipoPortata === 'secondo') ? 0.45 : 1,
                                }}
                              >
                                {QUANTITA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </td>
                          )
                        })}

                        <td style={{ padding: '0.3rem 0.5rem' }}>
                          {tipoEffettivo !== 'standard' && (bambino.preferenza_menu?.piatti_alternativi.length ?? 0) > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginBottom: '0.3rem' }}>
                              {bambino.preferenza_menu!.piatti_alternativi.map(p => {
                                const selezionato = form.piatti_serviti.includes(p.id)
                                return (
                                  <button key={p.id} type="button" onClick={() => togglePiattoServito(bambino.id, p.id)}
                                    title={p.tipo_label}
                                    style={{
                                      background: selezionato ? (TIPO_COLOR[p.tipo] ?? '#6C5CE7') : 'white',
                                      color: selezionato ? 'white' : '#555',
                                      border: `1.3px solid ${TIPO_COLOR[p.tipo] ?? '#6C5CE7'}`,
                                      borderRadius: '6px', padding: '2px 6px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                    }}>
                                    {selezionato ? '✓ ' : ''}{p.descrizione}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                          <input type="text" value={form.note_pasto ?? ''} onChange={e => handleFieldChange(bambino.id, 'note_pasto', e.target.value)}
                            placeholder="note aggiuntive..." style={{ padding: '0.3rem 0.5rem', border: '1.5px solid #E8F4FD', borderRadius: '7px', fontSize: '0.8rem', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <button onClick={handleSalva} disabled={saving}
              style={{ width: '100%', padding: '1rem', background: saved ? '#27AE60' : '#0984E3', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, transition: 'background 0.3s', boxShadow: '0 4px 16px rgba(9,132,227,0.25)' }}>
              {saving ? 'Salvataggio...' : saved ? '✓ Pappe salvate!' : `🥣 Salva pappe (${entries.length} bambini)`}
            </button>
          </>
        )}
      </div>

      {/* Modal gestione menu personalizzato */}
      {gestioneBambino && (
        <div onClick={() => setGestioneBambino(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', width: 'min(480px, 96vw)', maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', fontWeight: 800, color: '#333' }}>
              🍽️ Menu personalizzato — {gestioneBambino.nome} {gestioneBambino.cognome}
            </h3>
            <p style={{ margin: '0 0 0.875rem', fontSize: '0.8rem', color: '#888' }}>
              Seleziona i piatti alternativi tra cui scegliere ogni giorno cosa è stato servito.
            </p>

            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#555', marginBottom: '0.25rem' }}>Tipo</label>
            <select value={gestioneForm.tipo} onChange={e => setGestioneForm(f => ({ ...f, tipo: e.target.value }))}
              style={{ padding: '0.4rem 0.625rem', border: '1.5px solid #C4B5FD', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'white', marginBottom: '0.75rem' }}>
              <option value="monopiatto">🍽️ Monopiatto</option>
              <option value="differente">🍀 Menu differente</option>
            </select>

            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#555', marginBottom: '0.4rem' }}>Piatti alternativi</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem', maxHeight: 260, overflowY: 'auto', border: '1px solid #F0F0F0', borderRadius: '10px', padding: '0.625rem' }}>
              {Object.entries(
                catalogoPiatti.reduce((acc: Record<string, PiattoRef[]>, p) => {
                  (acc[p.tipo] ??= []).push(p)
                  return acc
                }, {})
              ).map(([tipo, list]) => (
                <div key={tipo}>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.7rem', fontWeight: 800, color: TIPO_COLOR[tipo] ?? '#888', textTransform: 'uppercase' }}>
                    {list[0]?.tipo_label ?? tipo}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {list.map(p => {
                      const selezionato = gestioneForm.piatti.includes(p.id)
                      return (
                        <button key={p.id} type="button"
                          onClick={() => setGestioneForm(f => ({
                            ...f,
                            piatti: selezionato ? f.piatti.filter(id => id !== p.id) : [...f.piatti, p.id],
                          }))}
                          style={{
                            background: selezionato ? (TIPO_COLOR[tipo] ?? '#6C5CE7') : 'white',
                            color: selezionato ? 'white' : '#555',
                            border: `1.3px solid ${TIPO_COLOR[tipo] ?? '#6C5CE7'}`,
                            borderRadius: '7px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                          {selezionato ? '✓ ' : ''}{p.descrizione}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {catalogoPiatti.length === 0 && <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa' }}>Nessun piatto nel catalogo.</p>}
            </div>

            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#555', marginBottom: '0.25rem' }}>Nota aggiuntiva (opzionale)</label>
            <input type="text" value={gestioneForm.descrizione} onChange={e => setGestioneForm(f => ({ ...f, descrizione: e.target.value }))}
              placeholder='es. "senza sale"'
              style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1.5px solid #C4B5FD', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '0.75rem' }} />

            {gestioneError && <p style={{ margin: '0 0 0.75rem', color: '#C0392B', fontSize: '0.8rem', fontWeight: 600 }}>{gestioneError}</p>}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={salvaGestionePreferenza} disabled={gestioneSaving}
                style={{ padding: '0.5rem 1.125rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: gestioneSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: gestioneSaving ? 0.7 : 1 }}>
                {gestioneSaving ? '⏳...' : '✓ Salva'}
              </button>
              {gestioneBambino.preferenza_menu && (
                <button onClick={eliminaGestionePreferenza} disabled={gestioneSaving}
                  style={{ padding: '0.5rem 1rem', background: 'white', color: '#C0392B', border: '1.5px solid #FADBD8', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🗑 Elimina
                </button>
              )}
              <button onClick={() => setGestioneBambino(null)}
                style={{ padding: '0.5rem 1rem', background: 'white', color: '#888', border: '1.5px solid #DDD', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lblStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#555', marginBottom: '0.3rem',
}

const thStyle: React.CSSProperties = {
  padding: '0.5rem 0.4rem', textAlign: 'center', fontSize: '0.775rem', fontWeight: 700, color: '#0984E3',
}
