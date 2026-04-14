'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { formatApiErrors as _formatApiErrors } from '@/lib/formatErrors'
import UserChip from '@/components/UserChip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Genitore {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  codice_fiscale: string
  indirizzo: string
  is_active: boolean
  role: string
}

interface FamigliaBambino {
  id: number
  genitore1: number
  genitore2: number | null
  telefono_emergenza: string
}

interface Bambino {
  id: number
  nome: string
  cognome: string
  gruppo_nome: string
  gruppo_colore: string
  attivo: boolean
  famiglia: FamigliaBambino | null
}

interface FamigliaLink {
  id: number
  bambino: number
  bambino_nome: string
  bambino_cognome: string
  genitore1: number
  genitore2: number | null
}

interface EditForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  codice_fiscale: string
  indirizzo: string
  is_active: boolean
}

const EMPTY_EDIT: EditForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  codice_fiscale: '',
  indirizzo: '',
  is_active: true,
}

// ─── Overlay ─────────────────────────────────────────────────────────────────

function Overlay({ onClose, zIndex = 1000, children }: { onClose: () => void; zIndex?: number; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '620px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {children}
      </div>
    </div>
  )
}

// ─── InfoGrid ─────────────────────────────────────────────────────────────────

function InfoGrid({ items }: { items: { label: string; value: string; full?: boolean }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.25rem' }}>
      {items.map(({ label, value, full }) => (
        <div key={label} style={{ background: '#F7FAFC', borderRadius: '10px', padding: '0.75rem 1rem', ...(full ? { gridColumn: '1 / -1' } : {}) }}>
          <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', fontWeight: 600, color: '#333', wordBreak: 'break-word' }}>{value || '—'}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const formatApiErrors = _formatApiErrors

function ErrorAlert({ message }: { message: string }) {
  if (!message) return null
  return (
    <div style={{ background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: '10px', padding: '0.75rem 1rem', marginTop: '0.75rem' }}>
      {message.split('\n').map((line, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : '0.25rem 0 0', fontSize: '0.85rem', color: '#C53030', fontWeight: i === 0 ? 600 : 400 }}>{line}</p>
      ))}
    </div>
  )
}

export default function GenitoriPage() {
  const router = useRouter()
  const locale = useLocale()

  const [genitori, setGenitori] = useState<Genitore[]>([])
  const [famiglie, setFamiglie] = useState<FamigliaLink[]>([])
  const [bambini, setBambini] = useState<Bambino[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filtri
  const [search, setSearch] = useState('')
  const [filterAttivo, setFilterAttivo] = useState<'tutti' | 'attivi' | 'disattivi'>('attivi')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Detail
  const [selected, setSelected] = useState<Genitore | null>(null)

  // Edit modal
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Nuovo genitore
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState<EditForm & { password: string }>({ ...EMPTY_EDIT, password: '' })
  const [newLoading, setNewLoading] = useState(false)
  const [newError, setNewError] = useState('')

  // Collega bambino (dopo creazione genitore)
  const [newGenitore, setNewGenitore] = useState<Genitore | null>(null)
  const [showCollega, setShowCollega] = useState(false)
  const [collegaTab, setCollegaTab] = useState<'cerca' | 'crea'>('cerca')
  const [collegaSearch, setCollegaSearch] = useState('')
  const [collegaLoading, setCollegaLoading] = useState(false)
  const [collegaError, setCollegaError] = useState('')
  const [collegaTelEmerg, setCollegaTelEmerg] = useState('')
  // Crea nuovo bambino
  const [nuovoBNome, setNuovoBNome] = useState('')
  const [nuovoBCognome, setNuovoBCognome] = useState('')
  const [nuovoBData, setNuovoBData] = useState('')
  const [nuovoBTel, setNuovoBTel] = useState('')
  const [nuovoBLoading, setNuovoBLoading] = useState(false)
  const [nuovoBError, setNuovoBError] = useState('')

  const carica = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [gRes, fRes, bRes] = await Promise.all([
        fetch('/api/utenti?role=genitore&ordering=last_name'),
        fetch('/api/famiglie'),
        fetch('/api/bambini?page_size=200'),
      ])
      if (gRes.status === 401) { router.push(`/${locale}/login`); return }

      const gData = await gRes.json()
      const fData = await fRes.json()
      const bData = await bRes.json()

      setGenitori(gData.results ?? gData)

      const bList: Bambino[] = bData.results ?? bData
      setBambini(bList)
      const bMap = Object.fromEntries(bList.map(b => [b.id, b]))
      const fList: { id: number; bambino: number; genitore1: number; genitore2: number | null }[] = fData.results ?? fData
      setFamiglie(fList.map(f => ({
        ...f,
        bambino_nome: bMap[f.bambino]?.nome ?? '',
        bambino_cognome: bMap[f.bambino]?.cognome ?? '',
      })))
    } catch {
      setError('Errore nel caricamento.')
    } finally {
      setLoading(false)
    }
  }, [locale, router])

  useEffect(() => { carica() }, [carica])

  const figlidiGenitore = (gId: number): Bambino[] => {
    const ids = famiglie.filter(f => f.genitore1 === gId || f.genitore2 === gId).map(f => f.bambino)
    return bambini.filter(b => ids.includes(b.id))
  }

  const filtered = genitori.filter(g => {
    if (filterAttivo === 'attivi' && !g.is_active) return false
    if (filterAttivo === 'disattivi' && g.is_active) return false
    if (search) {
      const q = search.toLowerCase()
      return g.first_name.toLowerCase().includes(q) || g.last_name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q)
    }
    return true
  })

  const openEdit = (g: Genitore) => {
    setEditForm({
      first_name: g.first_name, last_name: g.last_name,
      email: g.email, phone: g.phone ?? '',
      codice_fiscale: g.codice_fiscale ?? '',
      indirizzo: g.indirizzo ?? '',
      is_active: g.is_active,
    })
    setEditError('')
    setShowEdit(true)
  }

  const handleEditSubmit = async () => {
    if (!selected) return
    if (editForm.codice_fiscale && editForm.codice_fiscale.length !== 16) {
      setEditError('Il codice fiscale deve essere esattamente 16 caratteri.')
      return
    }
    setEditLoading(true)
    setEditError('')
    try {
      const res = await fetch(`/api/utenti/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(formatApiErrors(data)); return }
      setShowEdit(false)
      setSelected({ ...selected, ...editForm })
      carica()
    } catch {
      setEditError('Errore nel salvataggio.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleToggleAttivo = async () => {
    if (!selected) return
    const label = selected.is_active ? 'disattivare' : 'riattivare'
    if (!confirm(`Vuoi ${label} ${selected.first_name} ${selected.last_name}?`)) return
    try {
      const res = await fetch(`/api/utenti/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !selected.is_active }),
      })
      if (!res.ok) throw new Error()
      setSelected({ ...selected, is_active: !selected.is_active })
      carica()
    } catch {
      alert('Errore durante l\'operazione.')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    if (!confirm(`Eliminare definitivamente ${selected.first_name} ${selected.last_name}? Questa azione non è reversibile.`)) return
    try {
      const res = await fetch(`/api/utenti/${selected.id}`, { method: 'DELETE' })
      if (res.status !== 204 && !res.ok) throw new Error()
      setSelected(null)
      carica()
    } catch {
      alert('Errore durante l\'eliminazione.')
    }
  }

  const handleNewSubmit = async () => {
    if (newForm.codice_fiscale && newForm.codice_fiscale.length !== 16) {
      setNewError('Il codice fiscale deve essere esattamente 16 caratteri.')
      return
    }
    setNewLoading(true)
    setNewError('')
    try {
      const res = await fetch('/api/utenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newForm, role: 'genitore', username: newForm.email }),
      })
      const data = await res.json()
      if (!res.ok) { setNewError(formatApiErrors(data)); return }
      const creato: Genitore = data
      setShowNew(false)
      setNewForm({ ...EMPTY_EDIT, password: '' })
      // Apri modale "collega bambino"
      setNewGenitore(creato)
      setCollegaTab('cerca')
      setCollegaSearch('')
      setCollegaError('')
      setCollegaTelEmerg('')
      setShowCollega(true)
      carica()
    } catch {
      setNewError('Errore nella creazione.')
    } finally {
      setNewLoading(false)
    }
  }

  // Collega bambino esistente al nuovo genitore
  const collegaBambino = async (bambino: Bambino) => {
    if (!newGenitore) return
    setCollegaLoading(true)
    setCollegaError('')
    try {
      if (bambino.famiglia === null) {
        // Crea Famiglia con newGenitore come genitore1
        if (!collegaTelEmerg) { setCollegaError('Inserisci il telefono di emergenza.'); setCollegaLoading(false); return }
        const res = await fetch('/api/famiglie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bambino: bambino.id,
            genitore1_email: newGenitore.email,
            genitore1_nome: newGenitore.first_name,
            genitore1_cognome: newGenitore.last_name,
            telefono_emergenza: collegaTelEmerg,
          }),
        })
        if (!res.ok) { const e = await res.json(); setCollegaError(formatApiErrors(e)); return }
      } else if (bambino.famiglia.genitore2 === null) {
        // Aggiungi come genitore2 via email (backend risolve/crea User)
        const res = await fetch(`/api/famiglie/${bambino.famiglia.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            genitore2_email: newGenitore.email,
            genitore2_nome: newGenitore.first_name,
            genitore2_cognome: newGenitore.last_name,
          }),
        })
        if (!res.ok) { const e = await res.json(); setCollegaError(formatApiErrors(e)); return }
      } else {
        setCollegaError('Questo bambino ha già due genitori registrati.')
        return
      }
      setShowCollega(false)
      carica()
    } catch {
      setCollegaError('Errore nella creazione del collegamento.')
    } finally {
      setCollegaLoading(false)
    }
  }

  const scollegaBambino = async (b: Bambino) => {
    if (!selected) return
    const fam = famiglie.find(f => f.bambino === b.id)
    if (!fam) return
    const label = `${b.nome} ${b.cognome}`
    if (!confirm(`Rimuovere la relazione tra ${nomeCompleto(selected)} e ${label}?`)) return
    try {
      if (fam.genitore2 === selected.id) {
        // È genitore2 → PATCH genitore2=null
        await fetch(`/api/famiglie/${fam.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ genitore2: null }),
        })
      } else {
        // È genitore1 → elimina intera famiglia
        await fetch(`/api/famiglie/${fam.id}`, { method: 'DELETE' })
      }
      carica()
    } catch { /* ignore */ }
  }

  // Crea nuovo bambino e collegalo
  const creaNuovoBambino = async () => {
    if (!newGenitore || !nuovoBNome || !nuovoBCognome || !nuovoBData || !nuovoBTel) {
      setNuovoBError('Compila tutti i campi obbligatori.')
      return
    }
    setNuovoBLoading(true)
    setNuovoBError('')
    try {
      // 1. Crea bambino
      const bRes = await fetch('/api/bambini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nuovoBNome,
          cognome: nuovoBCognome,
          data_nascita: nuovoBData,
          data_iscrizione: new Date().toISOString().split('T')[0],
        }),
      })
      const bData = await bRes.json()
      if (!bRes.ok) { setNuovoBError(formatApiErrors(bData)); return }
      const bambinoId: number = bData.id

      // 2. Crea Famiglia
      const fRes = await fetch('/api/famiglie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bambino: bambinoId,
          genitore1_email: newGenitore.email,
          genitore1_nome: newGenitore.first_name,
          genitore1_cognome: newGenitore.last_name,
          telefono_emergenza: nuovoBTel,
        }),
      })
      if (!fRes.ok) { const e = await fRes.json(); setNuovoBError(formatApiErrors(e)); return }
      setShowCollega(false)
      carica()
    } catch {
      setNuovoBError('Errore nella creazione.')
    } finally {
      setNuovoBLoading(false)
    }
  }

  const nomeCompleto = (g: Genitore) =>
    [g.first_name, g.last_name].filter(Boolean).join(' ') || g.email

  // Bambini filtrati nella ricerca del modal "collega"
  const bambiniFiltrati = bambini.filter(b => {
    if (!collegaSearch) return true
    const q = collegaSearch.toLowerCase()
    return b.nome.toLowerCase().includes(q) || b.cognome.toLowerCase().includes(q)
  })

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6C63FF 0%, #3F3D99 100%)', padding: '1.25rem 1.5rem 1.75rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(1100px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button onClick={() => router.push(`/${locale}/dashboard/admin`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}>
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>👨‍👩‍👧 Anagrafica Genitori</h1>
          <p style={{ margin: '0.2rem 0 0', opacity: 0.85, fontSize: '0.85rem' }}>{filtered.length} genitori</p>
        </div>
      </div>

      <div style={{ maxWidth: 'min(1100px, 96vw)', margin: '0 auto', padding: '1.25rem 1rem 3rem' }}>

        {/* Filtri */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <input type="search" placeholder="Cerca per nome, cognome, email..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: '160px', padding: '0.5rem 0.875rem', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '0.875rem', fontFamily: 'inherit' }} />
          <select value={filterAttivo} onChange={e => setFilterAttivo(e.target.value as 'tutti' | 'attivi' | 'disattivi')} style={{ padding: '0.5rem 0.875rem', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '0.875rem', fontFamily: 'inherit' }}>
            <option value="attivi">Attivi</option>
            <option value="disattivi">Disattivi</option>
            <option value="tutti">Tutti</option>
          </select>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {(['cards', 'table'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{ padding: '0.5rem 0.75rem', background: viewMode === m ? '#6C63FF' : '#F7FAFC', color: viewMode === m ? 'white' : '#555', border: `1px solid ${viewMode === m ? '#6C63FF' : '#E2E8F0'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontFamily: 'inherit' }}>
                {m === 'cards' ? '▦' : '☰'}
              </button>
            ))}
          </div>
          <button onClick={() => { setSelected(null); setShowEdit(false); setNewForm({ ...EMPTY_EDIT, password: '' }); setNewError(''); setShowNew(true) }} style={{ padding: '0.5rem 1.25rem', background: '#6C63FF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            + Nuovo genitore
          </button>
        </div>

        {error && <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6C63FF', fontWeight: 600 }}>Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>Nessun genitore trovato.</div>
        ) : viewMode === 'cards' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filtered.map(g => {
              const figli = figlidiGenitore(g.id)
              return (
                <div key={g.id} onClick={() => setSelected(g)} style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '2px solid transparent', transition: 'all 0.15s', opacity: g.is_active ? 1 : 0.6 }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#6C63FF')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.625rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>👤</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#333', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeCompleto(g)}</p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.email}</p>
                    </div>
                    {!g.is_active && <span style={{ background: '#FED7D7', color: '#C53030', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '6px', flexShrink: 0 }}>INATTIVO</span>}
                  </div>
                  {g.phone && <p style={{ margin: '0 0 0.375rem', fontSize: '0.8rem', color: '#666' }}>📞 {g.phone}</p>}
                  {figli.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                      {figli.map(b => (
                        <span key={b.id} style={{ background: b.gruppo_colore + '20', color: b.gruppo_colore, border: `1px solid ${b.gruppo_colore}40`, padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {b.nome} {b.cognome}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F7FAFC' }}>
                  {['Nome', 'Email', 'Telefono', 'CF', 'Figli', 'Stato'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#555', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => {
                  const figli = figlidiGenitore(g.id)
                  return (
                    <tr key={g.id} onClick={() => setSelected(g)} style={{ borderBottom: '1px solid #F7FAFC', cursor: 'pointer', opacity: g.is_active ? 1 : 0.6 }} onMouseEnter={e => (e.currentTarget.style.background = '#F7FAFC')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>{nomeCompleto(g)}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#666' }}>{g.email}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#666' }}>{g.phone || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#666', fontFamily: 'monospace' }}>{g.codice_fiscale || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {figli.map(b => <span key={b.id} style={{ background: b.gruppo_colore + '20', color: b.gruppo_colore, padding: '0.15rem 0.4rem', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 600 }}>{b.nome} {b.cognome}</span>)}
                          {figli.length === 0 && <span style={{ fontSize: '0.8rem', color: '#aaa' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ background: g.is_active ? '#F0FFF4' : '#FFF5F5', color: g.is_active ? '#38A169' : '#C53030', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {g.is_active ? 'Attivo' : 'Inattivo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail modal ── */}
      {selected && !showEdit && (
        <Overlay onClose={() => setSelected(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#333' }}>{nomeCompleto(selected)}</h2>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#888' }}>{selected.email}</p>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#aaa', padding: 0 }}>✕</button>
          </div>

          <InfoGrid items={[
            { label: 'Nome', value: selected.first_name },
            { label: 'Cognome', value: selected.last_name },
            { label: 'Email', value: selected.email },
            { label: 'Telefono', value: selected.phone },
            { label: 'Codice fiscale', value: selected.codice_fiscale },
            { label: 'Stato', value: selected.is_active ? 'Attivo' : 'Inattivo' },
            { label: 'Indirizzo', value: selected.indirizzo, full: true },
          ]} />

          {/* Figli */}
          {(() => {
            const figli = figlidiGenitore(selected.id)
            return (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.625rem', fontSize: '0.8rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Figli {figli.length === 0 && <span style={{ fontWeight: 400, color: '#aaa' }}>— nessuno associato</span>}
                </p>
                {figli.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {figli.map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: b.gruppo_colore + '20', border: `1px solid ${b.gruppo_colore}50`, borderRadius: '10px', padding: '0.2rem 0.35rem 0.2rem 0.875rem' }}>
                        <span style={{ color: b.gruppo_colore, fontSize: '0.85rem', fontWeight: 700 }}>
                          {b.nome} {b.cognome} {b.gruppo_nome ? `(${b.gruppo_nome})` : ''} {!b.attivo ? '⏸' : ''}
                        </span>
                        <button
                          onClick={() => scollegaBambino(b)}
                          title="Scollega bambino"
                          style={{ background: 'none', border: 'none', color: b.gruppo_colore, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', padding: '0 0.25rem', lineHeight: 1, opacity: 0.6 }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Azioni */}
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', borderTop: '1px solid #F0F0F0', paddingTop: '1rem' }}>
            <button onClick={() => openEdit(selected)} style={{ padding: '0.625rem 1.25rem', background: '#6C63FF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              ✏️ Modifica
            </button>
            <button onClick={() => {
              setNewGenitore(selected)
              setCollegaTab('cerca')
              setCollegaSearch('')
              setCollegaError('')
              setCollegaTelEmerg('')
              setNuovoBNome(''); setNuovoBCognome(''); setNuovoBData(''); setNuovoBTel('')
              setNuovoBError('')
              setShowCollega(true)
            }} style={{ padding: '0.625rem 1.25rem', background: '#F0FFF4', color: '#38A169', border: '1px solid #68D391', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              ➕ Collega bambino
            </button>
            <button onClick={handleToggleAttivo} style={{ padding: '0.625rem 1.25rem', background: selected.is_active ? '#FFF3CD' : '#F0FFF4', color: selected.is_active ? '#856404' : '#38A169', border: `1px solid ${selected.is_active ? '#F6AD55' : '#68D391'}`, borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              {selected.is_active ? '⏸ Disattiva' : '▶ Riattiva'}
            </button>
            <button onClick={handleDelete} style={{ padding: '0.625rem 1.25rem', background: '#FFF5F5', color: '#C53030', border: '1px solid #FC8181', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
              🗑 Elimina
            </button>
          </div>
        </Overlay>
      )}

      {/* ── Edit modal ── */}
      {showEdit && selected && (
        <Overlay onClose={() => setShowEdit(false)} zIndex={1100}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#333' }}>Modifica genitore</h2>
            <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#aaa', padding: 0 }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Nome', key: 'first_name' as const, type: 'text' },
              { label: 'Cognome', key: 'last_name' as const, type: 'text' },
              { label: 'Email', key: 'email' as const, type: 'email' },
              { label: 'Telefono', key: 'phone' as const, type: 'tel' },
              { label: 'Codice fiscale', key: 'codice_fiscale' as const, type: 'text' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>{label.replace(' *', '')}{label.includes('*') && <span style={{ color: '#C53030', marginLeft: '0.2rem' }}>*</span>}</label>
                <input type={type} value={editForm[key] as string} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Indirizzo</label>
              <input type="text" value={editForm.indirizzo} onChange={e => setEditForm(f => ({ ...f, indirizzo: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#555', cursor: 'pointer' }}>
            <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} />
            Account attivo
          </label>
          <ErrorAlert message={editError} />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button onClick={handleEditSubmit} disabled={editLoading} style={{ flex: 1, padding: '0.75rem', background: editLoading ? '#A0AEC0' : '#6C63FF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: editLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {editLoading ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
            <button onClick={() => setShowEdit(false)} style={{ padding: '0.75rem 1.25rem', background: '#F7FAFC', color: '#555', border: '1px solid #E2E8F0', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Annulla
            </button>
          </div>
        </Overlay>
      )}

      {/* ── Nuovo genitore modal ── */}
      {showNew && (
        <Overlay onClose={() => setShowNew(false)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#333' }}>Nuovo genitore</h2>
            <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#aaa', padding: 0 }}>✕</button>
          </div>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#888' }}>Se omessa, la password verrà impostata come non utilizzabile — il genitore potrà fare il reset tramite email.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Nome', key: 'first_name' as const, type: 'text', full: false },
              { label: 'Cognome', key: 'last_name' as const, type: 'text', full: false },
              { label: 'Email *', key: 'email' as const, type: 'email', full: true },
              { label: 'Telefono', key: 'phone' as const, type: 'tel', full: false },
              { label: 'Codice fiscale', key: 'codice_fiscale' as const, type: 'text', full: false },
              { label: 'Password (opz.)', key: 'password' as const, type: 'password', full: false },
            ].map(({ label, key, type, full }) => (
              <div key={key} style={full ? { gridColumn: '1 / -1' } : {}}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>{label.replace(' *', '')}{label.includes('*') && <span style={{ color: '#C53030', marginLeft: '0.2rem' }}>*</span>}</label>
                <input type={type} value={newForm[key]} onChange={e => setNewForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Indirizzo</label>
              <input type="text" value={newForm.indirizzo} onChange={e => setNewForm(f => ({ ...f, indirizzo: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
          </div>
          <ErrorAlert message={newError} />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button onClick={handleNewSubmit} disabled={newLoading || !newForm.email} style={{ flex: 1, padding: '0.75rem', background: newLoading || !newForm.email ? '#A0AEC0' : '#6C63FF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: newLoading || !newForm.email ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {newLoading ? 'Creazione...' : 'Crea genitore'}
            </button>
            <button onClick={() => setShowNew(false)} style={{ padding: '0.75rem 1.25rem', background: '#F7FAFC', color: '#555', border: '1px solid #E2E8F0', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Annulla
            </button>
          </div>
        </Overlay>
      )}

      {/* ── Collega bambino modal (dopo creazione) ── */}
      {showCollega && newGenitore && (
        <Overlay onClose={() => setShowCollega(false)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#333' }}>✅ Genitore creato!</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#888' }}>Vuoi collegare <strong>{newGenitore.first_name || newGenitore.email}</strong> a un bambino?</p>
            </div>
            <button onClick={() => setShowCollega(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#aaa', padding: 0 }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {[{ k: 'cerca' as const, l: '🔍 Bambino esistente' }, { k: 'crea' as const, l: '➕ Crea nuovo bambino' }].map(({ k, l }) => (
              <button key={k} onClick={() => { setCollegaTab(k); setCollegaError('') }} style={{ padding: '0.5rem 1rem', background: collegaTab === k ? '#6C63FF' : '#F7FAFC', color: collegaTab === k ? 'white' : '#555', border: `1px solid ${collegaTab === k ? '#6C63FF' : '#E2E8F0'}`, borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                {l}
              </button>
            ))}
          </div>

          {collegaError && <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.625rem 0.875rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.82rem' }}>{collegaError}</div>}

          {collegaTab === 'cerca' ? (
            <>
              <input type="search" placeholder="Cerca bambino per nome..." value={collegaSearch} onChange={e => setCollegaSearch(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.875rem', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '0.75rem' }} />
              <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {bambiniFiltrati.slice(0, 30).map(b => {
                  const hasDueParen = b.famiglia?.genitore2 !== null && b.famiglia?.genitore2 !== undefined
                  const hasNoFamily = b.famiglia === null
                  const canAdd = !hasDueParen
                  return (
                    <div key={b.id} style={{ background: '#F7FAFC', borderRadius: '12px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: canAdd ? 1 : 0.5 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: b.gruppo_colore || '#A29BFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                        {b.nome.charAt(0)}{b.cognome.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#333' }}>{b.nome} {b.cognome}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>
                          {b.gruppo_nome || 'Nessun gruppo'} ·{' '}
                          {hasNoFamily ? 'Nessuna famiglia — diventerà Genitore 1'
                            : b.famiglia?.genitore2 === null ? 'Ha già Genitore 1 — diventerà Genitore 2'
                              : 'Ha già due genitori'}
                        </p>
                        {/* Telefono emergenza se nessuna famiglia */}
                        {hasNoFamily && (
                          <input
                            type="tel"
                            placeholder="Telefono emergenza *"
                            value={collegaTelEmerg}
                            onChange={e => setCollegaTelEmerg(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ marginTop: '0.375rem', width: '100%', padding: '0.35rem 0.625rem', border: '1px solid #CBD5E0', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                          />
                        )}
                      </div>
                      {canAdd && (
                        <button onClick={() => collegaBambino(b)} disabled={collegaLoading} style={{ padding: '0.4rem 0.875rem', background: '#6C63FF', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                          {collegaLoading ? '...' : 'Collega'}
                        </button>
                      )}
                    </div>
                  )
                })}
                {bambiniFiltrati.length === 0 && <p style={{ color: '#aaa', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>Nessun bambino trovato.</p>}
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#888' }}>Crea un nuovo bambino e collegalo automaticamente a questo genitore.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                {[
                  { label: 'Nome *', val: nuovoBNome, set: setNuovoBNome, type: 'text' },
                  { label: 'Cognome *', val: nuovoBCognome, set: setNuovoBCognome, type: 'text' },
                  { label: 'Data di nascita *', val: nuovoBData, set: setNuovoBData, type: 'date' },
                  { label: 'Tel. emergenza *', val: nuovoBTel, set: setNuovoBTel, type: 'tel' },
                ].map(({ label, val, set, type }) => (
                  <div key={label}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.2rem' }}>{label.replace(' *', '')}{label.includes('*') && <span style={{ color: '#C53030', marginLeft: '0.2rem' }}>*</span>}</label>
                    <input type={type} value={val} onChange={e => set(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <ErrorAlert message={nuovoBError} />
              <button onClick={creaNuovoBambino} disabled={nuovoBLoading} style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: nuovoBLoading ? '#A0AEC0' : '#6C63FF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: nuovoBLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {nuovoBLoading ? 'Creazione...' : 'Crea bambino e collega'}
              </button>
            </>
          )}

          <button onClick={() => setShowCollega(false)} style={{ marginTop: '0.75rem', width: '100%', padding: '0.625rem', background: 'none', border: '1px solid #E2E8F0', borderRadius: '10px', color: '#888', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            Salta per ora
          </button>
        </Overlay>
      )}
    </div>
  )
}
