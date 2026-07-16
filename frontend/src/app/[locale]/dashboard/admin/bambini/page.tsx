'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { formatApiErrors } from '@/lib/formatErrors'
import UserChip from '@/components/UserChip'

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

interface PiattoRef {
  id: number
  descrizione: string
  tipo: string
  tipo_label?: string
}

const TIPO_COLOR_MENU: Record<string, string> = {
  colazione: '#F39C12', primo: '#E17055', secondo: '#D63031',
  monopiatto: '#6C5CE7', contorno: '#00B894', pane: '#FDCB6E',
  frutta: '#00CEC9', merenda: '#A29BFE',
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

interface GenitoreLight {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(nome: string, cognome: string) {
  return `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase()
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: '100%', padding: '0.625rem 0.875rem',
  border: '2px solid #DDD6FE', borderRadius: '10px',
  fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#444', fontSize: '0.8rem' }}>
        {label}{required && <span style={{ color: '#4834D4', marginLeft: '0.2rem' }}>*</span>}
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
  const [genitori, setGenitori] = useState<GenitoreLight[]>([])

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
  const [detailSection, setDetailSection] = useState<'anagrafica' | 'famiglia' | 'deleghe'>('anagrafica')

  // Edit bambino
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState(EMPTY_BAMBINO)
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const editFileRef = useRef<HTMLInputElement>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // "Collega genitore" modal
  const [showCollegaG, setShowCollegaG] = useState(false)
  const [collegaGSlot, setCollegaGSlot] = useState<'genitore1' | 'genitore2'>('genitore1')
  const [collegaGTab, setCollegaGTab] = useState<'cerca' | 'crea'>('cerca')
  const [collegaGSearch, setCollegaGSearch] = useState('')
  const [collegaGSelected, setCollegaGSelected] = useState<GenitoreLight | null>(null)
  const [collegaGTelEmerg, setCollegaGTelEmerg] = useState('')
  const [collegaGMedico, setCollegaGMedico] = useState('')
  const [collegaGLoading, setCollegaGLoading] = useState(false)
  const [collegaGError, setCollegaGError] = useState('')
  // "Crea nuovo" tab in collega modal
  const [nuovoGEmail, setNuovoGEmail] = useState('')
  const [nuovoGNome, setNuovoGNome] = useState('')
  const [nuovoGCognome, setNuovoGCognome] = useState('')
  const [nuovoGPhone, setNuovoGPhone] = useState('')
  const [nuovoGCF, setNuovoGCF] = useState('')
  const [nuovoGLoading, setNuovoGLoading] = useState(false)
  const [nuovoGError, setNuovoGError] = useState('')

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

  // Report mensile
  const [showReportPicker, setShowReportPicker] = useState(false)
  const [gdprLoading, setGdprLoading] = useState(false)
  const [reportAnno, setReportAnno] = useState(new Date().getFullYear())
  const [reportMese, setReportMese] = useState(new Date().getMonth() + 1)
  const [reportLoading, setReportLoading] = useState(false)

  // Preferenza menu bambino
  const [prefMenu, setPrefMenu] = useState<{ id: number; tipo: string; tipo_label: string; descrizione: string; piatti_alternativi_dettaglio: PiattoRef[] } | null>(null)
  const [editingPref, setEditingPref] = useState(false)
  const [prefForm, setPrefForm] = useState<{ tipo: string; descrizione: string; piatti: number[] }>({ tipo: 'monopiatto', descrizione: '', piatti: [] })
  const [prefLoading, setPrefLoading] = useState(false)
  const [prefError, setPrefError] = useState('')
  const [catalogoPiatti, setCatalogoPiatti] = useState<PiattoRef[]>([])


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
    fetch('/api/utenti?role=genitore&ordering=last_name&page_size=500')
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setGenitori(d.results ?? d))
    fetch('/api/pappe/piatti')
      .then(r => r.ok ? r.json() : [])
      .then((d: unknown) => setCatalogoPiatti((Array.isArray(d) ? d : ((d as { results?: unknown[] }).results ?? [])) as PiattoRef[]))
      .catch(() => {})
  }, [])

  // Carica preferenza menu quando si apre un bambino
  useEffect(() => {
    if (!selected) { setPrefMenu(null); setEditingPref(false); setPrefError(''); return }
    fetch(`/api/pappe/preferenze-menu?bambino=${selected.id}`)
      .then(r => r.ok ? r.json() : [])
      .then((d: unknown) => {
        const arr = Array.isArray(d) ? d : ((d as { results?: unknown[] }).results ?? [])
        const pref = (arr as { id: number; tipo: string; tipo_label: string; descrizione: string; piatti_alternativi_dettaglio: PiattoRef[] }[])[0] ?? null
        setPrefMenu(pref)
        if (pref) setPrefForm({ tipo: pref.tipo, descrizione: pref.descrizione, piatti: (pref.piatti_alternativi_dettaglio ?? []).map(p => p.id) })
      })
      .catch(() => {})
  }, [selected])

  const refreshGenitori = () =>
    fetch('/api/utenti?role=genitore&ordering=last_name&page_size=500')
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setGenitori(d.results ?? d))

  const openCollegaG = (slot: 'genitore1' | 'genitore2') => {
    setCollegaGSlot(slot)
    setCollegaGTab('cerca')
    setCollegaGSearch('')
    setCollegaGSelected(null)
    setCollegaGTelEmerg('')
    setCollegaGMedico('')
    setCollegaGError('')
    setNuovoGEmail(''); setNuovoGNome(''); setNuovoGCognome(''); setNuovoGPhone(''); setNuovoGCF('')
    setNuovoGError('')
    setShowCollegaG(true)
  }

  const closeCollegaG = () => setShowCollegaG(false)

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
      openCollegaG('genitore1')
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
    setShowCollegaG(false)
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

  const handleCollegaCercaConfirma = async () => {
    if (!selected || !collegaGSelected) return
    if (collegaGSlot === 'genitore1' && !collegaGTelEmerg) {
      setCollegaGError('Inserisci il telefono di emergenza.')
      return
    }
    setCollegaGLoading(true)
    setCollegaGError('')
    try {
      if (collegaGSlot === 'genitore1') {
        const res = await fetch('/api/famiglie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bambino: selected.id,
            genitore1_email: collegaGSelected.email,
            genitore1_nome: collegaGSelected.first_name,
            genitore1_cognome: collegaGSelected.last_name,
            telefono_emergenza: collegaGTelEmerg,
            medico_base: collegaGMedico,
          }),
        })
        if (!res.ok) { const e = await res.json(); setCollegaGError(formatErrors(e)); return }
      } else {
        if (!selected.famiglia) return
        const res = await fetch(`/api/famiglie/${selected.famiglia.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            genitore2_email: collegaGSelected.email,
            genitore2_nome: collegaGSelected.first_name,
            genitore2_cognome: collegaGSelected.last_name,
          }),
        })
        if (!res.ok) { const e = await res.json(); setCollegaGError(formatErrors(e)); return }
      }
      setShowCollegaG(false)
      await fetchBambini()
      const updated = await fetch(`/api/bambini/${selected.id}`)
      if (updated.ok) setSelected(await updated.json())
    } catch { setCollegaGError('Errore durante il collegamento.') }
    finally { setCollegaGLoading(false) }
  }

  const handleCollegaCrea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (!nuovoGEmail || !nuovoGNome || !nuovoGCognome) {
      setNuovoGError('Email, nome e cognome sono obbligatori.')
      return
    }
    if (nuovoGCF && nuovoGCF.length !== 16) {
      setNuovoGError('Il codice fiscale deve essere esattamente 16 caratteri.')
      return
    }
    if (collegaGSlot === 'genitore1' && !collegaGTelEmerg) {
      setNuovoGError('Inserisci il telefono di emergenza.')
      return
    }
    setNuovoGLoading(true)
    setNuovoGError('')
    try {
      const uRes = await fetch('/api/utenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: nuovoGEmail, username: nuovoGEmail,
          first_name: nuovoGNome, last_name: nuovoGCognome,
          phone: nuovoGPhone, codice_fiscale: nuovoGCF,
          role: 'genitore',
        }),
      })
      const uData = await uRes.json()
      if (!uRes.ok) { setNuovoGError(formatErrors(uData)); return }
      const genitore: GenitoreLight = uData
      // Link genitore to bambino
      if (collegaGSlot === 'genitore1') {
        const res = await fetch('/api/famiglie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bambino: selected.id,
            genitore1_email: genitore.email,
            genitore1_nome: genitore.first_name,
            genitore1_cognome: genitore.last_name,
            telefono_emergenza: collegaGTelEmerg,
            medico_base: collegaGMedico,
          }),
        })
        if (!res.ok) { const e = await res.json(); setNuovoGError(formatErrors(e)); return }
      } else {
        if (!selected.famiglia) return
        const res = await fetch(`/api/famiglie/${selected.famiglia.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            genitore2_email: genitore.email,
            genitore2_nome: genitore.first_name,
            genitore2_cognome: genitore.last_name,
          }),
        })
        if (!res.ok) { const e = await res.json(); setNuovoGError(formatErrors(e)); return }
      }
      setShowCollegaG(false)
      await fetchBambini()
      const updated = await fetch(`/api/bambini/${selected.id}`)
      if (updated.ok) setSelected(await updated.json())
      refreshGenitori()
    } catch { setNuovoGError('Errore nella creazione.') }
    finally { setNuovoGLoading(false) }
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

  // ── Preferenza menu ─────────────────────────────────────────────────────────

  const savePref = async () => {
    if (!selected) return
    setPrefLoading(true); setPrefError('')
    try {
      const payload = { bambino: selected.id, tipo: prefForm.tipo, descrizione: prefForm.descrizione, piatti_alternativi: prefForm.piatti, attivo: true }
      const res = await fetch(
        prefMenu ? `/api/pappe/preferenze-menu/${prefMenu.id}` : '/api/pappe/preferenze-menu',
        { method: prefMenu ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      )
      if (!res.ok) { const d = await res.json(); setPrefError(d.detail || JSON.stringify(d)); return }
      const data = await res.json()
      setPrefMenu(data)
      setEditingPref(false)
    } catch { setPrefError('Errore di rete.') }
    finally { setPrefLoading(false) }
  }

  const deletePref = async () => {
    if (!selected || !prefMenu) return
    if (!confirm('Rimuovere la preferenza menu per questo bambino?')) return
    setPrefLoading(true)
    const res = await fetch(`/api/pappe/preferenze-menu/${prefMenu.id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) { setPrefMenu(null); setEditingPref(false) }
    setPrefLoading(false)
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

  const downloadGdpr = async () => {
    if (!selected) return
    setGdprLoading(true)
    try {
      const res = await fetch(`/api/bambini/${selected.id}/export-gdpr`)
      if (!res.ok) { alert('Errore durante l\'export GDPR.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gdpr_${selected.cognome}_${selected.nome}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGdprLoading(false)
    }
  }

  const downloadReport = async () => {
    if (!selected) return
    setReportLoading(true)
    try {
      const res = await fetch(`/api/bambini/${selected.id}/report-mensile?anno=${reportAnno}&mese=${reportMese}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${selected.cognome}_${selected.nome}_${reportAnno}_${String(reportMese).padStart(2, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setShowReportPicker(false)
    } finally {
      setReportLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#FFF8F4' }}>
        <p style={{ color: '#4834D4', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F4' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)',
        padding: '1.5rem 1.5rem 2rem', color: 'white',
      }}>
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
                background: 'white', color: '#4834D4', border: 'none',
                borderRadius: '12px', padding: '0.75rem 1.25rem',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit',
              }}
            >
              + Nuovo bambino
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 'min(960px, 96vw)', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* ── Filtri ────────────────────────────────────────────────────────── */}
        <div style={{
          background: 'white', borderRadius: '16px', padding: '1rem 1.25rem',
          marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <input
            type="search" placeholder="🔍 Cerca per nome o cognome..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 200px', padding: '0.625rem 0.875rem', border: '2px solid #DDD6FE', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
          />
          <select
            value={filterGruppo} onChange={e => setFilterGruppo(e.target.value)}
            style={{ padding: '0.625rem 0.875rem', border: '2px solid #DDD6FE', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', background: 'white', cursor: 'pointer' }}
          >
            <option value="">Tutti i gruppi</option>
            {gruppi.map(g => <option key={g.id} value={String(g.id)}>{g.nome}</option>)}
          </select>
          <select
            value={filterAttivo} onChange={e => setFilterAttivo(e.target.value as typeof filterAttivo)}
            style={{ padding: '0.625rem 0.875rem', border: '2px solid #DDD6FE', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', background: 'white', cursor: 'pointer' }}
          >
            <option value="all">Tutti</option>
            <option value="true">Attivi</option>
            <option value="false">Non attivi</option>
          </select>
          <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
            {(['cards', 'table'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: '0.5rem 0.75rem', border: `2px solid ${viewMode === m ? '#4834D4' : '#DDD6FE'}`, borderRadius: '8px', background: viewMode === m ? '#4834D4' : 'white', color: viewMode === m ? 'white' : '#888', cursor: 'pointer', fontSize: '1rem', fontFamily: 'inherit' }}>
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
                onClick={() => { setSelected(b); setShowDelForm(false); setShowEdit(false) }}
              />
            ))}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: '#FFF0E8' }}>
                  {['', 'Nome', 'Cognome', 'Gruppo', 'Orario uscita', 'Età', 'Data nascita', 'Genitore 1', 'CF', 'Stato'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 0.875rem', textAlign: 'left', fontWeight: 700, color: '#555', whiteSpace: 'nowrap', borderBottom: '2px solid #DDD6FE' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bambini.map((b, i) => {
                  const color = b.gruppo_colore || '#A29BFE'
                  return (
                    <tr key={b.id}
                      onClick={() => { setSelected(b); setShowDelForm(false); setShowEdit(false) }}
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
                  background: '#DDD6FE', overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#4834D4', fontWeight: 700, fontSize: '1.25rem',
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
            <div style={{ background: '#FFF8F4', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #DDD6FE' }}>
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
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DDD6FE', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4834D4', fontWeight: 700, fontSize: '1.25rem' }}>
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
            <div style={{ background: '#FFF8F4', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #DDD6FE' }}>
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
        <Overlay onClose={() => { setSelected(null); setShowEdit(false); setDetailSection('anagrafica'); setEditFam(false); setShowCollegaG(false); setEditGTab(null); setShowDelForm(false); setShowReportPicker(false) }}>
          <ModalHeader
            title={`${selected.nome} ${selected.cognome}`}
            onClose={() => { setSelected(null); setShowEdit(false); setDetailSection('anagrafica'); setEditFam(false); setShowCollegaG(false); setEditGTab(null); setShowDelForm(false); setShowReportPicker(false) }}
          />

          {/* Avatar + badges — sempre visibili */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: selected.gruppo_colore || '#A29BFE', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
              {selected.foto_profilo
                ? <img src={selected.foto_profilo} alt={initials(selected.nome, selected.cognome)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials(selected.nome, selected.cognome)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {selected.gruppo_nome && <Badge color={selected.gruppo_colore || '#A29BFE'}>{selected.gruppo_nome}</Badge>}
                {selected.orario_uscita_label && <Badge color="#6C5CE7">🕐 {selected.orario_uscita_label}</Badge>}
                <Badge color={selected.attivo ? '#27AE60' : '#E67E22'}>{selected.attivo ? 'Attivo' : 'Non attivo'}</Badge>
                <Badge color="#888">{selected.eta} anni · {selected.data_nascita}</Badge>
              </div>
              {selected.alias_nome && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#888' }}>
                  Alias: <strong>{selected.alias_nome}</strong>
                  {selected.alias_attivo ? <span style={{ color: '#27AE60', marginLeft: '0.3rem' }}>✓ attivo</span> : <span style={{ color: '#aaa', marginLeft: '0.3rem' }}>non attivo</span>}
                </p>
              )}
            </div>
          </div>

          {/* Tab navigation */}
          <div style={{ display: 'flex', borderBottom: '2px solid #F0F0F0', marginBottom: '1.25rem' }}>
            {([
              { k: 'anagrafica' as const, label: '👶 Dati' },
              { k: 'famiglia' as const, label: '👨‍👩‍👧 Famiglia' },
              { k: 'deleghe' as const, label: `🚗 Deleghe${selected.deleghe_ritiro.length > 0 ? ` (${selected.deleghe_ritiro.length})` : ''}` },
            ]).map(({ k, label }) => (
              <button key={k} onClick={() => { setDetailSection(k); setEditFam(false); setEditGTab(null); setShowDelForm(false) }}
                style={{ flex: 1, padding: '0.625rem 0.375rem', background: 'none', border: 'none', borderBottom: detailSection === k ? '2.5px solid #4834D4' : '2.5px solid transparent', fontWeight: detailSection === k ? 700 : 400, fontSize: '0.8rem', color: detailSection === k ? '#4834D4' : '#888', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab: Dati ─── */}
          {detailSection === 'anagrafica' && (
            <>
              {selected.note_mediche && (
                <div style={{ background: '#FFF8E7', border: '1px solid #FFD87F', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#7D5A00' }}>
                  <strong>⚕️ Note mediche:</strong> {selected.note_mediche}
                </div>
              )}
              <div style={{ background: '#F8F9FA', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'grid', gap: '0.4rem' }}>
                {selected.codice_fiscale && <p style={{ margin: 0 }}><strong>CF:</strong> <code style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selected.codice_fiscale}</code></p>}
                <p style={{ margin: 0 }}><strong>Data iscrizione:</strong> {selected.data_iscrizione}</p>
                {selected.famiglia?.medico_base && <p style={{ margin: 0 }}>🩺 <strong>Medico:</strong> {selected.famiglia.medico_base}</p>}
                {selected.famiglia?.telefono_emergenza && <p style={{ margin: 0 }}>📞 <strong>Tel. emergenza:</strong> <span style={{ color: '#C0392B', fontWeight: 700 }}>{selected.famiglia.telefono_emergenza}</span></p>}
              </div>
              {showReportPicker && (
                <div style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1D4ED8' }}>📅 Mese:</span>
                  <select value={reportMese} onChange={e => setReportMese(Number(e.target.value))}
                    style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #BFDBFE', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'white' }}>
                    {['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'].map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                  <select value={reportAnno} onChange={e => setReportAnno(Number(e.target.value))}
                    style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #BFDBFE', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'white' }}>
                    {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button onClick={downloadReport} disabled={reportLoading}
                    style={{ padding: '0.4rem 1rem', background: '#1D4ED8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: reportLoading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                    {reportLoading ? '⏳...' : '⬇ PDF'}
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid #F0F0F0' }}>
                <button onClick={() => openEdit(selected)} style={{ ...secondaryBtn, marginBottom: 0, background: '#4834D4', color: 'white', border: 'none' }}>✏️ Modifica</button>
                <button onClick={handleToggleAttivo}
                  style={{ ...secondaryBtn, marginBottom: 0, color: selected.attivo ? '#E67E22' : '#27AE60', borderColor: selected.attivo ? '#FDEBD0' : '#D5F5E3' }}>
                  {selected.attivo ? '⏸ Disattiva' : '▶ Riattiva'}
                </button>
                <button onClick={() => { setShowReportPicker(v => !v); setReportAnno(new Date().getFullYear()); setReportMese(new Date().getMonth() + 1) }}
                  style={{ ...secondaryBtn, marginBottom: 0, color: '#0952A5', borderColor: '#BFDBFE' }}>📄 Report</button>
                <button onClick={downloadGdpr} disabled={gdprLoading}
                  style={{ ...secondaryBtn, marginBottom: 0, color: '#7C3AED', borderColor: '#DDD6FE' }}>
                  {gdprLoading ? '⏳...' : '📤 GDPR'}
                </button>
                <button onClick={handleDelete}
                  style={{ ...secondaryBtn, marginBottom: 0, marginLeft: 'auto', color: '#C0392B', borderColor: '#FADBD8' }}>🗑 Elimina</button>
              </div>

              {/* ── Sezione Menu personalizzato ── */}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F0F0F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#555' }}>🍽️ Menu personalizzato</p>
                  {!editingPref && (
                    <button onClick={() => { setEditingPref(true); setPrefForm(prefMenu ? { tipo: prefMenu.tipo, descrizione: prefMenu.descrizione, piatti: (prefMenu.piatti_alternativi_dettaglio ?? []).map(p => p.id) } : { tipo: 'monopiatto', descrizione: '', piatti: [] }) }}
                      style={{ padding: '0.25rem 0.75rem', background: '#EDE9FE', color: '#6C5CE7', border: '1.5px solid #C4B5FD', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {prefMenu ? '✏️ Modifica' : '+ Aggiungi'}
                    </button>
                  )}
                </div>

                {!editingPref ? (
                  prefMenu ? (
                    <div style={{ background: prefMenu.tipo === 'monopiatto' ? '#EDE9FE' : '#FFF3CD', borderRadius: '10px', padding: '0.625rem 0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 700, color: prefMenu.tipo === 'monopiatto' ? '#6C5CE7' : '#856404', fontSize: '0.85rem' }}>
                          {prefMenu.tipo === 'monopiatto' ? '🍽️ Monopiatto' : '🍀 Menu differente'}
                        </span>
                        <button onClick={deletePref} disabled={prefLoading}
                          style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', fontSize: '1rem', padding: '0.2rem 0.4rem' }}>✕</button>
                      </div>
                      {(prefMenu.piatti_alternativi_dettaglio ?? []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                          {prefMenu.piatti_alternativi_dettaglio.map(p => (
                            <span key={p.id} style={{ background: 'white', border: `1px solid ${TIPO_COLOR_MENU[p.tipo] ?? '#888'}`, color: TIPO_COLOR_MENU[p.tipo] ?? '#555', borderRadius: '6px', padding: '2px 7px', fontSize: '0.72rem', fontWeight: 600 }}>
                              {p.descrizione}
                            </span>
                          ))}
                        </div>
                      )}
                      {prefMenu.descrizione && <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#555' }}>{prefMenu.descrizione}</p>}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#aaa', fontStyle: 'italic' }}>Nessuna preferenza — menu standard</p>
                  )
                ) : (
                  <div style={{ background: '#F8F4FF', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ marginBottom: '0.625rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#555', marginBottom: '0.25rem' }}>Tipo</label>
                      <select value={prefForm.tipo} onChange={e => setPrefForm(p => ({ ...p, tipo: e.target.value }))}
                        style={{ padding: '0.4rem 0.625rem', border: '1.5px solid #C4B5FD', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', background: 'white' }}>
                        <option value="monopiatto">🍽️ Monopiatto</option>
                        <option value="differente">🍀 Menu differente</option>
                      </select>
                    </div>

                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#555', marginBottom: '0.3rem' }}>Piatti alternativi</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.625rem', maxHeight: 220, overflowY: 'auto', border: '1px solid #E5DEFF', borderRadius: '8px', padding: '0.5rem', background: 'white' }}>
                      {Object.entries(
                        catalogoPiatti.reduce((acc: Record<string, PiattoRef[]>, p) => {
                          (acc[p.tipo] ??= []).push(p)
                          return acc
                        }, {})
                      ).map(([tipo, list]) => (
                        <div key={tipo}>
                          <p style={{ margin: '0 0 0.2rem', fontSize: '0.68rem', fontWeight: 800, color: TIPO_COLOR_MENU[tipo] ?? '#888', textTransform: 'uppercase' }}>
                            {list[0]?.tipo_label ?? tipo}
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {list.map(p => {
                              const selezionato = prefForm.piatti.includes(p.id)
                              return (
                                <button key={p.id} type="button"
                                  onClick={() => setPrefForm(f => ({ ...f, piatti: selezionato ? f.piatti.filter(id => id !== p.id) : [...f.piatti, p.id] }))}
                                  style={{
                                    background: selezionato ? (TIPO_COLOR_MENU[tipo] ?? '#6C5CE7') : 'white',
                                    color: selezionato ? 'white' : '#555',
                                    border: `1.3px solid ${TIPO_COLOR_MENU[tipo] ?? '#6C5CE7'}`,
                                    borderRadius: '7px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                  }}>
                                  {selezionato ? '✓ ' : ''}{p.descrizione}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                      {catalogoPiatti.length === 0 && <p style={{ margin: 0, fontSize: '0.78rem', color: '#aaa' }}>Nessun piatto nel catalogo.</p>}
                    </div>

                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#555', marginBottom: '0.25rem' }}>Nota aggiuntiva (opzionale)</label>
                    <input type="text" value={prefForm.descrizione} onChange={e => setPrefForm(p => ({ ...p, descrizione: e.target.value }))}
                      placeholder='es. "senza sale"'
                      style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1.5px solid #C4B5FD', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '0.5rem' }} />

                    {prefError && <p style={{ margin: '0 0 0.5rem', color: '#C0392B', fontSize: '0.8rem', fontWeight: 600 }}>{prefError}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={savePref} disabled={prefLoading}
                        style={{ padding: '0.4rem 1rem', background: '#6C5CE7', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: prefLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: prefLoading ? 0.7 : 1 }}>
                        {prefLoading ? '⏳...' : '✓ Salva'}
                      </button>
                      <button onClick={() => { setEditingPref(false); setPrefError('') }}
                        style={{ padding: '0.4rem 0.875rem', background: 'white', color: '#888', border: '1.5px solid #DDD', borderRadius: '8px', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Annulla
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Tab: Famiglia ─── */}
          {detailSection === 'famiglia' && (
            <>
              {editGTab ? (
                <form onSubmit={handleEditGSubmit} style={{ background: '#FFF8F4', borderRadius: '12px', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#4834D4' }}>
                    ✏️ Modifica {editGTab === 'genitore1' ? 'Genitore 1' : 'Genitore 2'}
                    {' — '}<span style={{ fontWeight: 400, color: '#888' }}>{editGTab === 'genitore1' ? selected.famiglia?.genitore1_email : selected.famiglia?.genitore2_email}</span>
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Field label="Nome"><input type="text" value={editGForm.first_name} onChange={e => setEditGForm(p => ({ ...p, first_name: e.target.value }))} style={inputSt} /></Field>
                    <Field label="Cognome"><input type="text" value={editGForm.last_name} onChange={e => setEditGForm(p => ({ ...p, last_name: e.target.value }))} style={inputSt} /></Field>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Field label="Telefono"><input type="tel" value={editGForm.phone} onChange={e => setEditGForm(p => ({ ...p, phone: e.target.value }))} style={inputSt} /></Field>
                    <Field label="Codice fiscale"><input type="text" maxLength={16} value={editGForm.codice_fiscale} onChange={e => setEditGForm(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() }))} style={inputSt} placeholder="RSSMRA..." /></Field>
                  </div>
                  {editGError && <ErrorBox>{editGError}</ErrorBox>}
                  <ModalActions onCancel={() => { setEditGTab(null); setEditGError('') }} loading={editGLoading} submitLabel="Salva" />
                </form>
              ) : editFam ? (
                <form onSubmit={handleEditFamSubmit} style={{ background: '#FFF8F4', borderRadius: '12px', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#4834D4' }}>✏️ Telefono emergenza e medico di base</p>
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
              ) : !selected.famiglia ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#aaa' }}>
                  <p style={{ fontSize: '2rem', margin: '0 0 0.75rem' }}>👨‍👩‍👧</p>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.875rem' }}>Nessuna famiglia associata.</p>
                  <button onClick={() => openCollegaG('genitore1')} style={{ ...secondaryBtn, marginBottom: 0, background: '#4834D4', color: 'white', border: 'none' }}>+ Aggiungi Genitore 1</button>
                </div>
              ) : (
                <>
                  <GenitoreCard
                    label="👤 Genitore 1"
                    nome={selected.famiglia.genitore1_nome}
                    email={selected.famiglia.genitore1_email}
                    telefono={selected.famiglia.genitore1_telefono}
                    cf={selected.famiglia.genitore1_codice_fiscale}
                    onEdit={() => openEditG('genitore1')}
                    onUnlink={handleRemoveG1}
                    unlinkLoading={unlinkLoading}
                  />
                  {selected.famiglia.genitore2_email ? (
                    <GenitoreCard
                      label="👤 Genitore 2"
                      nome={selected.famiglia.genitore2_nome || ''}
                      email={selected.famiglia.genitore2_email}
                      telefono={selected.famiglia.genitore2_telefono || ''}
                      cf={selected.famiglia.genitore2_codice_fiscale}
                      onEdit={() => openEditG('genitore2')}
                      onUnlink={handleRemoveG2}
                      unlinkLoading={unlinkLoading}
                    />
                  ) : (
                    <button onClick={() => { openCollegaG('genitore2'); setEditFam(false); setEditGTab(null) }}
                      style={{ ...secondaryBtn, width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                      + Aggiungi Genitore 2
                    </button>
                  )}
                  <div style={{ background: '#F8F9FA', borderRadius: '12px', padding: '1rem', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                    {selected.famiglia.telefono_emergenza
                      ? <p style={{ margin: '0 0 0.3rem', fontWeight: 700, color: '#C0392B' }}>📞 Emergenza: {selected.famiglia.telefono_emergenza}</p>
                      : <p style={{ margin: '0 0 0.3rem', color: '#aaa', fontSize: '0.82rem' }}>Nessun telefono emergenza.</p>}
                    {selected.famiglia.medico_base
                      ? <p style={{ margin: 0 }}>🩺 Medico: {selected.famiglia.medico_base}</p>
                      : <p style={{ margin: 0, color: '#aaa', fontSize: '0.82rem' }}>Nessun medico di base salvato.</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => { setEditFamForm({ telefono_emergenza: selected.famiglia!.telefono_emergenza || '', medico_base: selected.famiglia!.medico_base || '' }); setEditFam(true) }}
                      style={{ ...secondaryBtn, marginBottom: 0, fontSize: '0.78rem' }}>✏️ Modifica emergenza / medico</button>
                    <button onClick={handleUnlinkFamiglia} disabled={unlinkLoading}
                      style={{ ...secondaryBtn, marginBottom: 0, fontSize: '0.78rem', marginLeft: 'auto', color: '#C0392B', borderColor: '#FADBD8' }}>🔗 Rimuovi famiglia</button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Tab: Deleghe ─── */}
          {detailSection === 'deleghe' && (
            <>
              {selected.deleghe_ritiro.length === 0 && !showDelForm && (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#aaa' }}>
                  <p style={{ fontSize: '1.75rem', margin: '0 0 0.5rem' }}>🚗</p>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.875rem' }}>Nessuna delega registrata.</p>
                </div>
              )}
              {selected.deleghe_ritiro.map(d => (
                <div key={d.id} style={{ background: '#F8F9FA', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '0.5rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{d.cognome_delegato} {d.nome_delegato}</p>
                    <p style={{ margin: '0.15rem 0 0', color: '#888', fontSize: '0.8rem' }}>{d.rapporto_familiare} · {d.documento_identita}</p>
                  </div>
                  <Badge color={d.attivo ? '#27AE60' : '#aaa'}>{d.attivo ? '✓ Attiva' : '✗ Non attiva'}</Badge>
                </div>
              ))}
              {!showDelForm ? (
                <button onClick={() => setShowDelForm(true)} style={{ ...secondaryBtn, width: '100%', display: 'flex', justifyContent: 'center' }}>+ Aggiungi delega</button>
              ) : (
                <form onSubmit={handleDelSubmit} style={{ background: '#FFF8F4', borderRadius: '12px', padding: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Field label="Nome delegato" required><input type="text" required value={delForm.nome_delegato} onChange={e => setDelForm(p => ({ ...p, nome_delegato: e.target.value }))} style={inputSt} /></Field>
                    <Field label="Cognome delegato" required><input type="text" required value={delForm.cognome_delegato} onChange={e => setDelForm(p => ({ ...p, cognome_delegato: e.target.value }))} style={inputSt} /></Field>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Field label="Documento identità" required><input type="text" required value={delForm.documento_identita} onChange={e => setDelForm(p => ({ ...p, documento_identita: e.target.value }))} style={inputSt} placeholder="CI/Passaporto n°..." /></Field>
                    <Field label="Rapporto familiare" required><input type="text" required value={delForm.rapporto_familiare} onChange={e => setDelForm(p => ({ ...p, rapporto_familiare: e.target.value }))} style={inputSt} placeholder="Nonno, Zio..." /></Field>
                  </div>
                  {delError && <ErrorBox>{delError}</ErrorBox>}
                  <ModalActions onCancel={() => setShowDelForm(false)} loading={delLoading} submitLabel="Salva delega" />
                </form>
              )}
            </>
          )}
        </Overlay>
      )}

      {/* ── Modal: Collega genitore ──────────────────────────────────────────── */}
      {showCollegaG && (
        <Overlay onClose={closeCollegaG} zIndex={1100}>
          <ModalHeader
            title={collegaGSlot === 'genitore1' ? '👤 Aggiungi Genitore 1' : '👤 Aggiungi Genitore 2'}
            onClose={closeCollegaG}
          />

          {/* Tab selector */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {(['cerca', 'crea'] as const).map(t => (
              <button key={t} onClick={() => { setCollegaGTab(t); setCollegaGError(''); setNuovoGError('') }}
                style={{ flex: 1, padding: '0.5rem', border: `2px solid ${collegaGTab === t ? '#4834D4' : '#DDD6FE'}`, borderRadius: '8px', background: collegaGTab === t ? '#4834D4' : 'white', color: collegaGTab === t ? 'white' : '#888', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                {t === 'cerca' ? '🔍 Cerca esistente' : '➕ Crea nuovo'}
              </button>
            ))}
          </div>

          {/* ── Tab: Cerca esistente ── */}
          {collegaGTab === 'cerca' && (
            <>
              <input
                type="search" placeholder="Cerca per nome, cognome o email..."
                value={collegaGSearch} onChange={e => setCollegaGSearch(e.target.value)}
                style={{ ...inputSt, marginBottom: '0.5rem' }}
              />
              <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #DDD6FE', borderRadius: '10px', marginBottom: '0.75rem' }}>
                {genitori
                  .filter(g => {
                    if (!collegaGSearch) return true
                    const q = collegaGSearch.toLowerCase()
                    return `${g.first_name} ${g.last_name} ${g.email}`.toLowerCase().includes(q)
                  })
                  .map(g => (
                    <div key={g.id} onClick={() => setCollegaGSelected(g)}
                      style={{
                        padding: '0.625rem 0.875rem', cursor: 'pointer',
                        background: collegaGSelected?.id === g.id ? '#FFF0E8' : 'white',
                        borderLeft: collegaGSelected?.id === g.id ? '3px solid #4834D4' : '3px solid transparent',
                        borderBottom: '1px solid #F5F5F5',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                      }}
                      onMouseEnter={e => { if (collegaGSelected?.id !== g.id) e.currentTarget.style.background = '#FFF8F4' }}
                      onMouseLeave={e => { if (collegaGSelected?.id !== g.id) e.currentTarget.style.background = 'white' }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', flexShrink: 0 }}>👤</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#333' }}>
                          {g.first_name} {g.last_name}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.775rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.email}</p>
                      </div>
                      {collegaGSelected?.id === g.id && <span style={{ color: '#4834D4', fontWeight: 700 }}>✓</span>}
                    </div>
                  ))}
                {genitori.filter(g => {
                  if (!collegaGSearch) return true
                  const q = collegaGSearch.toLowerCase()
                  return `${g.first_name} ${g.last_name} ${g.email}`.toLowerCase().includes(q)
                }).length === 0 && (
                  <p style={{ textAlign: 'center', color: '#aaa', padding: '1rem', margin: 0, fontSize: '0.875rem' }}>Nessun genitore trovato.</p>
                )}
              </div>
              {collegaGSlot === 'genitore1' && (
                <div style={{ borderTop: '1px solid #DDD6FE', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <Field label="Telefono emergenza" required>
                    <input type="tel" value={collegaGTelEmerg} onChange={e => setCollegaGTelEmerg(e.target.value)}
                      style={inputSt} placeholder="+39 333..." />
                  </Field>
                  <Field label="Medico di base">
                    <input type="text" value={collegaGMedico} onChange={e => setCollegaGMedico(e.target.value)} style={inputSt} />
                  </Field>
                </div>
              )}
              {collegaGError && <ErrorBox>{collegaGError}</ErrorBox>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={closeCollegaG}
                  style={{ flex: 1, padding: '0.75rem', border: '2px solid #DDD6FE', borderRadius: '10px', background: 'white', color: '#666', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Annulla
                </button>
                <button type="button" onClick={handleCollegaCercaConfirma}
                  disabled={!collegaGSelected || collegaGLoading}
                  style={{ flex: 2, padding: '0.75rem', background: !collegaGSelected || collegaGLoading ? '#C4B5FD' : '#4834D4', border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: !collegaGSelected || collegaGLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {collegaGLoading ? 'Salvataggio...' : 'Conferma'}
                </button>
              </div>
            </>
          )}

          {/* ── Tab: Crea nuovo ── */}
          {collegaGTab === 'crea' && (
            <form onSubmit={handleCollegaCrea}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Nome" required>
                  <input type="text" required value={nuovoGNome} onChange={e => setNuovoGNome(e.target.value)} style={inputSt} />
                </Field>
                <Field label="Cognome" required>
                  <input type="text" required value={nuovoGCognome} onChange={e => setNuovoGCognome(e.target.value)} style={inputSt} />
                </Field>
              </div>
              <Field label="Email" required>
                <input type="email" required value={nuovoGEmail} onChange={e => setNuovoGEmail(e.target.value)} style={inputSt} placeholder="genitore@email.it" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Telefono">
                  <input type="tel" value={nuovoGPhone} onChange={e => setNuovoGPhone(e.target.value)} style={inputSt} />
                </Field>
                <Field label="Codice fiscale">
                  <input type="text" maxLength={16} value={nuovoGCF}
                    onChange={e => setNuovoGCF(e.target.value.toUpperCase())} style={inputSt} placeholder="RSSMRA..." />
                </Field>
              </div>
              {collegaGSlot === 'genitore1' && (
                <div style={{ borderTop: '1px solid #DDD6FE', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <Field label="Telefono emergenza" required>
                    <input type="tel" required value={collegaGTelEmerg} onChange={e => setCollegaGTelEmerg(e.target.value)}
                      style={inputSt} placeholder="+39 333..." />
                  </Field>
                  <Field label="Medico di base">
                    <input type="text" value={collegaGMedico} onChange={e => setCollegaGMedico(e.target.value)} style={inputSt} />
                  </Field>
                </div>
              )}
              {nuovoGError && <ErrorBox>{nuovoGError}</ErrorBox>}
              <ModalActions onCancel={closeCollegaG} loading={nuovoGLoading} submitLabel="Crea e aggiungi" />
            </form>
          )}
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
      <p style={{ margin: '0 0 0.15rem' }}>{nome} — <a href={`mailto:${email}`} style={{ color: '#4834D4', textDecoration: 'none' }}>{email}</a></p>
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
      <h2 style={{ margin: 0, color: '#4834D4', fontSize: '1.2rem', fontWeight: 800 }}>{title}</h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
    </div>
  )
}

function ModalActions({ onCancel, loading, submitLabel }: { onCancel: () => void; loading: boolean; submitLabel: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
      <button type="button" onClick={onCancel} style={{ flex: 1, padding: '0.75rem', border: '2px solid #DDD6FE', borderRadius: '10px', background: 'white', color: '#666', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        Annulla
      </button>
      <button type="submit" disabled={loading} style={{ flex: 2, padding: '0.75rem', background: loading ? '#C4B5FD' : '#4834D4', border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
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

function GenitoreCard({ label, nome, email, telefono, cf, onEdit, onUnlink, unlinkLoading }: {
  label: string; nome: string; email: string; telefono: string; cf: string;
  onEdit: () => void; onUnlink: () => void; unlinkLoading: boolean
}) {
  return (
    <div style={{ background: '#F8F9FA', borderRadius: '12px', padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.78rem', color: '#555', textTransform: 'uppercase' }}>{label}</p>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={onEdit} style={{ padding: '0.2rem 0.6rem', background: 'none', border: '1px solid #DDD6FE', borderRadius: '6px', color: '#4834D4', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✏️ Modifica</button>
          <button onClick={onUnlink} disabled={unlinkLoading} style={{ padding: '0.2rem 0.6rem', background: 'none', border: '1px solid #FADBD8', borderRadius: '6px', color: '#C0392B', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Scollega</button>
        </div>
      </div>
      <p style={{ margin: '0 0 0.2rem', fontWeight: 600, fontSize: '0.875rem', color: '#333' }}>{nome}</p>
      <p style={{ margin: '0 0 0.15rem', fontSize: '0.82rem' }}>
        <a href={`mailto:${email}`} style={{ color: '#4834D4', textDecoration: 'none' }}>{email}</a>
      </p>
      {telefono && <p style={{ margin: '0 0 0.15rem', fontSize: '0.82rem', color: '#555' }}>📱 {telefono}</p>}
      {cf && <p style={{ margin: 0, fontSize: '0.78rem', color: '#777', fontFamily: 'monospace' }}>CF: {cf}</p>}
    </div>
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
  padding: '0.5rem 1rem', background: 'none', border: '2px solid #DDD6FE',
  borderRadius: '8px', color: '#4834D4', fontSize: '0.8rem', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', marginBottom: '0.5rem',
}

const formatErrors = formatApiErrors
