'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, color: '#444', fontSize: '0.8rem' }}>
        {label}
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
  genitore1_codice_fiscale: '',
  genitore1_indirizzo: '',
  genitore2_email: '',
  genitore2_codice_fiscale: '',
  genitore2_indirizzo: '',
  telefono_emergenza: '',
  medico_base: '',
  indirizzo: '',
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

  // Family form (inside detail modal)
  const [showFamForm, setShowFamForm] = useState(false)
  const [famForm, setFamForm] = useState(EMPTY_FAMIGLIA)
  const [hasGenitore2, setHasGenitore2] = useState(false)
  const [famLoading, setFamLoading] = useState(false)
  const [famError, setFamError] = useState('')

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
    } catch { setAddError('Errore durante il salvataggio.') }
    finally { setAddLoading(false) }
  }

  // ── Add famiglia ───────────────────────────────────────────────────────────

  const handleFamSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setFamLoading(true)
    setFamError('')
    try {
      const payload = {
        ...famForm,
        bambino: selected.id,
        genitore2_email: hasGenitore2 ? famForm.genitore2_email : '',
        genitore2_codice_fiscale: hasGenitore2 ? famForm.genitore2_codice_fiscale : '',
        genitore2_indirizzo: hasGenitore2 ? famForm.genitore2_indirizzo : '',
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
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>👶 Bambini</h1>
              <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>
                {bambini.length} bambini registrati
              </p>
            </div>
            <button
              onClick={() => { setShowAdd(true); setAddError(''); clearPhoto() }}
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
        </div>

        {listError && (
          <div style={{ background: '#FADBD8', color: '#C0392B', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
            {listError}
          </div>
        )}

        {/* ── Cards ─────────────────────────────────────────────────────────── */}
        {bambini.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: '16px', color: '#aaa' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👶</div>
            <p style={{ margin: 0 }}>Nessun bambino trovato.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {bambini.map(b => (
              <BambinoCard
                key={b.id}
                bambino={b}
                onClick={() => { setSelected(b); setShowFamForm(false); setShowDelForm(false) }}
              />
            ))}
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
              <Field label="Nome *">
                <input type="text" required value={addForm.nome} onChange={e => setAddForm(p => ({ ...p, nome: e.target.value }))} style={inputSt} />
              </Field>
              <Field label="Cognome *">
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
              <Field label="Data di nascita *">
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
            <Field label="Data iscrizione *">
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

      {/* ── Modal: Dettaglio bambino ─────────────────────────────────────────── */}
      {selected && (
        <Overlay onClose={() => setSelected(null)}>
          <ModalHeader
            title={`${selected.nome} ${selected.cognome}`}
            onClose={() => setSelected(null)}
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
            <div style={{ background: '#F8F9FA', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <GenitoreInfo
                label="Genitore 1"
                nome={selected.famiglia.genitore1_nome}
                email={selected.famiglia.genitore1_email}
                telefono={selected.famiglia.genitore1_telefono}
                cf={selected.famiglia.genitore1_codice_fiscale}
                indirizzo={selected.famiglia.genitore1_indirizzo}
              />
              {selected.famiglia.genitore2_email && (
                <GenitoreInfo
                  label="Genitore 2"
                  nome={selected.famiglia.genitore2_nome ?? ''}
                  email={selected.famiglia.genitore2_email}
                  telefono={selected.famiglia.genitore2_telefono ?? ''}
                  cf={selected.famiglia.genitore2_codice_fiscale}
                  indirizzo={selected.famiglia.genitore2_indirizzo}
                />
              )}
              {selected.famiglia.telefono_emergenza && (
                <p style={{ margin: '0.5rem 0 0', paddingTop: '0.5rem', borderTop: '1px solid #E9ECEF' }}>
                  <strong>📞 Emergenza:</strong> {selected.famiglia.telefono_emergenza}
                </p>
              )}
              {selected.famiglia.medico_base && (
                <p style={{ margin: '0.25rem 0 0' }}><strong>🩺 Medico:</strong> {selected.famiglia.medico_base}</p>
              )}
              {selected.famiglia.indirizzo && (
                <p style={{ margin: '0.25rem 0 0' }}><strong>🏠 Indirizzo famiglia:</strong> {selected.famiglia.indirizzo}</p>
              )}
            </div>
          ) : (
            <p style={{ color: '#aaa', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Nessuna famiglia registrata.</p>
          )}

          {!selected.famiglia && !showFamForm && (
            <button onClick={() => setShowFamForm(true)} style={secondaryBtn}>+ Aggiungi famiglia</button>
          )}

          {showFamForm && (
            <form onSubmit={handleFamSubmit} style={{ background: '#FFF8F4', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: '#E8562A' }}>Genitore 1</p>
              <Field label="Email genitore 1 *">
                <input type="email" required value={famForm.genitore1_email}
                  onChange={e => setFamForm(p => ({ ...p, genitore1_email: e.target.value }))}
                  style={inputSt} placeholder="genitore@email.it" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Codice fiscale">
                  <input type="text" maxLength={16} value={famForm.genitore1_codice_fiscale}
                    onChange={e => setFamForm(p => ({ ...p, genitore1_codice_fiscale: e.target.value.toUpperCase() }))}
                    style={inputSt} placeholder="RSSMRA..." />
                </Field>
                <Field label="Indirizzo">
                  <input type="text" value={famForm.genitore1_indirizzo}
                    onChange={e => setFamForm(p => ({ ...p, genitore1_indirizzo: e.target.value }))}
                    style={inputSt} />
                </Field>
              </div>

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
                  <Field label="Email genitore 2 *">
                    <input type="email" required={hasGenitore2} value={famForm.genitore2_email}
                      onChange={e => setFamForm(p => ({ ...p, genitore2_email: e.target.value }))}
                      style={inputSt} placeholder="genitore2@email.it" />
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Field label="Codice fiscale">
                      <input type="text" maxLength={16} value={famForm.genitore2_codice_fiscale}
                        onChange={e => setFamForm(p => ({ ...p, genitore2_codice_fiscale: e.target.value.toUpperCase() }))}
                        style={inputSt} placeholder="RSSMRA..." />
                    </Field>
                    <Field label="Indirizzo">
                      <input type="text" value={famForm.genitore2_indirizzo}
                        onChange={e => setFamForm(p => ({ ...p, genitore2_indirizzo: e.target.value }))}
                        style={inputSt} />
                    </Field>
                  </div>
                </>
              )}

              <div style={{ borderTop: '1px solid #FFD4B3', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <Field label="Telefono emergenza *">
                  <input type="tel" required value={famForm.telefono_emergenza}
                    onChange={e => setFamForm(p => ({ ...p, telefono_emergenza: e.target.value }))}
                    style={inputSt} placeholder="+39 333..." />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <Field label="Medico di base">
                    <input type="text" value={famForm.medico_base}
                      onChange={e => setFamForm(p => ({ ...p, medico_base: e.target.value }))}
                      style={inputSt} />
                  </Field>
                  <Field label="Indirizzo famiglia">
                    <input type="text" value={famForm.indirizzo}
                      onChange={e => setFamForm(p => ({ ...p, indirizzo: e.target.value }))}
                      style={inputSt} />
                  </Field>
                </div>
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
                <Field label="Nome delegato *">
                  <input type="text" required value={delForm.nome_delegato} onChange={e => setDelForm(p => ({ ...p, nome_delegato: e.target.value }))} style={inputSt} />
                </Field>
                <Field label="Cognome delegato *">
                  <input type="text" required value={delForm.cognome_delegato} onChange={e => setDelForm(p => ({ ...p, cognome_delegato: e.target.value }))} style={inputSt} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Documento identità *">
                  <input type="text" required value={delForm.documento_identita} onChange={e => setDelForm(p => ({ ...p, documento_identita: e.target.value }))} style={inputSt} placeholder="CI/Passaporto n°..." />
                </Field>
                <Field label="Rapporto familiare *">
                  <input type="text" required value={delForm.rapporto_familiare} onChange={e => setDelForm(p => ({ ...p, rapporto_familiare: e.target.value }))} style={inputSt} placeholder="Nonno, Zio..." />
                </Field>
              </div>
              {delError && <ErrorBox>{delError}</ErrorBox>}
              <ModalActions onCancel={() => setShowDelForm(false)} loading={delLoading} submitLabel="Salva delega" />
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

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
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
    <span style={{ background: color, color: 'white', padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
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

function formatErrors(data: unknown): string {
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join(' | ')
  }
  return 'Errore sconosciuto.'
}
