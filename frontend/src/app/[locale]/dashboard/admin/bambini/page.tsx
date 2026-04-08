'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { formatApiErrors } from '@/lib/formatErrors'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Delega {
  id: number
  nome_delegato: string
  cognome_delegato: string
  documento_identita: string
  rapporto_familiare: string
  attivo: boolean
}

interface Famiglia {
  id: number
  genitore1: number
  genitore1_email: string
  genitore1_nome: string
  genitore1_telefono: string
  genitore1_codice_fiscale: string
  genitore1_indirizzo: string
  genitore2: number | null
  genitore2_email: string | null
  genitore2_nome: string | null
  genitore2_telefono: string | null
  genitore2_codice_fiscale: string
  genitore2_indirizzo: string
  indirizzo: string
  telefono_emergenza: string
  medico_base: string
}

interface Bambino {
  id: number
  nome: string
  cognome: string
  alias_nome: string
  alias_attivo: boolean
  data_nascita: string
  codice_fiscale: string
  foto_profilo: string | null
  gruppo: number | null
  gruppo_nome: string
  gruppo_colore: string
  orario_uscita: number | null
  orario_uscita_label: string
  data_iscrizione: string
  note_mediche: string
  attivo: boolean
  eta: number
  famiglia: Famiglia | null
  deleghe_ritiro: Delega[]
}

interface Gruppo {
  id: number
  nome: string
  colore: string
}

interface OrarioUscita {
  id: number
  etichetta: string
  orario: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(nome: string, cognome: string) {
  return `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase()
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: '100%', padding: '0.625rem 0.875rem',
  border: '2px solid #FFD4B3', borderRadius: '10px',
  fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#444', fontSize: '0.8rem' }}>
        {label}{required && <span style={{ color: '#E8562A', marginLeft: '0.2rem' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_BAMBINO = {
  nome: '', cognome: '', data_nascita: '', codice_fiscale: '',
  alias_nome: '', alias_attivo: false,
  gruppo: '', orario_uscita: '',
  data_iscrizione: new Date().toISOString().split('T')[0],
  note_mediche: '',
}

const EMPTY_FAMIGLIA = {
  genitore1_email: '',
  genitore1_nome: '',
  genitore1_cognome: '',
  genitore1_codice_fiscale: '',
  genitore2_email: '',
  genitore2_nome: '',
  genitore2_cognome: '',
  genitore2_codice_fiscale: '',
  telefono_emergenza: '',
  medico_base: '',
}

const EMPTY_DELEGA = {
  nome_delegato: '', cognome_delegato: '',
  documento_identita: '', rapporto_familiare: '',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BambiniPage() {
  const router = useRouter()
  const locale = useLocale()

  const [gruppi, setGruppi] = useState<Gruppo[]>([])
  const [orari, setOrari] = useState<OrarioUscita[]>([])

  const [bambini, setBambini] = useState<Bambino[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [filterGruppo, setFilterGruppo] = useState('')
  const [filterAttivo, setFilterAttivo] = useState<'all' | 'true' | 'false'>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Add bambino modal
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_BAMBINO)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Detail modal
  const [selected, setSelected] = useState<Bambino | null>(null)
  const [detailTab, setDetailTab] = useState<'genitore1' | 'genitore2'>('genitore1')

  // Edit bambino
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState(EMPTY_BAMBINO)
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const editFileRef = useRef<HTMLInputElement>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Family form (inside detail modal)
  const [showFamForm, setShowFamForm] = useState(false)
  const [famForm, setFamForm] = useState(EMPTY_FAMIGLIA)
  const [hasGenitore2, setHasGenitore2] = useState(false)
  const [famLoading, setFamLoading] = useState(false)
  const [famError, setFamError] = useState('')

  // Edit famiglia (PATCH telefono_emergenza + medico_base)
  const [editFam, setEditFam] = useState(false)
  const [editFamForm, setEditFamForm] = useState({ telefono_emergenza: '', medico_base: '' })
  const [editFamLoading, setEditFamLoading] = useState(false)
  const [editFamError, setEditFamError] = useState('')

  // Edit genitore User data (first_name, last_name, phone, CF)
  const [editGTab, setEditGTab] = useState<'genitore1' | 'genitore2' | null>(null)
  const [editGForm, setEditGForm] = useState({ first_name: '', last_name: '', phone: '', codice_fiscale: '' })
  const [editGLoading, setEditGLoading] = useState(false)
  const [editGError, setEditGError] = useState('')

  // Unlink family
  const [unlinkLoading, setUnlinkLoading] = useState(false)

  // Add genitore 2 to existing famiglia
  const [showAddG2, setShowAddG2] = useState(false)
  const [addG2Email, setAddG2Email] = useState('')
  const [addG2Nome, setAddG2Nome] = useState('')
  const [addG2Cognome, setAddG2Cognome] = useState('')
  const [addG2CF, setAddG2CF] = useState('')
  const [addG2Loading, setAddG2Loading] = useState(false)
  const [addG2Error, setAddG2Error] = useState('')

  // Add delega form
  const [showDelForm, setShowDelForm] = useState(false)
  const [delForm, setDelForm] = useState(EMPTY_DELEGA)
  const [delLoading, setDelLoading] = useState(false)
  const [delError, setDelError] = useState('')

  // ── Load config ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/config/gruppi').then(r => r.ok ? r.json() : []).then(data => {
      setGruppi(Array.isArray(data) ? data : (data.results ?? []))
    })
    fetch('/api/config/orari').then(r => r.ok ? r.json() : []).then(data => {
      setOrari(Array.isArray(data) ? data : (data.results ?? []))
    })
  }, [])

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchBambini = useCallback(async () => {
    setListError('')
    try {
      const params = new URLSearchParams()
      if (filterGruppo) params.set('gruppo', filterGruppo)
      if (filterAttivo !== 'all') params.set('attivo', filterAttivo)
      if (search) params.set('search', search)
      const res = await fetch(`/api/bambini?${params}`)
      if (res.status === 401) { router.push(`/${locale}/login`); return }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setBambini(Array.isArray(data) ? data : (data.results ?? []))
    } catch {
      setListError('Errore nel caricamento. Riprova.')
    } finally {
      setLoading(false)
    }
  }, [filterGruppo, filterAttivo, search, locale, router])

  useEffect(() => { fetchBambini() }, [fetchBambini])

  // ── Photo handling ─────────────────────────────────────────────────────────

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  const clearPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Add bambino ────────────────────────────────────────────────────────────

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (addForm.codice_fiscale && addForm.codice_fiscale.length !== 16) {
      setAddError('Il codice fiscale deve essere esattamente 16 caratteri.')
      return
    }
    setAddLoading(true)
    setAddError('')
    try {
      let body: BodyInit
      const headers: Record<string, string> = {}

      if (photoFile) {
        const fd = new FormData()
        fd.append('nome', addForm.nome)
        fd.append('cognome', addForm.cognome)
        fd.append('data_nascita', addForm.data_nascita)
        if (addForm.codice_fiscale) fd.append('codice_fiscale', addForm.codice_fiscale)
        if (addForm.alias_nome) fd.append('alias_nome', addForm.alias_nome)
        fd.append('alias_attivo', String(addForm.alias_attivo))
        if (addForm.gruppo) fd.append('gruppo', addForm.gruppo)
        if (addForm.orario_uscita) fd.append('orario_uscita', addForm.orario_uscita)
        fd.append('data_iscrizione', addForm.data_iscrizione)
        if (addForm.note_mediche) fd.append('note_mediche', addForm.note_mediche)
        fd.append('foto_profilo', photoFile)
        body = fd
      } else {
        const payload: Record<string, unknown> = { ...addForm }
        if (!payload.gruppo) delete payload.gruppo
        if (!payload.orario_uscita) delete payload.orario_uscita
        if (!payload.alias_nome) delete payload.alias_nome
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(payload)
      }

      const res = await fetch('/api/bambini', { method: 'POST', headers, body })
      const data = await res.json()
      if (!res.ok) { setAddError(formatErrors(data)); return }
      setShowAdd(false)
      setAddForm(EMPTY_BAMBINO)
      clearPhoto()
      await fetchBambini()
      setSelected(data)
      setShowFamForm(true)
    } catch { setAddError('Errore durante il salvataggio.') }
    finally { setAddLoading(false) }
  }

  // ── Add famiglia ───────────────────────────────────────────────────────────

  const openEditG = (tab: 'genitore1' | 'genitore2') => {
    if (!selected?.famiglia) return
    const isG1 = tab === 'genitore1'
    const nome = isG1 ? selected.famiglia.genitore1_nome : (selected.famiglia.genitore2_nome ?? '')
    const parts = (nome || '').split(' ')
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : ''
    const firstName = parts[0] || ''
    setEditGForm({
      first_name: firstName,
      last_name: lastName,
      phone: isG1 ? (selected.famiglia.genitore1_telefono || '') : (selected.famiglia.genitore2_telefono || ''),
      codice_fiscale: isG1 ? (selected.famiglia.genitore1_codice_fiscale || '') : (selected.famiglia.genitore2_codice_fiscale || ''),
    })
    setEditGError('')
    setEditGTab(tab)
    setEditFam(false)
    setShowAddG2(false)
  }

  const handleEditGSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected?.famiglia || !editGTab) return
    if (editGForm.codice_fiscale && editGForm.codice_fiscale.length !== 16) {
      setEditGError('Il codice fiscale deve essere esattamente 16 caratteri.')
      return
    }
    const userId = editGTab === 'genitore1' ? selected.famiglia.genitore1 : selected.famiglia.genitore2
    if (!userId) return
    setEditGLoading(true)
    setEditGError('')
    try {
      const res = await fetch(`/api/utenti/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editGForm),
      })
      const data = await res.json()
      if (!res.ok) { setEditGError(formatErrors(data)); return }
      setEditGTab(null)
      await fetchBambini()
      const updated = await fetch(`/api/bambini/${selected.id}`)
      if (updated.ok) setSelected(await updated.json())
    } catch { setEditGError('Errore durante il salvataggio.') }
    finally { setEditGLoading(false) }
  }

  const handleUnlinkFamiglia = async () => {
    if (!selected?.famiglia) return
    if (!confirm('Rimuovere la famiglia da questo bambino? Verranno rimossi entrambi i genitori associati.')) return
    setUnlinkLoading(true)
    try {
      const res = await fetch(`/api/famiglie/${selected.famiglia.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        await fetchBambini()
        const updated = await fetch(`/api/bambini/${selected.id}`)
        if (updated.ok) setSelected(await updated.json())
      }
    } catch { /* ignore */ }
    finally { setUnlinkLoading(false) }
  }

  const handleRemoveG1 = async () => {
    if (!selected?.famiglia) return
    const g2Id = selected.famiglia.genitore2
    const g2Nome = selected.famiglia.genitore2_nome || selected.famiglia.genitore2_email || 'Genitore 2'
    const msg = g2Id
      ? `Rimuovere il Genitore 1? ${g2Nome} diventerà il Genitore 1 e il posto Genitore 2 sarà libero.`
      : 'Nessun Genitore 2 presente: rimuovere il Genitore 1 eliminerà l\'intera famiglia.'
    if (!confirm(msg)) return
    setUnlinkLoading(true)
    try {
      if (g2Id) {
        // Promuovi G2 a G1, libera G2
        const res = await fetch(`/api/famiglie/${selected.famiglia.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ genitore1: g2Id, genitore2: null }),
        })
        if (res.ok) {
          await fetchBambini()
          const updated = await fetch(`/api/bambini/${selected.id}`)
          if (updated.ok) setSelected(await updated.json())
          setDetailTab('genitore1')
        }
      } else {
        // Nessun G2 → elimina famiglia
        const res = await fetch(`/api/famiglie/${selected.famiglia.id}`, { method: 'DELETE' })
        if (res.ok || res.status === 204) {
          await fetchBambini()
          const updated = await fetch(`/api/bambini/${selected.id}`)
          if (updated.ok) setSelected(await updated.json())
        }
      }
    } catch { /* ignore */ }
    finally { setUnlinkLoading(false) }
  }

  const handleRemoveG2 = async () => {
    if (!selected?.famiglia?.genitore2) return
    if (!confirm('Rimuovere il Genitore 2 da questa famiglia?')) return
    setUnlinkLoading(true)
    try {
      const res = await fetch(`/api/famiglie/${selected.famiglia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genitore2: null }),
      })
      if (res.ok) {
        await fetchBambini()
        const updated = await fetch(`/api/bambini/${selected.id}`)
        if (updated.ok) setSelected(await updated.json())
        setDetailTab('genitore1')
      }
    } catch { /* ignore */ }
    finally { setUnlinkLoading(false) }
  }

  const handleEditFamSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected?.famiglia) return
    setEditFamLoading(true)
    setEditFamError('')
    try {
      const res = await fetch(`/api/famiglie/${selected.famiglia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFamForm),
      })
      const data = await res.json()
      if (!res.ok) { setEditFamError(formatErrors(data)); return }
      setEditFam(false)
      const updated = await fetch(`/api/bambini/${selected.id}`)
      if (updated.ok) setSelected(await updated.json())
    } catch { setEditFamError('Errore durante il salvataggio.') }
    finally { setEditFamLoading(false) }
  }

  const handleAddG2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected?.famiglia) return
    if (addG2CF && addG2CF.length !== 16) {
      setAddG2Error('Il codice fiscale deve essere esattamente 16 caratteri.')
      return
    }
    setAddG2Loading(true)
    setAddG2Error('')
    try {
      const res = await fetch(`/api/famiglie/${selected.famiglia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genitore2_email: addG2Email,
          genitore2_nome: addG2Nome,
          genitore2_cognome: addG2Cognome,
          genitore2_codice_fiscale: addG2CF,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAddG2Error(formatErrors(data)); return }
      setShowAddG2(false)
      setAddG2Email(''); setAddG2Nome(''); setAddG2Cognome(''); setAddG2CF('')
      const updated = await fetch(`/api/bambini/${selected.id}`)
      if (updated.ok) setSelected(await updated.json())
    } catch { setAddG2Error('Errore durante il salvataggio.') }
    finally { setAddG2Loading(false) }
  }

  const handleFamSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (famForm.genitore1_codice_fiscale && famForm.genitore1_codice_fiscale.length !== 16) {
      setFamError('CF genitore 1 deve essere esattamente 16 caratteri.')
      return
    }
    if (hasGenitore2 && famForm.genitore2_codice_fiscale && famForm.genitore2_codice_fiscale.length !== 16) {
      setFamError('CF genitore 2 deve essere esattamente 16 caratteri.')
      return
    }
    setFamLoading(true)
    setFamError('')
    try {
      const payload = {
        ...famForm,
        bambino: selected.id,
        genitore2_email: hasGenitore2 ? famForm.genitore2_email : '',
        genitore2_codice_fiscale: hasGenitore2 ? famForm.genitore2_codice_fiscale : '',
      }
      const res = await fetch('/api/famiglie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setFamError(formatErrors(data)); return }
      setShowFamForm(false)
      setFamForm(EMPTY_FAMIGLIA)
      setHasGenitore2(false)
      await fetchBambini()
      const updated = await fetch(`/api/bambini/${selected.id}`)
      if (updated.ok) setSelected(await updated.json())
    } catch { setFamError('Errore durante il salvataggio.') }
    finally { setFamLoading(false) }
  }

  // ── Add delega ─────────────────────────────────────────────────────────────

  const handleDelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setDelLoading(true)
    setDelError('')
    try {
      const res = await fetch('/api/deleghe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...delForm, bambino: selected.id, attivo: true }),
      })
      const data = await res.json()
      if (!res.ok) { setDelError(formatErrors(data)); return }
      setShowDelForm(false)
      setDelForm(EMPTY_DELEGA)
      const updated = await fetch(`/api/bambini/${selected.id}`)
      if (updated.ok) setSelected(await updated.json())
    } catch { setDelError('Errore durante il salvataggio.') }
    finally { setDelLoading(false) }
  }

  // ── Open edit modal ────────────────────────────────────────────────────────

  const openEdit = (b: Bambino) => {
    setEditForm({
      nome: b.nome,
      cognome: b.cognome,
      alias_nome: b.alias_nome || '',
      alias_attivo: b.alias_attivo,
      data_nascita: b.data_nascita,
      codice_fiscale: b.codice_fiscale || '',
      gruppo: b.gruppo ? String(b.gruppo) : '',
      orario_uscita: b.orario_uscita ? String(b.orario_uscita) : '',
      data_iscrizione: b.data_iscrizione,
      note_mediche: b.note_mediche || '',
    })
    setEditPhotoFile(null)
    setEditPhotoPreview(b.foto_profilo || null)
    setEditError('')
    setShowEdit(true)
  }

  // ── Edit bambino ───────────────────────────────────────────────────────────

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setEditLoading(true)
    setEditError('')
    try {
      let body: BodyInit
      const headers: Record<string, string> = {}
      if (editPhotoFile) {
        const fd = new FormData()
        Object.entries(editForm).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, String(v)) })
        fd.append('foto_profilo', editPhotoFile)
        body = fd
      } else {
        headers['Content-Type'] = 'application/json'
        const payload: Record<string, unknown> = { ...editForm }
        if (!payload.gruppo) delete payload.gruppo
        if (!payload.orario_uscita) delete payload.orario_uscita
        body = JSON.stringify(payload)
      }
      const res = await fetch(`/api/bambini/${selected.id}`, { method: 'PATCH', headers, body })
      const data = await res.json()
      if (!res.ok) { setEditError(formatErrors(data)); return }
      setShowEdit(false)
      setSelected(data)
      await fetchBambini()
    } catch { setEditError('Errore durante il salvataggio.') }
    finally { setEditLoading(false) }
  }

  // ── Delete / toggle attivo ─────────────────────────────────────────────────

  const handleToggleAttivo = async () => {
    if (!selected) return
    if (!confirm(`${selected.attivo ? 'Disattivare' : 'Riattivare'} ${selected.nome} ${selected.cognome}?`)) return
    const res = await fetch(`/api/bambini/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !selected.attivo }),
    })
    if (res.ok) {
      const data = await res.json()
      setSelected(data)
      await fetchBambini()
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    if (!confirm(`Eliminare definitivamente ${selected.nome} ${selected.cognome}? Questa azione non può essere annullata.`)) return
    const res = await fetch(`/api/bambini/${selected.id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setSelected(null)
      await fetchBambini()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#FFF8F4' }}>
        <p style={{ color: '#E8562A', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F4' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #FF9A3C 0%, #E8562A 100%)',
        padding: '1.5rem 1.5rem 2rem', color: 'white',
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/admin`)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '0.5rem', fontFamily: 'inherit' }}
          >
            ← Dashboard
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>👶 Anagrafica Bambini</h1>
              <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
                {bambini.length} bambini registrati
              </p>
            </div>
            <button
              onClick={() => { setShowAdd(true); setAddError(''); clearPhoto(); setSelected(null); setShowEdit(false) }}
              style={{
                background: 'white', color: '#E8562A', border: 'none',
                borderRadius: '12px', padding: '0.75rem 1.25rem',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit',
              }}
            >
              + Nuovo bambino
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* ── Filtri ────────────────────────────────────────────────────────── */}
        <div style={{
          background: 'white', borderRadius: '16px', padding: '1rem 1.25rem',
          marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <input
            type="search" placeholder="🔍 Cerca per nome o cognome..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 200px', padding: '0.625rem 0.875rem', border: '2px solid #FFD4B3', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
          />
          <select
            value={filterGruppo} onChange={e => setFilterGruppo(e.target.value)}
            style={{ padding: '0.625rem 0.875rem', border: '2px solid #FFD4B3', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', background: 'white', cursor: 'pointer' }}
          >
            <option value="">Tutti i gruppi</option>
            {gruppi.map(g => <option key={g.id} value={String(g.id)}>{g.nome}</option>)}
          </select>
          <select
            value={filterAttivo} onChange={e => setFilterAttivo(e.target.value as typeof filterAttivo)}
            style={{ padding: '0.625rem 0.875rem', border: '2px solid #FFD4B3', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', background: 'white', cursor: 'pointer' }}
          >
            <option value="all">Tutti</option>
            <option value="true">Attivi</option>
            <option value="false">Non attivi</option>
          </select>
          <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
            {(['cards', 'table'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: '0.5rem 0.75rem', border: `2px solid ${viewMode === m ? '#E8562A' : '#FFD4B3'}`, borderRadius: '8px', background: viewMode === m ? '#E8562A' : 'white', color: viewMode === m ? 'white' : '#888', cursor: 'pointer', fontSize: '1rem', fontFamily: 'inherit' }}>
                {m === 'cards' ? '▦' : '☰'}
              </button>
            ))}
          </div>
        </div>

        {listError && (
          <div style={{ background: '#FADBD8', color: '#C0392B', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
            {listError}
          </div>
        )}

        {/* ── Lista ─────────────────────────────────────────────────────────── */}
        {bambini.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👶</div>
            <p style={{ margin: 0 }}>Nessun bambino trovato.</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {bambini.map(b => (
              <BambinoCard
                key={b.id}
                bambino={b}
                onClick={() => { setSelected(b); setShowFamForm(false); setShowDelForm(false); setShowEdit(false) }}
              />
            ))}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: '#FFF0E8' }}>
                  {['', 'Nome', 'Cognome', 'Gruppo', 'Orario uscita', 'Età', 'Data nascita', 'Genitore 1', 'CF', 'Stato'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 0.875rem', textAlign: 'left', fontWeight: 700, color: '#555', whiteSpace: 'nowrap', borderBottom: '2px solid #FFD4B3' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bambini.map((b, i) => {
                  const color = b.gruppo_colore || '#A29BFE'
                  return (
                    <tr key={b.id}
                      onClick={() => { setSelected(b); setShowFamForm(false); setShowDelForm(false); setShowEdit(false) }}
                      style={{ background: i % 2 === 0 ? 'white' : '#FFF8F4', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FFE8D6')}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FFF8F4')}
                    >
                      <td style={{ padding: '0.5rem 0.875rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>
                          {b.foto_profilo ? <img src={b.foto_profilo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(b.nome, b.cognome)}
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem 0.875rem', fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>{b.nome}{b.alias_attivo && b.alias_nome ? <span style={{ color: '#6C5CE7', fontSize: '0.72rem', marginLeft: '0.4rem' }}>({b.alias_nome})</span> : null}</td>
                      <td style={{ padding: '0.5rem 0.875rem', whiteSpace: 'nowrap' }}>{b.cognome}</td>
                      <td style={{ padding: '0.5rem 0.875rem' }}>
                        {b.gruppo_nome ? <span style={{ background: color, color: 'white', borderRadius: '12px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{b.gruppo_nome}</span> : <span style={{ color: '#ccc' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.5rem 0.875rem', color: '#555', whiteSpace: 'nowrap' }}>{b.orario_uscita_label || '—'}</td>
                      <td style={{ padding: '0.5rem 0.875rem', color: '#555' }}>{b.eta}</td>
                      <td style={{ padding: '0.5rem 0.875rem', color: '#555', whiteSpace: 'nowrap' }}>{b.data_nascita}</td>
                      <td style={{ padding: '0.5rem 0.875rem', color: '#555', whiteSpace: 'nowrap' }}>
                        {b.famiglia ? <span>{b.famiglia.genitore1_nome}<br /><span style={{ color: '#aaa', fontSize: '0.75rem' }}>{b.famiglia.genitore1_email}</span></span> : <span style={{ color: '#ccc' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.5rem 0.875rem', color: '#888', fontFamily: 'monospace', fontSize: '0.775rem' }}>{b.codice_fiscale || '—'}</td>
                      <td style={{ padding: '0.5rem 0.875rem' }}>
                        <span style={{ background: b.attivo ? '#D4EDDA' : '#F8D7DA', color: b.attivo ? '#155724' : '#721C24', borderRadius: '12px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                          {b.attivo ? 'Attivo' : 'Non attivo'}
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

      {/* ── Modal: Nuovo bambino ─────────────────────────────────────────────── */}
      {showAdd && (
        <Overlay onClose={() => { setShowAdd(false); clearPhoto() }}>
          <ModalHeader title="👶 Nuovo bambino" onClose={() => { setShowAdd(false); clearPhoto() }} />
          <form onSubmit={handleAddSubmit}>

            {/* Foto profilo */}
            <Field label="Foto profilo">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: '#FFD4B3', overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#E8562A', fontWeight: 700, fontSize: '1.25rem',
                }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '📷'}
                </div>
                <div style={{ flex: 1 }}>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    style={{ ...secondaryBtn, marginBottom: 0, marginRight: '0.5rem' }}>
                    Scegli foto
                  </button>
                  {photoPreview && (
                    <button type="button" onClick={clearPhoto} style={{ ...secondaryBtn, marginBottom: 0, color: '#C0392B', borderColor: '#FADBD8' }}>
                      Rimuovi
                    </button>
                  )}
                </div>
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Nome" required>
                <input type="text" required value={addForm.nome} onChange={e => setAddForm(p => ({ ...p, nome: e.target.value }))} style={inputSt} />
              </Field>
              <Field label="Cognome" required>
                <input type="text" required value={addForm.cognome} onChange={e => setAddForm(p => ({ ...p, cognome: e.target.value }))} style={inputSt} />
              </Field>
            </div>

            {/* Alias */}
            <div style={{ background: '#FFF8F4', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #FFD4B3' }}>
              <Field label="Nome alias / soprannome">
                <input type="text" value={addForm.alias_nome}
                  onChange={e => setAddForm(p => ({ ...p, alias_nome: e.target.value }))}
                  style={inputSt} placeholder="Es. Lilli, Teo..." />
              </Field>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#555' }}>
                <input type="checkbox" checked={addForm.alias_attivo}
                  onChange={e => setAddForm(p => ({ ...p, alias_attivo: e.target.checked }))} />
                Mostra alias ai genitori (nasconde il nome reale nella dashboard genitore)
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Data di nascita" required>
                <input type="date" required value={addForm.data_nascita} onChange={e => setAddForm(p => ({ ...p, data_nascita: e.target.value }))} style={inputSt} />
              </Field>
              <Field label="Codice fiscale">
                <input type="text" maxLength={16} value={addForm.codice_fiscale} onChange={e => setAddForm(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() }))} style={inputSt} placeholder="RSSMRA..." />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Gruppo">
                <select value={addForm.gruppo} onChange={e => setAddForm(p => ({ ...p, gruppo: e.target.value }))} style={{ ...inputSt, background: 'white' }}>
                  <option value="">— Nessun gruppo —</option>
                  {gruppi.map(g => <option key={g.id} value={String(g.id)}>{g.nome}</option>)}
                </select>
              </Field>
              <Field label="Orario uscita">
                <select value={addForm.orario_uscita} onChange={e => setAddForm(p => ({ ...p, orario_uscita: e.target.value }))} style={{ ...inputSt, background: 'white' }}>
                  <option value="">— Standard —</option>
                  {orari.map(o => <option key={o.id} value={String(o.id)}>{o.etichetta} ({o.orario})</option>)}
                </select>
              </Field>
            </div>
            <Field label="Data iscrizione" required>
              <input type="date" required value={addForm.data_iscrizione} onChange={e => setAddForm(p => ({ ...p, data_iscrizione: e.target.value }))} style={inputSt} />
            </Field>
            <Field label="Note mediche / allergie">
              <textarea rows={3} value={addForm.note_mediche} onChange={e => setAddForm(p => ({ ...p, note_mediche: e.target.value }))} style={{ ...inputSt, resize: 'vertical' }} />
            </Field>
            {addError && <ErrorBox>{addError}</ErrorBox>}
            <ModalActions onCancel={() => { setShowAdd(false); clearPhoto() }} loading={addLoading} submitLabel="Salva bambino" />
          </form>
        </Overlay>
      )}

      {/* ── Modal: Modifica bambino ──────────────────────────────────────────── */}
      {showEdit && selected && (
        <Overlay onClose={() => setShowEdit(false)} zIndex={1100}>
          <ModalHeader title={`✏️ Modifica — ${selected.nome} ${selected.cognome}`} onClose={() => setShowEdit(false)} />
          <form onSubmit={handleEditSubmit}>
            {/* Foto profilo */}
            <Field label="Foto profilo">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFD4B3', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E8562A', fontWeight: 700, fontSize: '1.25rem' }}>
                  {editPhotoPreview ? <img src={editPhotoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📷'}
                </div>
                <div style={{ flex: 1 }}>
                  <input ref={editFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setEditPhotoFile(f); setEditPhotoPreview(URL.createObjectURL(f)) } }} />
                  <button type="button" onClick={() => editFileRef.current?.click()} style={{ ...secondaryBtn, marginBottom: 0, marginRight: '0.5rem' }}>Cambia foto</button>
                  {editPhotoPreview && <button type="button" onClick={() => { setEditPhotoFile(null); setEditPhotoPreview(null) }} style={{ ...secondaryBtn, marginBottom: 0, color: '#C0392B', borderColor: '#FADBD8' }}>Rimuovi</button>}
                </div>
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Nome" required>
                <input type="text" required value={editForm.nome} onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} style={inputSt} />
              </Field>
              <Field label="Cognome" required>
                <input type="text" required value={editForm.cognome} onChange={e => setEditForm(p => ({ ...p, cognome: e.target.value }))} style={inputSt} />
              </Field>
            </div>
            <div style={{ background: '#FFF8F4', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #FFD4B3' }}>
              <Field label="Nome alias / soprannome">
                <input type="text" value={editForm.alias_nome} onChange={e => setEditForm(p => ({ ...p, alias_nome: e.target.value }))} style={inputSt} placeholder="Es. Lilli, Teo..." />
              </Field>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#555' }}>
                <input type="checkbox" checked={editForm.alias_attivo} onChange={e => setEditForm(p => ({ ...p, alias_attivo: e.target.checked }))} />
                Mostra alias ai genitori
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Data di nascita" required>
                <input type="date" required value={editForm.data_nascita} onChange={e => setEditForm(p => ({ ...p, data_nascita: e.target.value }))} style={inputSt} />
              </Field>
              <Field label="Codice fiscale">
                <input type="text" maxLength={16} value={editForm.codice_fiscale} onChange={e => setEditForm(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() }))} style={inputSt} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Gruppo">
                <select value={editForm.gruppo} onChange={e => setEditForm(p => ({ ...p, gruppo: e.target.value }))} style={{ ...inputSt, background: 'white' }}>
                  <option value="">— Nessun gruppo —</option>
                  {gruppi.map(g => <option key={g.id} value={String(g.id)}>{g.nome}</option>)}
                </select>
              </Field>
              <Field label="Orario uscita">
                <select value={editForm.orario_uscita} onChange={e => setEditForm(p => ({ ...p, orario_uscita: e.target.value }))} style={{ ...inputSt, background: 'white' }}>
                  <option value="">— Standard —</option>
                  {orari.map(o => <option key={o.id} value={String(o.id)}>{o.etichetta} ({o.orario})</option>)}
                </select>
              </Field>
            </div>
            <Field label="Data iscrizione" required>
              <input type="date" required value={editForm.data_iscrizione} onChange={e => setEditForm(p => ({ ...p, data_iscrizione: e.target.value }))} style={inputSt} />
            </Field>
            <Field label="Note mediche / allergie">
              <textarea rows={3} value={editForm.note_mediche} onChange={e => setEditForm(p => ({ ...p, note_mediche: e.target.value }))} style={{ ...inputSt, resize: 'vertical' }} />
            </Field>
            {editError && <ErrorBox>{editError}</ErrorBox>}
            <ModalActions onCancel={() => setShowEdit(false)} loading={editLoading} submitLabel="Salva modifiche" />
          </form>
        </Overlay>
      )}

      {/* ── Modal: Dettaglio bambino ─────────────────────────────────────────── */}
      {selected && (
        <Overlay onClose={() => { setSelected(null); setShowEdit(false); setDetailTab('genitore1'); setEditFam(false); setShowAddG2(false); setEditGTab(null) }}>
          <ModalHeader
            title={`${selected.nome} ${selected.cognome}`}
            onClose={() => { setSelected(null); setShowEdit(false); setDetailTab('genitore1'); setEditFam(false); setShowAddG2(false); setEditGTab(null) }}
          />

          {/* Avatar + Info base */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: selected.gruppo_colore || '#A29BFE',
              overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '1.25rem',
            }}>
              {selected.foto_profilo
                ? <img src={selected.foto_profilo} alt={initials(selected.nome, selected.cognome)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials(selected.nome, selected.cognome)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selected.gruppo_nome && <Badge color={selected.gruppo_colore || '#A29BFE'}>{selected.gruppo_nome}</Badge>}
                {selected.orario_uscita_label && <Badge color="#6C5CE7">🕐 {selected.orario_uscita_label}</Badge>}
                <Badge color={selected.attivo ? '#27AE60' : '#E67E22'}>{selected.attivo ? 'Attivo' : 'Non attivo'}</Badge>
                <Badge color="#888">{selected.eta} anni · {selected.data_nascita}</Badge>
              </div>
              {selected.alias_nome && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#888' }}>
                  Alias: <strong>{selected.alias_nome}</strong>
                  {selected.alias_attivo
                    ? <span style={{ color: '#27AE60', marginLeft: '0.4rem' }}>✓ attivo</span>
                    : <span style={{ color: '#aaa', marginLeft: '0.4rem' }}>non attivo</span>}
                </p>
              )}
            </div>
          </div>

          {selected.note_mediche && (
            <div style={{ background: '#FFF8E7', border: '1px solid #FFD87F', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#7D5A00' }}>
              <strong>⚕️ Note mediche:</strong> {selected.note_mediche}
            </div>
          )}

          {/* ── Famiglia ──────────────────────────────────────────────────── */}
          <SectionTitle>👨‍👩‍👧 Famiglia</SectionTitle>
          {selected.famiglia ? (
            <div style={{ background: '#F8F9FA', borderRadius: '12px', marginBottom: '1rem', overflow: 'hidden' }}>
              {/* Tab selector */}
              <div style={{ display: 'flex', borderBottom: '1px solid #E9ECEF' }}>
                {[
                  { k: 'genitore1' as const, l: `👤 ${selected.famiglia.genitore1_nome || 'Genitore 1'}` },
                  ...(selected.famiglia.genitore2_email
                    ? [{ k: 'genitore2' as const, l: `👤 ${selected.famiglia.genitore2_nome || 'Genitore 2'}` }]
                    : []),
                ].map(({ k, l }) => (
                  <button key={k} onClick={() => setDetailTab(k)} style={{ flex: 1, padding: '0.625rem 0.5rem', background: detailTab === k ? 'white' : 'transparent', border: 'none', borderBottom: detailTab === k ? '2px solid #E8562A' : '2px solid transparent', fontWeight: detailTab === k ? 700 : 400, fontSize: '0.8rem', color: detailTab === k ? '#E8562A' : '#666', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l}
                  </button>
                ))}
              </div>
              {/* Tab content */}
              <div style={{ padding: '1rem', fontSize: '0.875rem' }}>
                {detailTab === 'genitore1' && (
                  <div style={{ display: 'grid', gap: '0.375rem' }}>
                    {selected.famiglia.genitore1_email && (
                      <p style={{ margin: 0 }}>✉️ <a href={`mailto:${selected.famiglia.genitore1_email}`} style={{ color: '#E8562A', textDecoration: 'none' }}>{selected.famiglia.genitore1_email}</a></p>
                    )}
                    {selected.famiglia.genitore1_telefono && <p style={{ margin: 0 }}>📱 {selected.famiglia.genitore1_telefono}</p>}
                    {selected.famiglia.genitore1_codice_fiscale && <p style={{ margin: 0, fontFamily: 'monospace', color: '#555' }}>CF: {selected.famiglia.genitore1_codice_fiscale}</p>}
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #E9ECEF', display: 'grid', gap: '0.25rem' }}>
                      {selected.famiglia.medico_base && <p style={{ margin: 0 }}>🩺 Medico: {selected.famiglia.medico_base}</p>}
                      {selected.famiglia.telefono_emergenza && <p style={{ margin: 0, fontWeight: 700, color: '#C0392B' }}>📞 Tel. emergenza: {selected.famiglia.telefono_emergenza}</p>}
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEditG('genitore1')}
                        style={{ padding: '0.375rem 0.75rem', background: 'none', border: '1px solid #FFD4B3', borderRadius: '6px', color: '#E8562A', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✏️ Modifica dati Genitore 1
                      </button>
                      <button onClick={handleRemoveG1} disabled={unlinkLoading}
                        style={{ padding: '0.375rem 0.75rem', background: 'none', border: '1px solid #FADBD8', borderRadius: '6px', color: '#C0392B', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        🔗 Scollega G1
                      </button>
                    </div>
                  </div>
                )}
                {detailTab === 'genitore2' && selected.famiglia.genitore2_email && (
                  <div style={{ display: 'grid', gap: '0.375rem' }}>
                    {selected.famiglia.genitore2_email && (
                      <p style={{ margin: 0 }}>✉️ <a href={`mailto:${selected.famiglia.genitore2_email}`} style={{ color: '#E8562A', textDecoration: 'none' }}>{selected.famiglia.genitore2_email}</a></p>
                    )}
                    {selected.famiglia.genitore2_telefono && <p style={{ margin: 0 }}>📱 {selected.famiglia.genitore2_telefono}</p>}
                    {selected.famiglia.genitore2_codice_fiscale && <p style={{ margin: 0, fontFamily: 'monospace', color: '#555' }}>CF: {selected.famiglia.genitore2_codice_fiscale}</p>}
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #E9ECEF', display: 'grid', gap: '0.25rem' }}>
                      {selected.famiglia.medico_base && <p style={{ margin: 0 }}>🩺 Medico: {selected.famiglia.medico_base}</p>}
                      {selected.famiglia.telefono_emergenza && <p style={{ margin: 0, fontWeight: 700, color: '#C0392B' }}>📞 Tel. emergenza: {selected.famiglia.telefono_emergenza}</p>}
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEditG('genitore2')}
                        style={{ padding: '0.375rem 0.75rem', background: 'none', border: '1px solid #FFD4B3', borderRadius: '6px', color: '#E8562A', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✏️ Modifica dati Genitore 2
                      </button>
                      <button onClick={handleRemoveG2} disabled={unlinkLoading}
                        style={{ padding: '0.375rem 0.75rem', background: 'none', border: '1px solid #FADBD8', borderRadius: '6px', color: '#C0392B', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        🔗 Scollega G2
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Family action buttons */}
              <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid #E9ECEF', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => {
                  setEditFamForm({ telefono_emergenza: selected.famiglia!.telefono_emergenza || '', medico_base: selected.famiglia!.medico_base || '' })
                  setEditFam(true); setShowAddG2(false); setEditGTab(null)
                }} style={{ ...secondaryBtn, marginBottom: 0, fontSize: '0.75rem' }}>✏️ Telefono / Medico</button>
                {!selected.famiglia.genitore2_email && (
                  <button onClick={() => { setShowAddG2(true); setEditFam(false); setEditGTab(null) }}
                    style={{ ...secondaryBtn, marginBottom: 0, fontSize: '0.75rem' }}>+ Aggiungi Genitore 2</button>
                )}
                <button onClick={handleUnlinkFamiglia} disabled={unlinkLoading}
                  style={{ ...secondaryBtn, marginBottom: 0, fontSize: '0.75rem', marginLeft: 'auto', color: '#C0392B', borderColor: '#FADBD8' }}>
                  🔗 Rimuovi famiglia
                </button>
              </div>
            </div>
          ) : (
            <p style={{ color: '#aaa', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Nessuna famiglia registrata.</p>
          )}

          {!selected.famiglia && !showFamForm && (
            <button onClick={() => setShowFamForm(true)} style={secondaryBtn}>+ Aggiungi famiglia</button>
          )}

          {/* Edit famiglia (telefono emergenza + medico base) */}
          {editFam && selected.famiglia && (
            <form onSubmit={handleEditFamSubmit} style={{ background: '#FFF8F4', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#E8562A' }}>Modifica dati famiglia</p>
              <Field label="Telefono emergenza" required>
                <input type="tel" required value={editFamForm.telefono_emergenza}
                  onChange={e => setEditFamForm(p => ({ ...p, telefono_emergenza: e.target.value }))}
                  style={inputSt} placeholder="+39 333..." />
              </Field>
              <Field label="Medico di base">
                <input type="text" value={editFamForm.medico_base}
                  onChange={e => setEditFamForm(p => ({ ...p, medico_base: e.target.value }))}
                  style={inputSt} />
              </Field>
              {editFamError && <ErrorBox>{editFamError}</ErrorBox>}
              <ModalActions onCancel={() => setEditFam(false)} loading={editFamLoading} submitLabel="Salva" />
            </form>
          )}

          {/* Edit genitore User data */}
          {editGTab && selected.famiglia && (
            <form onSubmit={handleEditGSubmit} style={{ background: '#FFF8F4', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#E8562A' }}>
                Modifica {editGTab === 'genitore1' ? 'Genitore 1' : 'Genitore 2'} — {editGTab === 'genitore1' ? selected.famiglia.genitore1_email : selected.famiglia.genitore2_email}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Nome">
                  <input type="text" value={editGForm.first_name}
                    onChange={e => setEditGForm(p => ({ ...p, first_name: e.target.value }))} style={inputSt} />
                </Field>
                <Field label="Cognome">
                  <input type="text" value={editGForm.last_name}
                    onChange={e => setEditGForm(p => ({ ...p, last_name: e.target.value }))} style={inputSt} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Telefono">
                  <input type="tel" value={editGForm.phone}
                    onChange={e => setEditGForm(p => ({ ...p, phone: e.target.value }))} style={inputSt} />
                </Field>
                <Field label="Codice fiscale">
                  <input type="text" maxLength={16} value={editGForm.codice_fiscale}
                    onChange={e => setEditGForm(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() }))} style={inputSt} placeholder="RSSMRA..." />
                </Field>
              </div>
              {editGError && <ErrorBox>{editGError}</ErrorBox>}
              <ModalActions onCancel={() => { setEditGTab(null); setEditGError('') }} loading={editGLoading} submitLabel="Salva" />
            </form>
          )}

          {/* Add genitore 2 to existing famiglia */}
          {showAddG2 && selected.famiglia && (
            <form onSubmit={handleAddG2Submit} style={{ background: '#FFF8F4', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#E8562A' }}>Aggiungi Genitore 2</p>
              <Field label="Email" required>
                <input type="email" required value={addG2Email}
                  onChange={e => setAddG2Email(e.target.value)}
                  style={inputSt} placeholder="genitore2@email.it" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Nome">
                  <input type="text" value={addG2Nome} onChange={e => setAddG2Nome(e.target.value)} style={inputSt} />
                </Field>
                <Field label="Cognome">
                  <input type="text" value={addG2Cognome} onChange={e => setAddG2Cognome(e.target.value)} style={inputSt} />
                </Field>
              </div>
              <Field label="Codice fiscale">
                <input type="text" maxLength={16} value={addG2CF}
                  onChange={e => setAddG2CF(e.target.value.toUpperCase())}
                  style={inputSt} placeholder="RSSMRA..." />
              </Field>
              {addG2Error && <ErrorBox>{addG2Error}</ErrorBox>}
              <ModalActions onCancel={() => { setShowAddG2(false); setAddG2Error('') }} loading={addG2Loading} submitLabel="Aggiungi" />
            </form>
          )}

          {showFamForm && (
            <form onSubmit={handleFamSubmit} style={{ background: '#FFF8F4', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#E8562A' }}>Genitore 1</p>
              <Field label="Email genitore 1" required>
                <input type="email" required value={famForm.genitore1_email}
                  onChange={e => setFamForm(p => ({ ...p, genitore1_email: e.target.value }))}
                  style={inputSt} placeholder="genitore@email.it" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Nome">
                  <input type="text" value={famForm.genitore1_nome}
                    onChange={e => setFamForm(p => ({ ...p, genitore1_nome: e.target.value }))}
                    style={inputSt} placeholder="Mario" />
                </Field>
                <Field label="Cognome">
                  <input type="text" value={famForm.genitore1_cognome}
                    onChange={e => setFamForm(p => ({ ...p, genitore1_cognome: e.target.value }))}
                    style={inputSt} placeholder="Rossi" />
                </Field>
              </div>
              <Field label="Codice fiscale">
                <input type="text" maxLength={16} value={famForm.genitore1_codice_fiscale}
                  onChange={e => setFamForm(p => ({ ...p, genitore1_codice_fiscale: e.target.value.toUpperCase() }))}
                  style={inputSt} placeholder="RSSMRA..." />
              </Field>

              {/* Toggle genitore 2 */}
              <div style={{ margin: '0.75rem 0', borderTop: '1px solid #FFD4B3', paddingTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#555', fontWeight: 600 }}>
                  <input type="checkbox" checked={hasGenitore2} onChange={e => setHasGenitore2(e.target.checked)} />
                  Aggiungi secondo genitore
                </label>
              </div>

              {hasGenitore2 && (
                <>
                  <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#E8562A' }}>Genitore 2</p>
                  <Field label="Email genitore 2" required>
                    <input type="email" required={hasGenitore2} value={famForm.genitore2_email}
                      onChange={e => setFamForm(p => ({ ...p, genitore2_email: e.target.value }))}
                      style={inputSt} placeholder="genitore2@email.it" />
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Field label="Nome">
                      <input type="text" value={famForm.genitore2_nome}
                        onChange={e => setFamForm(p => ({ ...p, genitore2_nome: e.target.value }))}
                        style={inputSt} placeholder="Laura" />
                    </Field>
                    <Field label="Cognome">
                      <input type="text" value={famForm.genitore2_cognome}
                        onChange={e => setFamForm(p => ({ ...p, genitore2_cognome: e.target.value }))}
                        style={inputSt} placeholder="Rossi" />
                    </Field>
                  </div>
                  <Field label="Codice fiscale">
                    <input type="text" maxLength={16} value={famForm.genitore2_codice_fiscale}
                      onChange={e => setFamForm(p => ({ ...p, genitore2_codice_fiscale: e.target.value.toUpperCase() }))}
                      style={inputSt} placeholder="RSSMRA..." />
                  </Field>
                </>
              )}

              <div style={{ borderTop: '1px solid #FFD4B3', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <Field label="Telefono emergenza" required>
                  <input type="tel" required value={famForm.telefono_emergenza}
                    onChange={e => setFamForm(p => ({ ...p, telefono_emergenza: e.target.value }))}
                    style={inputSt} placeholder="+39 333..." />
                </Field>
                <Field label="Medico di base">
                  <input type="text" value={famForm.medico_base}
                    onChange={e => setFamForm(p => ({ ...p, medico_base: e.target.value }))}
                    style={inputSt} />
                </Field>
              </div>

              {famError && <ErrorBox>{famError}</ErrorBox>}
              <ModalActions onCancel={() => setShowFamForm(false)} loading={famLoading} submitLabel="Salva famiglia" />
            </form>
          )}

          {/* ── Deleghe ritiro ───────────────────────────────────────────── */}
          <SectionTitle style={{ marginTop: '1.25rem' }}>🚗 Deleghe di ritiro</SectionTitle>
          {selected.deleghe_ritiro.length > 0 ? (
            <div style={{ marginBottom: '0.75rem' }}>
              {selected.deleghe_ritiro.map(d => (
                <div key={d.id} style={{
                  background: '#F8F9FA', borderRadius: '8px', padding: '0.625rem 0.875rem',
                  marginBottom: '0.5rem', fontSize: '0.875rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>{d.cognome_delegato} {d.nome_delegato} — <em>{d.rapporto_familiare}</em></span>
                  <Badge color={d.attivo ? '#27AE60' : '#aaa'}>{d.attivo ? '✓' : '✗'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#aaa', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Nessuna delega registrata.</p>
          )}

          {!showDelForm && (
            <button onClick={() => setShowDelForm(true)} style={secondaryBtn}>+ Aggiungi delega</button>
          )}

          {showDelForm && (
            <form onSubmit={handleDelSubmit} style={{ background: '#FFF8F4', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', marginTop: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Nome delegato" required>
                  <input type="text" required value={delForm.nome_delegato} onChange={e => setDelForm(p => ({ ...p, nome_delegato: e.target.value }))} style={inputSt} />
                </Field>
                <Field label="Cognome delegato" required>
                  <input type="text" required value={delForm.cognome_delegato} onChange={e => setDelForm(p => ({ ...p, cognome_delegato: e.target.value }))} style={inputSt} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Documento identità" required>
                  <input type="text" required value={delForm.documento_identita} onChange={e => setDelForm(p => ({ ...p, documento_identita: e.target.value }))} style={inputSt} placeholder="CI/Passaporto n°..." />
                </Field>
                <Field label="Rapporto familiare" required>
                  <input type="text" required value={delForm.rapporto_familiare} onChange={e => setDelForm(p => ({ ...p, rapporto_familiare: e.target.value }))} style={inputSt} placeholder="Nonno, Zio..." />
                </Field>
              </div>
              {delError && <ErrorBox>{delError}</ErrorBox>}
              <ModalActions onCancel={() => setShowDelForm(false)} loading={delLoading} submitLabel="Salva delega" />
            </form>
          )}

          {/* Azioni — in fondo al modal */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #F0F0F0', flexWrap: 'wrap' }}>
            <button onClick={() => openEdit(selected)} style={{ ...secondaryBtn, marginBottom: 0, background: '#E8562A', color: 'white', border: 'none' }}>✏️ Modifica</button>
            <button onClick={handleToggleAttivo}
              style={{ ...secondaryBtn, marginBottom: 0, color: selected.attivo ? '#E67E22' : '#27AE60', borderColor: selected.attivo ? '#FDEBD0' : '#D5F5E3' }}>
              {selected.attivo ? '⏸ Disattiva' : '▶ Riattiva'}
            </button>
            <button onClick={handleDelete}
              style={{ ...secondaryBtn, marginBottom: 0, marginLeft: 'auto', color: '#C0392B', borderColor: '#FADBD8' }}>
              🗑 Elimina
            </button>
          </div>
        </Overlay>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GenitoreInfo({ label, nome, email, telefono, cf, indirizzo }: {
  label: string; nome: string; email: string; telefono: string; cf: string; indirizzo: string
}) {
  return (
    <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E9ECEF' }}>
      <p style={{ margin: '0 0 0.25rem', fontWeight: 700, color: '#555', fontSize: '0.8rem', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '0 0 0.15rem' }}>{nome} — <a href={`mailto:${email}`} style={{ color: '#E8562A', textDecoration: 'none' }}>{email}</a></p>
      {telefono && <p style={{ margin: '0 0 0.15rem', color: '#666' }}>📱 {telefono}</p>}
      {cf && <p style={{ margin: '0 0 0.15rem', color: '#666' }}>CF: {cf}</p>}
      {indirizzo && <p style={{ margin: 0, color: '#666' }}>🏠 {indirizzo}</p>}
    </div>
  )
}

function BambinoCard({ bambino, onClick }: { bambino: Bambino; onClick: () => void }) {
  const color = bambino.gruppo_colore || '#A29BFE'
  const ini = initials(bambino.nome, bambino.cognome)
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white', borderRadius: '16px', padding: '1.25rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        display: 'flex', gap: '1rem', alignItems: 'flex-start',
        cursor: 'pointer', transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)')}
    >
      <div style={{
        width: 48, height: 48, borderRadius: '50%', background: color, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '1rem', flexShrink: 0, overflow: 'hidden',
      }}>
        {bambino.foto_profilo
          ? <img src={bambino.foto_profilo} alt={ini} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : ini}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {bambino.nome} {bambino.cognome}
        </p>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
          {bambino.gruppo_nome && <Badge color={color}>{bambino.gruppo_nome}</Badge>}
          {bambino.alias_attivo && <Badge color="#6C5CE7">alias</Badge>}
        </div>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', fontWeight: 700, color: bambino.attivo ? '#27AE60' : '#E67E22' }}>
          {bambino.attivo ? '● Attivo' : '● Non attivo'}
        </p>
        <p style={{ margin: '0.25rem 0 0', color: '#aaa', fontSize: '0.775rem' }}>
          {bambino.eta} anni · {bambino.data_nascita}
          {bambino.famiglia ? ' · 👨‍👩‍👧' : ''}
          {bambino.orario_uscita_label ? ` · 🕐 ${bambino.orario_uscita_label}` : ''}
        </p>
      </div>
    </div>
  )
}

function Overlay({ children, onClose, zIndex = 1000 }: { children: React.ReactNode; onClose: () => void; zIndex?: number }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <h2 style={{ margin: 0, color: '#E8562A', fontSize: '1.2rem', fontWeight: 800 }}>{title}</h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
    </div>
  )
}

function ModalActions({ onCancel, loading, submitLabel }: { onCancel: () => void; loading: boolean; submitLabel: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
      <button type="button" onClick={onCancel} style={{ flex: 1, padding: '0.75rem', border: '2px solid #FFD4B3', borderRadius: '10px', background: 'white', color: '#666', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        Annulla
      </button>
      <button type="submit" disabled={loading} style={{ flex: 2, padding: '0.75rem', background: loading ? '#FFB8A0' : '#E8562A', border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
        {loading ? 'Salvataggio...' : submitLabel}
      </button>
    </div>
  )
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ background: color, color: 'white', padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
      {children}
    </span>
  )
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: '#555', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', ...style }}>
      {children}
    </p>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
      {children}
    </div>
  )
}

const secondaryBtn: React.CSSProperties = {
  padding: '0.5rem 1rem', background: 'none', border: '2px solid #FFD4B3',
  borderRadius: '8px', color: '#E8562A', fontSize: '0.8rem', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', marginBottom: '0.5rem',
}

const formatErrors = formatApiErrors
