'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

interface Utente {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
  phone: string
  is_active: boolean
  two_factor_enabled: boolean
}

interface Ruolo {
  id: number
  codice: string
  nome: string
  sistema: boolean
  ordine: number
}

const EMPTY_FORM = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  role: 'genitore',
  phone: '',
  is_active: true,
  password: '',
}

export default function UtentiPage() {
  const router = useRouter()
  const locale = useLocale()

  const [utenti, setUtenti] = useState<Utente[]>([])
  const [ruoli, setRuoli] = useState<Ruolo[]>([])
  const [currentRole, setCurrentRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchRuoli = useCallback(async () => {
    const res = await fetch('/api/config/ruoli')
    if (res.ok) {
      const data = await res.json()
      setRuoli(Array.isArray(data) ? data : data.results ?? [])
    }
  }, [])

  const fetchUtenti = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterRole) params.set('role', filterRole)
    if (search) params.set('search', search)
    const res = await fetch(`/api/utenti?${params}`)
    if (res.ok) {
      const data = await res.json()
      setUtenti(Array.isArray(data) ? data : data.results ?? [])
    }
    setLoading(false)
  }, [filterRole, search])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(me => { setCurrentRole(me.role ?? '') })
      .catch(err => console.warn('[utenti] /api/auth/me fallito:', err))
  }, [])
  useEffect(() => { fetchRuoli() }, [fetchRuoli])
  useEffect(() => { fetchUtenti() }, [fetchUtenti])

  const nomeRuolo = (codice: string) =>
    ruoli.find(r => r.codice === codice)?.nome ?? codice

  const openNew = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setShowModal(true)
  }

  const openEdit = (u: Utente) => {
    setEditingId(u.id)
    setForm({
      username: u.username,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      phone: u.phone,
      is_active: u.is_active,
      password: '',
    })
    setError('')
    setShowModal(true)
  }

  const fmtErrors = (data: Record<string, unknown>) =>
    (data.detail as string) ?? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' — ')

  const handleSave = async () => {
    if (!form.email.trim()) { setError('L\'email è obbligatoria'); return }
    if (!editingId && !form.first_name.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true)
    setError('')
    const payload: Record<string, unknown> = { ...form }
    if (!payload.password) delete payload.password

    const url = editingId ? `/api/utenti/${editingId}` : '/api/utenti'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setShowModal(false)
      fetchUtenti()
    } else {
      const data = await res.json()
      setError(fmtErrors(data))
    }
    setSaving(false)
  }

  const toggleAttivo = async (u: Utente) => {
    const res = await fetch(`/api/utenti/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !u.is_active }),
    })
    if (res.ok) fetchUtenti()
  }

  // Raggruppa utenti per ruolo
  const grouped: Record<string, Utente[]> = {}
  for (const u of utenti) {
    if (!grouped[u.role]) grouped[u.role] = []
    grouped[u.role].push(u)
  }

  // Ordina le sezioni: prima i ruoli noti (in ordine API), poi eventuali sconosciuti
  const ruoliCodici = ruoli.map(r => r.codice)
  const ruoliSconosciuti = Object.keys(grouped).filter(r => !ruoliCodici.includes(r))

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F0FF' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)', padding: '1.5rem 1.5rem 2rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(1080px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button
              onClick={() => router.push(`/${locale}/dashboard/admin`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', fontWeight: 800 }}>👥 Gestione Utenti</h1>
              <p style={{ margin: '0.2rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>Account e ruoli del portale</p>
            </div>
            <button
              onClick={openNew}
              style={{ padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}
            >
              + Nuovo utente
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 'min(1080px, 96vw)', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Cerca nome, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '180px', padding: '0.6rem 1rem', borderRadius: '10px', border: '2px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit' }}
          />
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '2px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', background: 'white' }}
          >
            <option value="">Tutti i ruoli</option>
            {ruoli.map(r => <option key={r.codice} value={r.codice}>{r.nome}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6C5CE7' }}>Caricamento...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Sezioni per ruoli noti (in ordine dal DB) */}
            {ruoli.map(ruolo => {
              const list = grouped[ruolo.codice]
              if (!list || list.length === 0) return null
              return (
                <div key={ruolo.codice} style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 12px rgba(108,92,231,0.08)' }}>
                  <h3 style={{ margin: '0 0 1rem', color: '#6C5CE7', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {ruolo.nome} ({list.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {list.map(u => <UtenteRow key={u.id} u={u} currentRole={currentRole} onEdit={openEdit} onToggle={toggleAttivo} />)}
                  </div>
                </div>
              )
            })}
            {/* Sezioni per ruoli sconosciuti (legacy/rimossi) */}
            {ruoliSconosciuti.map(codice => {
              const list = grouped[codice]
              return (
                <div key={codice} style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 12px rgba(108,92,231,0.08)', borderLeft: '4px solid #FED7D7' }}>
                  <h3 style={{ margin: '0 0 1rem', color: '#E53E3E', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {codice} — ruolo rimosso ({list.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {list.map(u => <UtenteRow key={u.id} u={u} currentRole={currentRole} onEdit={openEdit} onToggle={toggleAttivo} />)}
                  </div>
                </div>
              )
            })}
            {utenti.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                Nessun utente trovato.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
        }}>
          <div style={{
            background: 'white', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ margin: '0 0 1.5rem', color: '#6C5CE7', fontSize: '1.25rem', fontWeight: 800 }}>
              {editingId ? `Modifica utente — ${nomeRuolo(form.role)}` : 'Nuovo utente'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Nome</label>
                  <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Cognome</label>
                  <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Username</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Email</label>
                <input type="email" value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); if (error) setError('') }}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: `1.5px solid ${error.includes('email') ? '#E53E3E' : '#D6CCFF'}`, fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Telefono</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>Ruolo</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                  {ruoli.filter(r => currentRole === 'admin' || r.codice !== 'admin').map(r => <option key={r.codice} value={r.codice}>{r.nome}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.25rem' }}>
                  Password {editingId && <span style={{ fontWeight: 400, color: '#999' }}>(lascia vuoto per non cambiare)</span>}
                </label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #D6CCFF', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Utente attivo
              </label>
            </div>

            {error && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#FFF5F5', borderRadius: '8px', color: '#E53E3E', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '0.75rem', background: '#F3F0FF', color: '#6C5CE7', border: '2px solid #D6CCFF', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex: 2, padding: '0.75rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Salvataggio...' : (editingId ? 'Salva modifiche' : 'Crea utente')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UtenteRow({ u, currentRole, onEdit, onToggle }: { u: Utente; currentRole: string; onEdit: (u: Utente) => void; onToggle: (u: Utente) => void }) {
  // Un utente admin può essere modificato solo da un altro admin
  const isAdminTarget = u.role === 'admin'
  const canModify = !isAdminTarget || currentRole === 'admin'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      borderRadius: '10px',
      background: u.is_active ? '#FAFAFA' : '#FFF5F5',
      border: `1px solid ${u.is_active ? '#EEE' : '#FED7D7'}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: u.is_active ? '#333' : '#999', fontSize: '0.9rem' }}>
          {u.first_name} {u.last_name || u.username}
          {!u.is_active && <span style={{ marginLeft: '0.5rem', color: '#E53E3E', fontSize: '0.75rem' }}>(disabilitato)</span>}
          {isAdminTarget && <span style={{ marginLeft: '0.5rem', color: '#6C5CE7', fontSize: '0.75rem', fontWeight: 700 }}>🛡️ Admin</span>}
        </div>
        <div style={{ color: '#888', fontSize: '0.8rem' }}>{u.email}</div>
        {u.phone && <div style={{ color: '#888', fontSize: '0.8rem' }}>{u.phone}</div>}
      </div>
      {canModify && (
        <>
          <button
            onClick={() => onEdit(u)}
            style={{ padding: '0.4rem 0.8rem', background: '#F3F0FF', color: '#6C5CE7', border: '1px solid #D6CCFF', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Modifica
          </button>
          <button
            onClick={() => onToggle(u)}
            style={{ padding: '0.4rem 0.8rem', background: u.is_active ? '#FFF5F5' : '#F0FFF4', color: u.is_active ? '#E53E3E' : '#38A169', border: `1px solid ${u.is_active ? '#FED7D7' : '#9AE6B4'}`, borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {u.is_active ? 'Disabilita' : 'Riabilita'}
          </button>
        </>
      )}
    </div>
  )
}
