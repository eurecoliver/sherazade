'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Config {
  aperto: boolean
  anno_scolastico: string
  messaggio_benvenuto: string
  messaggio_chiuso: string
  data_apertura: string | null
  data_chiusura: string | null
  invia_email_conferma: boolean
}

interface Richiesta {
  id: number
  bambino_nome: string
  bambino_cognome: string
  bambino_data_nascita: string
  bambino_codice_fiscale: string
  bambino_note_mediche: string
  g1_nome: string
  g1_cognome: string
  g1_email: string
  g1_telefono: string
  g1_codice_fiscale: string
  g1_indirizzo: string
  g2_nome: string
  g2_cognome: string
  g2_email: string
  g2_telefono: string
  anno_scolastico: string
  stato: string
  stato_display: string
  note_genitore: string
  note_admin: string
  bambino: number | null
  creato_at: string
}

const STATO_LABEL: Record<string, string> = {
  in_attesa: '⏳ In attesa',
  approvata: '✅ Approvata',
  rifiutata: '❌ Rifiutata',
  lista_attesa: '📋 Lista d\'attesa',
}
const STATO_COLOR: Record<string, string> = {
  in_attesa: '#f39c12',
  approvata: '#00b894',
  rifiutata: '#d63031',
  lista_attesa: '#0984e3',
}

const TABS = ['tutte', 'in_attesa', 'approvata', 'lista_attesa', 'rifiutata']

export default function AdminIscrizioniPage() {
  const router = useRouter()
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [tab, setTab] = useState('in_attesa')
  const [selected, setSelected] = useState<Richiesta | null>(null)
  const [noteAdmin, setNoteAdmin] = useState('')
  const [saving, setSaving] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [cfgForm, setCfgForm] = useState<Partial<Config>>({})
  const [link, setLink] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') setLink(window.location.origin)
    loadConfig()
    loadRichieste()
  }, [])

  const loadConfig = async () => {
    const res = await fetch('/api/iscrizioni/config')
    if (res.ok) { const d = await res.json(); setConfig(d); setCfgForm(d) }
  }

  const loadRichieste = async () => {
    const res = await fetch('/api/iscrizioni/richieste')
    if (res.ok) setRichieste(await res.json())
  }

  const visible = tab === 'tutte' ? richieste : richieste.filter(r => r.stato === tab)

  const counts: Record<string, number> = {}
  for (const r of richieste) counts[r.stato] = (counts[r.stato] || 0) + 1

  const open = (r: Richiesta) => { setSelected(r); setNoteAdmin(r.note_admin) }

  const patch = async (id: number, data: object) => {
    const res = await fetch(`/api/iscrizioni/richieste/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setRichieste(prev => prev.map(r => r.id === id ? updated : r))
      setSelected(updated)
    }
  }

  const approva = async (id: number) => {
    if (!confirm('Creare Bambino + Famiglia + account genitore da questa richiesta?')) return
    setSaving(true)
    const res = await fetch(`/api/iscrizioni/richieste/${id}/approva`, { method: 'POST' })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setRichieste(prev => prev.map(r => r.id === id ? data : r))
      setSelected(data)
    } else {
      alert(data.detail || 'Errore durante l\'approvazione')
    }
  }

  const saveNoteAdmin = async () => {
    if (!selected) return
    setSaving(true)
    await patch(selected.id, { note_admin: noteAdmin })
    setSaving(false)
  }

  const saveConfig = async () => {
    setSaving(true)
    const res = await fetch('/api/iscrizioni/config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfgForm),
    })
    if (res.ok) { const d = await res.json(); setConfig(d); setCfgForm(d) }
    setSaving(false)
    setConfigOpen(false)
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ minHeight: '100vh', background: '#f4f1fb', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#6C5CE7,#4834D4)', padding: '28px 24px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <button onClick={() => router.push('/dashboard/admin')} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: 13 }}>← Dashboard</button>
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800 }}>📋 Iscrizioni</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: 14 }}>
            {config ? (config.aperto ? `🟢 Aperte — ${config.anno_scolastico}` : '🔴 Chiuse') : '…'}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
          <button onClick={() => setConfigOpen(true)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #c9b8e8', background: '#fff', color: '#5a3e8a', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>⚙️ Impostazioni</button>
          {config && (
            <div style={{ background: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, border: '1.5px solid #e0d7f0' }}>
              🔗 Link pubblico: <a href={`${link}/it/iscrizioni`} target="_blank" rel="noreferrer" style={{ color: '#6c5ce7', wordBreak: 'break-all' }}>{link}/it/iscrizioni</a>
            </div>
          )}
        </div>

        {/* KPI */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {Object.entries(STATO_LABEL).map(([k, label]) => (
            <div key={k} style={{ background: '#fff', borderRadius: 10, padding: '12px 20px', flex: '1 1 120px', textAlign: 'center', borderTop: `4px solid ${STATO_COLOR[k]}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: STATO_COLOR[k] }}>{counts[k] || 0}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{label.replace(/^[^ ]+ /, '')}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t ? '#6c5ce7' : '#e8e0f5', color: tab === t ? '#fff' : '#5a3e8a',
            }}>
              {t === 'tutte' ? `Tutte (${richieste.length})` : `${STATO_LABEL[t]} (${counts[t] || 0})`}
            </button>
          ))}
        </div>

        {/* Tabella */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {visible.length === 0 ? (
            <p style={{ padding: 32, textAlign: 'center', color: '#999' }}>Nessuna richiesta.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f4f1fb' }}>
                  {['Bambino', 'Genitore 1', 'Anno', 'Stato', 'Data', ''].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f0eafa', cursor: 'pointer' }} onClick={() => open(r)}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#333' }}>{r.bambino_cognome} {r.bambino_nome}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{r.g1_nome} {r.g1_cognome}<br /><span style={{ color: '#888', fontSize: 12 }}>{r.g1_email}</span></td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{r.anno_scolastico || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: STATO_COLOR[r.stato] + '22', color: STATO_COLOR[r.stato], borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{r.stato_display}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>{fmt(r.creato_at)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={e => { e.stopPropagation(); open(r) }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #c9b8e8', background: '#f4f1fb', color: '#6c5ce7', cursor: 'pointer', fontSize: 12 }}>Dettaglio</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Drawer dettaglio */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSelected(null)}>
          <div style={{ width: 'min(480px,100vw)', background: '#fff', height: '100%', overflowY: 'auto', padding: '24px 20px', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#5a3e8a' }}>{selected.bambino_cognome} {selected.bambino_nome}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            {/* Stato badge */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ background: STATO_COLOR[selected.stato] + '22', color: STATO_COLOR[selected.stato], borderRadius: 12, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>{selected.stato_display}</span>
              {selected.bambino && <span style={{ marginLeft: 8, fontSize: 12, color: '#00b894' }}>✅ Bambino creato (ID {selected.bambino})</span>}
            </div>

            {/* Azioni cambio stato */}
            {selected.stato !== 'approvata' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {selected.stato !== 'approvata' && !selected.bambino && (
                  <button onClick={() => approva(selected.id)} disabled={saving} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#00b894', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>✅ Approva &amp; crea bambino</button>
                )}
                {selected.stato !== 'lista_attesa' && (
                  <button onClick={() => patch(selected.id, { stato: 'lista_attesa' })} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #0984e3', background: '#fff', color: '#0984e3', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>📋 Lista d&apos;attesa</button>
                )}
                {selected.stato !== 'rifiutata' && (
                  <button onClick={() => { if (confirm('Rifiutare questa richiesta?')) patch(selected.id, { stato: 'rifiutata' }) }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d63031', background: '#fff', color: '#d63031', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>❌ Rifiuta</button>
                )}
                {selected.stato !== 'in_attesa' && (
                  <button onClick={() => patch(selected.id, { stato: 'in_attesa' })} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #f39c12', background: '#fff', color: '#f39c12', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>⏳ In attesa</button>
                )}
              </div>
            )}

            <Section title="👶 Bambino">
              <Row label="Nome completo" value={`${selected.bambino_nome} ${selected.bambino_cognome}`} />
              <Row label="Data di nascita" value={selected.bambino_data_nascita} />
              {selected.bambino_codice_fiscale && <Row label="Codice fiscale" value={selected.bambino_codice_fiscale} />}
              {selected.bambino_note_mediche && <Row label="Note mediche" value={selected.bambino_note_mediche} />}
            </Section>

            <Section title="👤 Genitore 1">
              <Row label="Nome" value={`${selected.g1_nome} ${selected.g1_cognome}`} />
              <Row label="Email" value={selected.g1_email} />
              <Row label="Telefono" value={selected.g1_telefono} />
              {selected.g1_codice_fiscale && <Row label="CF" value={selected.g1_codice_fiscale} />}
              {selected.g1_indirizzo && <Row label="Indirizzo" value={selected.g1_indirizzo} />}
            </Section>

            {selected.g2_email && (
              <Section title="👥 Genitore 2">
                <Row label="Nome" value={`${selected.g2_nome} ${selected.g2_cognome}`} />
                <Row label="Email" value={selected.g2_email} />
                {selected.g2_telefono && <Row label="Telefono" value={selected.g2_telefono} />}
              </Section>
            )}

            {selected.note_genitore && (
              <Section title="💬 Note del genitore">
                <p style={{ margin: 0, fontSize: 14, color: '#555', lineHeight: 1.5 }}>{selected.note_genitore}</p>
              </Section>
            )}

            <Section title="📝 Note amministrative">
              <textarea
                value={noteAdmin}
                onChange={e => setNoteAdmin(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1.5px solid #e0d7f0', fontSize: 14, minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
                placeholder="Note interne (non visibili al genitore)..."
              />
              <button onClick={saveNoteAdmin} disabled={saving} style={{ marginTop: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6c5ce7', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                {saving ? 'Salvo…' : '💾 Salva note'}
              </button>
            </Section>

            <p style={{ fontSize: 12, color: '#bbb', marginTop: 16 }}>Ricevuta: {fmt(selected.creato_at)}</p>
          </div>
        </div>
      )}

      {/* Modal configurazione */}
      {configOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setConfigOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '28px 24px', width: 'min(480px,100%)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px', color: '#5a3e8a' }}>⚙️ Impostazioni iscrizioni</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#5a3e8a', cursor: 'pointer' }}>
                <input type="checkbox" checked={cfgForm.aperto || false} onChange={e => setCfgForm(f => ({ ...f, aperto: e.target.checked }))} />
                Iscrizioni aperte
              </label>
            </div>
            <FField label="Anno scolastico" value={cfgForm.anno_scolastico || ''} onChange={v => setCfgForm(f => ({ ...f, anno_scolastico: v }))} placeholder="es. 2026-2027" />
            <FField label="Data apertura" type="date" value={cfgForm.data_apertura || ''} onChange={v => setCfgForm(f => ({ ...f, data_apertura: v || null }))} />
            <FField label="Data chiusura" type="date" value={cfgForm.data_chiusura || ''} onChange={v => setCfgForm(f => ({ ...f, data_chiusura: v || null }))} />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5a3e8a', marginBottom: 4 }}>Messaggio di benvenuto</label>
              <textarea value={cfgForm.messaggio_benvenuto || ''} onChange={e => setCfgForm(f => ({ ...f, messaggio_benvenuto: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1.5px solid #e0d7f0', fontSize: 14, minHeight: 70, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5a3e8a', marginBottom: 4 }}>Messaggio iscrizioni chiuse</label>
              <textarea value={cfgForm.messaggio_chiuso || ''} onChange={e => setCfgForm(f => ({ ...f, messaggio_chiuso: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1.5px solid #e0d7f0', fontSize: 14, minHeight: 70, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#5a3e8a', cursor: 'pointer' }}>
                <input type="checkbox" checked={cfgForm.invia_email_conferma !== false} onChange={e => setCfgForm(f => ({ ...f, invia_email_conferma: e.target.checked }))} />
                Invia email di conferma al genitore
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfigOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #c9b8e8', background: '#fff', color: '#5a3e8a', fontWeight: 600, cursor: 'pointer' }}>Annulla</button>
              <button onClick={saveConfig} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#6c5ce7', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Salvo…' : '💾 Salva'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#7c5cbf' }}>{title}</h4>
      <div style={{ background: '#f8f4ff', borderRadius: 8, padding: '10px 14px' }}>{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase' }}>{label}: </span>
      <span style={{ fontSize: 13, color: '#333' }}>{value}</span>
    </div>
  )
}

function FField({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#5a3e8a', marginBottom: 4 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e0d7f0', fontSize: 14, boxSizing: 'border-box' }} />
    </div>
  )
}
