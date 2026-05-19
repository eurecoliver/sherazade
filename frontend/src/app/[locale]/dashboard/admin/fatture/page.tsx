'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Famiglia {
  id: number
  genitore1: number
  genitore1_nome: string
  genitore1_email: string
  genitore2: number | null
}

interface Bambino {
  id: number
  nome: string
  cognome: string
  alias_nome: string
  alias_attivo: boolean
  famiglia: { id: number } | null
}

interface BambinoInfo {
  id: number
  nome: string  // nome visualizzato (alias se attivo)
}

interface Fattura {
  id: number
  genitore: number
  genitore_nome: string
  genitore_email: string
  bambino: number | null
  bambino_nome: string | null
  anno: number
  mese: number
  importo: string | null
  file_url: string | null
  note: string
  caricato_da_nome: string | null
  caricato_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MESI_LABEL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                    'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MESI_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

function ultimi12Mesi(): { anno: number; mese: number }[] {
  const oggi = new Date()
  const result = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1)
    result.push({ anno: d.getFullYear(), mese: d.getMonth() + 1 })
  }
  return result
}

// ─── UploadModal ──────────────────────────────────────────────────────────────

interface UploadModalProps {
  genitoreId: number
  genitoreName: string
  bambinoId?: number | null
  bambinoNome?: string | null
  anno: number
  mese: number
  existing: Fattura | null
  onClose: () => void
  onSaved: () => void
}

function UploadModal({ genitoreId, genitoreName, bambinoId, bambinoNome, anno, mese, existing, onClose, onSaved }: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importo, setImporto] = useState(existing?.importo ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('genitore', String(genitoreId))
      fd.append('anno', String(anno))
      fd.append('mese', String(mese))
      if (bambinoId) fd.append('bambino', String(bambinoId))
      if (importo) fd.append('importo', String(importo))
      if (note) fd.append('note', note)
      if (file) fd.append('file', file)
      const res = await fetch('/api/fatture', { method: 'POST', body: fd })
      if (!res.ok) {
        const d = await res.json()
        setError(typeof d === 'object' ? JSON.stringify(d) : String(d))
        return
      }
      onSaved()
    } catch {
      setError('Errore durante il salvataggio.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existing || !confirm('Eliminare questa fattura?')) return
    setLoading(true)
    try {
      await fetch(`/api/fatture/${existing.id}`, { method: 'DELETE' })
      onSaved()
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.875rem',
    border: '1.5px solid #E2E8F0', borderRadius: '8px',
    fontSize: '0.875rem', fontFamily: 'inherit',
    boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#6C5CE7' }}>
              🧾 {MESI_LABEL[mese - 1]} {anno}
            </h3>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#888' }}>
              {genitoreName}{bambinoNome ? ` · 👶 ${bambinoNome}` : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#aaa' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.875rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#555', marginBottom: '0.375rem' }}>File PDF</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input ref={fileRef} type="file" accept=".pdf,.PDF" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{ padding: '0.5rem 1rem', background: '#F7FAFC', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#555', whiteSpace: 'nowrap' }}>
                📎 Scegli file
              </button>
              {file && <span style={{ fontSize: '0.82rem', color: '#27AE60', fontWeight: 600 }}>✓ {file.name}</span>}
              {!file && existing?.file_url && (
                <a href={existing.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.82rem', color: '#6C5CE7', fontWeight: 600, textDecoration: 'none' }}>
                  📄 Vedi file
                </a>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '0.875rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#555', marginBottom: '0.375rem' }}>Importo (€)</label>
            <input type="number" step="0.01" min="0" value={importo} onChange={e => setImporto(e.target.value)}
              placeholder="es. 350.00" style={inp} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#555', marginBottom: '0.375rem' }}>Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              style={{ ...inp, resize: 'vertical' }} placeholder="Note opzionali..." />
          </div>

          {error && <div style={{ background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: '8px', padding: '0.625rem', marginBottom: '0.75rem', fontSize: '0.82rem', color: '#C53030' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            {existing && (
              <button type="button" onClick={handleDelete} disabled={loading}
                style={{ padding: '0.75rem 1rem', background: '#FFF5F5', color: '#C53030', border: '1.5px solid #FEB2B2', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑
              </button>
            )}
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '0.75rem', background: '#F7FAFC', color: '#555', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Annulla
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 2, padding: '0.75rem', background: loading ? '#A0AEC0' : '#6C5CE7', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Salvataggio...' : (existing ? 'Aggiorna' : 'Salva')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── FamilyModal ──────────────────────────────────────────────────────────────

interface FamilyModalProps {
  genitoreId: number
  genitoreName: string
  genitoreEmail: string
  figliFull: BambinoInfo[]
  anno: number
  fattureTutte: Fattura[]
  onClose: () => void
  onRefresh: () => void
  initialMese?: number | null
}

function FamilyModal({ genitoreId, genitoreName, genitoreEmail, figliFull, anno, fattureTutte, onClose, onRefresh, initialMese }: FamilyModalProps) {
  const [editMese, setEditMese] = useState<number | null>(initialMese ?? null)
  const [editBambinoId, setEditBambinoId] = useState<number | null>(null)

  const oggi = new Date()
  const isMulti = figliFull.length > 1

  // Fatture di questo genitore per l'anno corrente
  const fattureAnno = fattureTutte.filter(f => f.genitore === genitoreId && f.anno === anno)
  const totale = fattureAnno.reduce((acc, f) => acc + (f.importo ? parseFloat(f.importo) : 0), 0)

  // Slot attesi: 12 mesi × n figli (o solo 12 per famiglie senza bambini tracciati)
  const nFigli = Math.max(figliFull.length, 1)
  const slotAttesi = 12 * nFigli
  const slotPagati = fattureAnno.length
  const tuttoSaldato = slotPagati >= slotAttesi

  // Lookup fattura per un dato mese (per famiglie mono-bambino: qualsiasi bambino)
  const getFattura = (mese: number, bambinoId?: number | null): Fattura | undefined =>
    bambinoId != null
      ? fattureAnno.find(f => f.mese === mese && f.bambino === bambinoId)
      : fattureAnno.find(f => f.mese === mese)

  const openEdit = (mese: number, bambinoId: number | null) => {
    setEditMese(mese)
    setEditBambinoId(bambinoId)
  }

  // Render griglia 3×4 (condivisa per singolo e multi-figlio)
  const renderGrid = (bambinoId: number | null) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {Array.from({ length: 12 }, (_, i) => i + 1).map(mese => {
        const fattura = getFattura(mese, bambinoId)
        const isCurrent = mese === oggi.getMonth() + 1 && anno === oggi.getFullYear()
        const isPast = new Date(anno, mese - 1) < new Date(oggi.getFullYear(), oggi.getMonth())
        const hasProblem = !fattura && isPast
        return (
          <button
            key={mese}
            onClick={() => openEdit(mese, bambinoId)}
            style={{
              padding: '0.75rem 0.5rem',
              borderRadius: 12,
              border: fattura ? '2px solid #C6F6D5' : isCurrent ? '2px solid #FEB2B2' : hasProblem ? '2px dashed #FEB2B2' : '2px solid #E2E8F0',
              background: fattura ? 'linear-gradient(135deg, #F0FFF4, #E6FFFA)' : isCurrent ? '#FFF5F5' : '#FAFAFA',
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#888', marginBottom: 3 }}>
              {MESI_SHORT[mese - 1]}
            </div>
            {fattura ? (
              <>
                <div style={{ fontSize: '1rem' }}>✅</div>
                {fattura.importo && <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#27AE60', marginTop: 1 }}>€{parseFloat(fattura.importo).toFixed(0)}</div>}
                {fattura.file_url && <div style={{ fontSize: '0.6rem', color: '#6C5CE7', marginTop: 1 }}>📄</div>}
              </>
            ) : (
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: hasProblem || isCurrent ? '#FC8181' : '#CBD5E0' }}>
                {isCurrent ? '⚠' : hasProblem ? 'mancante' : '—'}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )

  const editingFattura = editMese !== null ? getFattura(editMese, editBambinoId ?? undefined) : null
  const editingBambinoNome = editBambinoId != null ? (figliFull.find(f => f.id === editBambinoId)?.nome ?? null) : null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)', padding: '1.25rem 1.5rem', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>🧾</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{genitoreName}</span>
                {tuttoSaldato && <span style={{ background: 'rgba(72,187,120,0.25)', border: '1px solid rgba(72,187,120,0.5)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, color: '#c6f6d5' }}>✓ tutto saldato</span>}
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>{genitoreEmail}</div>
              {figliFull.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {figliFull.map(f => (
                    <span key={f.id} style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
                      👶 {f.nome}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: 32, height: 32, color: 'white', fontSize: 18, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        {/* Anno e sommario */}
        <div style={{ padding: '1rem 1.5rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#333' }}>Anno {anno}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem' }}>
            <span style={{ color: '#27AE60', fontWeight: 700 }}>✅ {slotPagati}/{slotAttesi} pagati</span>
            {slotAttesi - slotPagati > 0 && (
              <span style={{ color: '#E53E3E', fontWeight: 700 }}>⚠ {slotAttesi - slotPagati} mancanti</span>
            )}
            {totale > 0 && <span style={{ color: '#6C5CE7', fontWeight: 800 }}>€ {totale.toFixed(2).replace('.', ',')}</span>}
          </div>
        </div>

        {/* Griglia: singola o per-figlio */}
        <div style={{ padding: '0.5rem 1.5rem 1.5rem' }}>
          {isMulti ? (
            figliFull.map((figlio, idx) => {
              const pFiglio = fattureAnno.filter(f => f.bambino === figlio.id).length
              return (
                <div key={figlio.id} style={{ marginBottom: idx < figliFull.length - 1 ? '1.25rem' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.625rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6C5CE7' }}>👶 {figlio.nome}</span>
                    <span style={{ fontSize: '0.72rem', color: pFiglio === 12 ? '#27AE60' : '#E53E3E', fontWeight: 600, background: pFiglio === 12 ? '#F0FFF4' : '#FFF5F5', border: `1px solid ${pFiglio === 12 ? '#C6F6D5' : '#FEB2B2'}`, borderRadius: 10, padding: '1px 8px' }}>
                      {pFiglio}/12
                    </span>
                  </div>
                  {renderGrid(figlio.id)}
                </div>
              )
            })
          ) : (
            // Singolo figlio (o nessun figlio tracciato): griglia standard
            renderGrid(figliFull.length === 1 ? null : null)
          )}
        </div>
      </div>

      {/* Sub-modal edit mese */}
      {editMese !== null && (
        <UploadModal
          genitoreId={genitoreId}
          genitoreName={genitoreName}
          bambinoId={editBambinoId}
          bambinoNome={editingBambinoNome}
          anno={anno}
          mese={editMese}
          existing={editingFattura ?? null}
          onClose={() => setEditMese(null)}
          onSaved={() => { setEditMese(null); onRefresh() }}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FatturePage() {
  const router = useRouter()
  const locale = useLocale()

  const mesi = ultimi12Mesi()
  const [anno, setAnno] = useState(mesi[0].anno)
  const [famiglie, setFamiglie] = useState<Famiglia[]>([])
  const [bambiniMap, setBambiniMap] = useState<Record<number, BambinoInfo[]>>({})
  const [fatture, setFatture] = useState<Fattura[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [familyModal, setFamilyModal] = useState<{ genitoreId: number; initialMese?: number } | null>(null)

  const mesiAnno = mesi.filter(m => m.anno === anno)

  const carica = useCallback(async () => {
    setLoading(true)
    try {
      const [fRes, bRes, fattureRes] = await Promise.all([
        fetch('/api/famiglie?page_size=500'),
        fetch('/api/bambini?page_size=500'),
        fetch(`/api/fatture?anno=${anno}`),
      ])
      if (fRes.status === 401) { router.push(`/${locale}/login`); return }

      const fData = await fRes.json()
      const bData = await bRes.json()
      const fattureData = await fattureRes.json()

      const famList: Famiglia[] = fData.results ?? fData
      const bamList: Bambino[] = bData.results ?? bData

      // Mappa genitore1_id → [BambinoInfo] (da TUTTE le famiglie del genitore)
      const map: Record<number, BambinoInfo[]> = {}
      for (const b of bamList) {
        const famId = b.famiglia?.id
        if (!famId) continue
        const fam = famList.find(f => f.id === famId)
        if (!fam) continue
        const nomeB = b.alias_attivo && b.alias_nome ? b.alias_nome : b.nome
        const key = fam.genitore1
        if (!map[key]) map[key] = []
        if (!map[key].some(x => x.id === b.id)) {
          map[key].push({ id: b.id, nome: `${nomeB} ${b.cognome}` })
        }
      }

      // Deduplicazione: una sola riga per genitore1 (anche se ha figli in famiglie diverse)
      const genitoriMap = new Map<number, Famiglia>()
      for (const fam of famList) {
        if (!genitoriMap.has(fam.genitore1)) genitoriMap.set(fam.genitore1, fam)
      }
      setFamiglie(Array.from(genitoriMap.values()))
      setBambiniMap(map)
      setFatture(fattureData.results ?? fattureData)
    } finally {
      setLoading(false)
    }
  }, [anno, locale, router])

  useEffect(() => { carica() }, [carica])

  // Helper: fatture di un genitore per un dato mese (qualsiasi bambino)
  const getFatturePerMese = (genitoreId: number, mese: number): Fattura[] =>
    fatture.filter(f => f.genitore === genitoreId && f.anno === anno && f.mese === mese)

  const famiglieFiltrate = famiglie.filter(fam => {
    if (!search) return true
    const q = search.toLowerCase()
    const figli = (bambiniMap[fam.genitore1] ?? []).map(b => b.nome).join(' ').toLowerCase()
    return fam.genitore1_nome.toLowerCase().includes(q)
      || fam.genitore1_email.toLowerCase().includes(q)
      || figli.includes(q)
  })

  function totaleGenitore(genitoreId: number): number {
    return fatture
      .filter(f => f.genitore === genitoreId && f.anno === anno)
      .reduce((acc, f) => acc + (f.importo ? parseFloat(f.importo) : 0), 0)
  }

  // Calcola slot attesi e pagati per l'header stats
  const totaleFatture = famiglieFiltrate.reduce((acc, fam) => {
    const nFigli = Math.max(bambiniMap[fam.genitore1]?.length ?? 1, 1)
    const isMulti = nFigli > 1
    if (isMulti) {
      // conta fatture con bambino settato
      return acc + mesiAnno.filter(({ mese: m }) =>
        getFatturePerMese(fam.genitore1, m).some(f => f.bambino != null)
      ).length * 0 + fatture.filter(f => f.genitore === fam.genitore1 && f.anno === anno && mesiAnno.some(mx => mx.mese === f.mese)).length
    }
    return acc + mesiAnno.filter(({ mese: m }) => getFatturePerMese(fam.genitore1, m).length > 0).length
  }, 0)
  const totaleSlotAttesi = famiglieFiltrate.reduce((acc, fam) => {
    const nFigli = Math.max(bambiniMap[fam.genitore1]?.length ?? 1, 1)
    return acc + mesiAnno.length * nFigli
  }, 0)
  const totaleMancanti = totaleSlotAttesi - totaleFatture
  const totaleComplessivo = famiglieFiltrate.reduce((acc, fam) => acc + totaleGenitore(fam.genitore1), 0)

  const familyModalData = familyModal ? famiglieFiltrate.find(f => f.genitore1 === familyModal.genitoreId) ?? null : null

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F7FAFC' }}>
        <p style={{ color: '#6C5CE7', fontWeight: 600 }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFC' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)', padding: '1.25rem 1.5rem 1.75rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(1200px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button onClick={() => router.push(`/${locale}/dashboard/admin`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}>
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>🧾 Gestione Fatture</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.85rem' }}>
            {totaleFatture} fatture caricate · {totaleMancanti > 0 ? `${totaleMancanti} mancanti` : '✓ tutto in ordine'}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'min(1200px, 96vw)', margin: '0 auto', padding: '1.25rem 1rem 3rem' }}>

        {/* Toolbar */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '0.875rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <input type="search" placeholder="Cerca per nome, email o bambino..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '0.5rem 0.875rem', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '0.875rem', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {[...new Set(mesi.map(m => m.anno))].sort((a, b) => b - a).map(a => (
              <button key={a} onClick={() => setAnno(a)}
                style={{ padding: '0.5rem 0.875rem', background: anno === a ? '#6C5CE7' : '#F7FAFC', color: anno === a ? 'white' : '#555', border: `1px solid ${anno === a ? '#6C5CE7' : '#E2E8F0'}`, borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Tabella */}
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ background: '#F7FAFC' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#555', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#F7FAFC', zIndex: 1 }}>
                  Genitore / Figli
                </th>
                {mesiAnno.map(({ anno: a, mese: m }) => (
                  <th key={m} style={{ padding: '0.625rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#555', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', minWidth: 60 }}>
                    {MESI_SHORT[m - 1]}
                  </th>
                ))}
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#555', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', minWidth: 90 }}>
                  Totale {anno}
                </th>
              </tr>
            </thead>
            <tbody>
              {famiglieFiltrate.length === 0 ? (
                <tr>
                  <td colSpan={mesiAnno.length + 2} style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
                    Nessuna famiglia trovata.
                  </td>
                </tr>
              ) : famiglieFiltrate.map((fam, i) => {
                const figliFull = bambiniMap[fam.genitore1] ?? []
                const nFigli = Math.max(figliFull.length, 1)
                const isMulti = figliFull.length > 1
                const totaleR = totaleGenitore(fam.genitore1)
                const slotPagati = fatture.filter(f => f.genitore === fam.genitore1 && f.anno === anno && mesiAnno.some(mx => mx.mese === f.mese)).length
                const slotTotali = mesiAnno.length * nFigli

                return (
                  <tr key={fam.genitore1} style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#EDE9FE')}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FAFAFA')}>

                    {/* Colonna nome — clic apre FamilyModal */}
                    <td
                      style={{ padding: '0.625rem 1rem', borderBottom: '1px solid #F0F0F0', position: 'sticky', left: 0, background: 'inherit', zIndex: 1, cursor: 'pointer' }}
                      onClick={() => setFamilyModal({ genitoreId: fam.genitore1 })}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: '#333', whiteSpace: 'nowrap' }}>
                            {fam.genitore1_nome || fam.genitore1_email}
                          </p>
                          {figliFull.length > 0 && (
                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: '#6C5CE7', fontWeight: 600 }}>
                              👶 {figliFull.map(b => b.nome).join(' · ')}
                            </p>
                          )}
                          <p style={{ margin: '0.05rem 0 0', fontSize: '0.7rem', color: '#aaa' }}>{fam.genitore1_email}</p>
                        </div>
                        {/* Badge stato */}
                        <span style={{
                          marginLeft: 'auto', flexShrink: 0,
                          fontSize: '0.7rem', fontWeight: 700,
                          background: slotPagati >= slotTotali ? '#F0FFF4' : '#FFF5F5',
                          color: slotPagati >= slotTotali ? '#27AE60' : '#E53E3E',
                          border: `1px solid ${slotPagati >= slotTotali ? '#C6F6D5' : '#FEB2B2'}`,
                          borderRadius: 12, padding: '2px 8px', whiteSpace: 'nowrap',
                        }}>
                          {slotPagati}/{slotTotali}
                        </span>
                      </div>
                    </td>

                    {/* Celle mese */}
                    {mesiAnno.map(({ anno: a, mese: m }) => {
                      const fattMese = getFatturePerMese(fam.genitore1, m)
                      const nPagati = fattMese.length
                      const allPaid = nPagati >= nFigli
                      const partPaid = nPagati > 0 && nPagati < nFigli
                      const isCurrent = m === new Date().getMonth() + 1 && a === new Date().getFullYear()
                      const totMese = fattMese.reduce((acc, f) => acc + (f.importo ? parseFloat(f.importo) : 0), 0)
                      return (
                        <td key={m}
                          onClick={() => setFamilyModal({ genitoreId: fam.genitore1, initialMese: m })}
                          style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #F0F0F0', cursor: 'pointer' }}>
                          {allPaid ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
                              <span style={{ fontSize: '0.9rem' }}>✅</span>
                              {totMese > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#27AE60' }}>€{totMese.toFixed(0)}</span>}
                              {isMulti && <span style={{ fontSize: '0.6rem', color: '#27AE60' }}>{nPagati}/{nFigli}</span>}
                            </div>
                          ) : partPaid ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
                              <span style={{ fontSize: '0.9rem' }}>🔶</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#D97706' }}>{nPagati}/{nFigli}</span>
                            </div>
                          ) : (
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '6px',
                              background: isCurrent ? '#FFF5F5' : '#F7FAFC',
                              color: isCurrent ? '#FC8181' : '#CBD5E0',
                            }}>
                              {isCurrent ? '⚠' : '—'}
                            </span>
                          )}
                        </td>
                      )
                    })}

                    {/* Totale riga */}
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderBottom: '1px solid #F0F0F0', whiteSpace: 'nowrap' }}>
                      {totaleR > 0 ? (
                        <span style={{ fontWeight: 700, color: '#27AE60', fontSize: '0.875rem' }}>
                          € {totaleR.toFixed(2).replace('.', ',')}
                        </span>
                      ) : (
                        <span style={{ color: '#CBD5E0', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {famiglieFiltrate.length > 0 && (
              <tfoot>
                <tr style={{ background: '#F7FAFC', borderTop: '2px solid #E2E8F0' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#333', position: 'sticky', left: 0, background: '#F7FAFC', fontSize: '0.82rem' }}>
                    Totale {anno}
                  </td>
                  {mesiAnno.map(({ mese: m }) => {
                    const tot = famiglieFiltrate.reduce((acc, fam) => {
                      return acc + getFatturePerMese(fam.genitore1, m)
                        .reduce((s, f) => s + (f.importo ? parseFloat(f.importo) : 0), 0)
                    }, 0)
                    return (
                      <td key={m} style={{ padding: '0.5rem', textAlign: 'center' }}>
                        {tot > 0
                          ? <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4A5568' }}>€{tot.toFixed(0)}</span>
                          : <span style={{ fontSize: '0.72rem', color: '#CBD5E0' }}>—</span>}
                      </td>
                    )
                  })}
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, color: '#6C5CE7', fontSize: '1rem' }}>
                      € {totaleComplessivo.toFixed(2).replace('.', ',')}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Alert mese corrente */}
        {(() => {
          const meseC = new Date().getMonth() + 1
          const annoC = new Date().getFullYear()
          if (anno !== annoC) return null
          const scoperti = famiglieFiltrate.filter(fam => {
            const nFigli = Math.max(bambiniMap[fam.genitore1]?.length ?? 1, 1)
            return getFatturePerMese(fam.genitore1, meseC).length < nFigli
          })
          if (scoperti.length === 0) return null
          return (
            <div style={{ marginTop: '1.25rem', background: '#FFF5F5', borderRadius: '14px', padding: '1rem 1.25rem', border: '1px solid #FEB2B2' }}>
              <p style={{ margin: '0 0 0.625rem', fontWeight: 700, color: '#C53030', fontSize: '0.9rem' }}>
                ⚠ Fatture mancanti per {MESI_LABEL[meseC - 1]} {annoC} ({scoperti.length})
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {scoperti.map(fam => (
                  <button key={fam.genitore1}
                    onClick={() => setFamilyModal({ genitoreId: fam.genitore1, initialMese: meseC })}
                    style={{ padding: '0.3rem 0.75rem', background: 'white', border: '1px solid #FEB2B2', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#C53030', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {fam.genitore1_nome || fam.genitore1_email}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* FamilyModal */}
      {familyModal && familyModalData && (
        <FamilyModal
          genitoreId={familyModal.genitoreId}
          genitoreName={familyModalData.genitore1_nome || familyModalData.genitore1_email}
          genitoreEmail={familyModalData.genitore1_email}
          figliFull={bambiniMap[familyModal.genitoreId] ?? []}
          anno={anno}
          fattureTutte={fatture}
          onClose={() => setFamilyModal(null)}
          onRefresh={() => { carica() }}
          initialMese={familyModal.initialMese}
        />
      )}
    </div>
  )
}
