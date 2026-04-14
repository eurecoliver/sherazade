'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Gruppo {
  id: number
  nome: string
  colore: string
}

interface AnnoScolastico {
  id: number
  nome: string
  data_inizio: string
  data_fine: string
  attivo: boolean
  descrizione: string
}

interface MediaItem {
  id: number
  anno: number
  anno_nome: string
  gruppo: number | null
  gruppo_nome: string | null
  gruppo_colore: string
  file_url: string
  thumbnail_url: string | null
  tipo: 'foto' | 'video'
  data: string
  autore_nome: string | null
  descrizione: string
  caricato_at: string
}

interface UploadItem {
  id: string
  file: File
  progress: number
  done: boolean
  error: string | null
}

interface Me {
  id: number
  role: string
  first_name: string
  last_name: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtData(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function fmtDataLong(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function detectTipo(file: File): 'foto' | 'video' {
  return file.type.startsWith('video/') ? 'video' : 'foto'
}

const MANAGER_ROLES = ['admin', 'direttrice']

// ─── Component ────────────────────────────────────────────────────────────────

export default function StaffPortfolioPage() {
  const router = useRouter()
  const locale = useLocale()

  const [me, setMe] = useState<Me | null>(null)
  const [anni, setAnni] = useState<AnnoScolastico[]>([])
  const [gruppi, setGruppi] = useState<Gruppo[]>([])
  const [selectedAnno, setSelectedAnno] = useState<number | null>(null)
  const [selectedGruppo, setSelectedGruppo] = useState<number | null>(null)
  const [giorni, setGiorni] = useState<string[]>([])
  const [selectedData, setSelectedData] = useState<string>(localIso(new Date()))
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [lightbox, setLightbox] = useState<{ items: MediaItem[]; index: number } | null>(null)
  const [canEdit, setCanEdit] = useState(false)

  // Modale gestione anni (solo admin/direttrice)
  const [showAnniModal, setShowAnniModal] = useState(false)
  const [newAnno, setNewAnno] = useState({ nome: '', data_inizio: '', data_fine: '', descrizione: '' })
  const [savingAnno, setSavingAnno] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
      fetch('/api/portfolio/anni').then(r => r.ok ? r.json() : []),
      fetch('/api/config/gruppi').then(r => r.ok ? r.json() : []),
      fetch('/api/config/permessi-utente').then(r => r.ok ? r.json() : { risorse: null }),
    ]).then(([meData, anniData, gruppiData, permData]) => {
      setMe(meData)
      const anniList: AnnoScolastico[] = Array.isArray(anniData) ? anniData : []
      setAnni(anniList)
      setGruppi(Array.isArray(gruppiData) ? gruppiData : [])

      // Anno corrente di default (attivo=true), oppure il primo
      const attivo = anniList.find(a => a.attivo) ?? anniList[0]
      if (attivo) setSelectedAnno(attivo.id)

      // Permessi upload/delete
      const risorse: string[] | null = permData.risorse
      const role: string = meData?.role ?? ''
      if (MANAGER_ROLES.includes(role) || (risorse && risorse.includes('portfolio:scrivi'))) {
        setCanEdit(true)
      } else if (!risorse) {
        // Fallback: tutti i ruoli non-genitore possono caricare
        setCanEdit(role !== 'genitore')
      } else {
        setCanEdit(risorse.includes('portfolio'))
      }
    })
  }, [])

  // ── Giorni con contenuto ───────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedAnno) return
    const params = new URLSearchParams({ anno: String(selectedAnno) })
    if (selectedGruppo) params.set('gruppo', String(selectedGruppo))
    fetch(`/api/portfolio/media/giorni?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(setGiorni)
  }, [selectedAnno, selectedGruppo])

  // ── Media per data ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedAnno || !selectedData) return
    setLoadingMedia(true)
    const params = new URLSearchParams({ anno: String(selectedAnno), data: selectedData })
    if (selectedGruppo) params.set('gruppo', String(selectedGruppo))
    fetch(`/api/portfolio/media?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setMedia(Array.isArray(data) ? data : (data.results ?? []))
        setLoadingMedia(false)
      })
  }, [selectedAnno, selectedGruppo, selectedData])

  // ── Scroll strip to selected date ─────────────────────────────────────────

  useEffect(() => {
    if (!stripRef.current) return
    const el = stripRef.current.querySelector('[data-selected="true"]')
    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedData, giorni])

  // ── Upload ─────────────────────────────────────────────────────────────────

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!selectedAnno || !selectedData) return
    const arr = Array.from(files)
    const newItems: UploadItem[] = arr.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      progress: 0,
      done: false,
      error: null,
    }))
    setUploads(prev => [...prev, ...newItems])

    for (const item of newItems) {
      const fd = new FormData()
      fd.append('file', item.file)
      fd.append('tipo', detectTipo(item.file))
      fd.append('anno', String(selectedAnno))
      if (selectedGruppo) fd.append('gruppo', String(selectedGruppo))
      fd.append('data', selectedData)

      try {
        // Simula progresso durante l'upload
        setUploads(prev => prev.map(u => u.id === item.id ? { ...u, progress: 30 } : u))
        const res = await fetch('/api/portfolio/media', { method: 'POST', body: fd })
        if (res.ok) {
          const created: MediaItem = await res.json()
          setUploads(prev => prev.map(u => u.id === item.id ? { ...u, progress: 100, done: true } : u))
          setMedia(prev => [...prev, created])
          // Aggiunge la data ai giorni se non c'è
          if (!giorni.includes(selectedData)) {
            setGiorni(prev => [...prev, selectedData].sort())
          }
        } else {
          const err = await res.json().catch(() => ({}))
          setUploads(prev => prev.map(u =>
            u.id === item.id ? { ...u, error: err.detail ?? 'Errore upload' } : u
          ))
        }
      } catch {
        setUploads(prev => prev.map(u =>
          u.id === item.id ? { ...u, error: 'Errore di rete' } : u
        ))
      }
    }

    // Pulisce gli upload completati dopo 3s
    setTimeout(() => {
      setUploads(prev => prev.filter(u => !u.done))
    }, 3000)
  }, [selectedAnno, selectedGruppo, selectedData, giorni])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
  }, [uploadFiles])

  const handleDelete = async (id: number) => {
    if (!confirm('Rimuovere questo file dal portfolio?')) return
    const res = await fetch(`/api/portfolio/media/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMedia(prev => prev.filter(m => m.id !== id))
    }
  }

  const handleSaveAnno = async () => {
    setSavingAnno(true)
    const res = await fetch('/api/portfolio/anni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAnno),
    })
    if (res.ok) {
      const created = await res.json()
      setAnni(prev => [created, ...prev])
      setNewAnno({ nome: '', data_inizio: '', data_fine: '', descrizione: '' })
      setShowAnniModal(false)
    }
    setSavingAnno(false)
  }

  // ── Lightbox navigation ────────────────────────────────────────────────────

  const closeLightbox = useCallback(() => setLightbox(null), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!lightbox) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') setLightbox(lb => lb && lb.index < lb.items.length - 1 ? { ...lb, index: lb.index + 1 } : lb)
      if (e.key === 'ArrowLeft') setLightbox(lb => lb && lb.index > 0 ? { ...lb, index: lb.index - 1 } : lb)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, closeLightbox])

  const backPath = me?.role && MANAGER_ROLES.includes(me.role)
    ? `/${locale}/dashboard/admin`
    : `/${locale}/dashboard/staff`

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FF', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0984E3 0%, #0652DD 100%)',
        color: '#fff', padding: '0',
      }}>
        <div style={{ maxWidth: 'min(960px, 96vw)', margin: '0 auto', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => router.push(backPath)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 20,
                  color: '#fff',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                ← Dashboard
              </button>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>📸 Portfolio</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Galleria foto e video per gruppo</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {me?.role && MANAGER_ROLES.includes(me.role) && (
                <button
                  onClick={() => setShowAnniModal(true)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 20,
                    color: '#fff',
                    padding: '6px 14px',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  ⚙️ Anni
                </button>
              )}
              <UserChip onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 'min(960px, 96vw)', margin: '0 auto', padding: '20px' }}>

        {/* ── Selettore anno ── */}
        {anni.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {anni.map(a => (
              <button
                key={a.id}
                onClick={() => { setSelectedAnno(a.id); setSelectedData(localIso(new Date())) }}
                style={{
                  padding: '7px 18px',
                  borderRadius: 20,
                  border: selectedAnno === a.id ? 'none' : '1.5px solid #C7D2FE',
                  background: selectedAnno === a.id ? '#0984E3' : '#fff',
                  color: selectedAnno === a.id ? '#fff' : '#374151',
                  fontWeight: selectedAnno === a.id ? 700 : 400,
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'all 0.15s',
                }}
              >
                {a.attivo ? '● ' : ''}{a.nome}
              </button>
            ))}
          </div>
        )}

        {/* ── Selettore gruppo ── */}
        {gruppi.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <button
              onClick={() => setSelectedGruppo(null)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: selectedGruppo === null ? 'none' : '1.5px solid #E5E7EB',
                background: selectedGruppo === null ? '#374151' : '#fff',
                color: selectedGruppo === null ? '#fff' : '#374151',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Tutti i gruppi
            </button>
            {gruppi.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGruppo(g.id)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  border: selectedGruppo === g.id ? 'none' : `1.5px solid ${g.colore}33`,
                  background: selectedGruppo === g.id ? g.colore : `${g.colore}18`,
                  color: selectedGruppo === g.id ? '#fff' : g.colore,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                  transition: 'all 0.15s',
                }}
              >
                {g.nome}
              </button>
            ))}
          </div>
        )}

        {/* ── Strip date ── */}
        {giorni.length > 0 && (
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '12px 16px',
            marginBottom: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Giorni con contenuto</div>
            <div
              ref={stripRef}
              style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}
            >
              {giorni.map(d => {
                const isSelected = d === selectedData
                return (
                  <button
                    key={d}
                    data-selected={isSelected}
                    onClick={() => setSelectedData(d)}
                    style={{
                      flexShrink: 0,
                      padding: '6px 12px',
                      borderRadius: 12,
                      border: 'none',
                      background: isSelected ? '#0984E3' : '#F0F4FF',
                      color: isSelected ? '#fff' : '#374151',
                      fontWeight: isSelected ? 700 : 400,
                      cursor: 'pointer',
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                    }}
                  >
                    {fmtData(d)}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Selezione data manuale ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>
            📅 {fmtDataLong(selectedData)}
          </span>
          <input
            type="date"
            value={selectedData}
            onChange={e => setSelectedData(e.target.value)}
            style={{
              border: '1.5px solid #E5E7EB',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 13,
              color: '#374151',
            }}
          />
        </div>

        {/* ── Upload zone ── */}
        {canEdit && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#0984E3' : '#C7D2FE'}`,
              borderRadius: 16,
              background: dragging ? '#EBF5FF' : '#F8FAFF',
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: 16,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
            <div style={{ fontSize: 15, color: '#374151', fontWeight: 600 }}>
              Trascina foto e video qui
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
              oppure clicca per selezionare — più file in una volta
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files && uploadFiles(e.target.files)}
            />
          </div>
        )}

        {/* ── Progresso upload ── */}
        {uploads.length > 0 && (
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {uploads.map(u => (
              <div key={u.id} style={{
                background: '#fff',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}>
                <span style={{ fontSize: 13, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.done ? '✅' : u.error ? '❌' : '⏳'} {u.file.name}
                </span>
                {!u.done && !u.error && (
                  <div style={{ width: 100, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${u.progress}%`, height: '100%', background: '#0984E3', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                )}
                {u.error && <span style={{ fontSize: 12, color: '#EF4444' }}>{u.error}</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── Gallery ── */}
        {loadingMedia ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Caricamento…</div>
        ) : media.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '48px 20px',
            textAlign: 'center',
            color: '#9CA3AF',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Nessun contenuto per questa data</div>
            {canEdit && <div style={{ fontSize: 13, marginTop: 4 }}>Carica foto o video dall&apos;area di upload sopra</div>}
          </div>
        ) : (
          <div style={{
            columns: '3 180px',
            columnGap: 10,
          }}>
            {media.map((item, idx) => (
              <MediaCard
                key={item.id}
                item={item}
                canDelete={canEdit}
                onClick={() => setLightbox({ items: media, index: idx })}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <Lightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={closeLightbox}
          onChange={idx => setLightbox(lb => lb ? { ...lb, index: idx } : null)}
        />
      )}

      {/* ── Modale anni ── */}
      {showAnniModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 20,
        }} onClick={() => setShowAnniModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 28,
            width: 'min(480px, 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#1F2937' }}>📅 Gestione anni scolastici</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {anni.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', background: '#F9FAFB', borderRadius: 10,
                }}>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: '#1F2937' }}>
                    {a.attivo ? '● ' : ''}{a.nome}
                  </span>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>{a.data_inizio} → {a.data_fine}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#374151' }}>Nuovo anno / periodo</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  placeholder="Nome (es. 2024-2025, Campo Solare Agosto 2025)"
                  value={newAnno.nome}
                  onChange={e => setNewAnno(p => ({ ...p, nome: e.target.value }))}
                  style={{ border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Data inizio</label>
                    <input
                      type="date"
                      value={newAnno.data_inizio}
                      onChange={e => setNewAnno(p => ({ ...p, data_inizio: e.target.value }))}
                      style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Data fine</label>
                    <input
                      type="date"
                      value={newAnno.data_fine}
                      onChange={e => setNewAnno(p => ({ ...p, data_fine: e.target.value }))}
                      style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}
                    />
                  </div>
                </div>
                <input
                  placeholder="Note opzionali (es. Campo solare)"
                  value={newAnno.descrizione}
                  onChange={e => setNewAnno(p => ({ ...p, descrizione: e.target.value }))}
                  style={{ border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}
                />
                <button
                  onClick={handleSaveAnno}
                  disabled={savingAnno || !newAnno.nome || !newAnno.data_inizio || !newAnno.data_fine}
                  style={{
                    background: '#0984E3', color: '#fff',
                    border: 'none', borderRadius: 10, padding: '10px',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    opacity: savingAnno || !newAnno.nome ? 0.6 : 1,
                  }}
                >
                  {savingAnno ? 'Salvataggio…' : 'Crea anno / periodo'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowAnniModal(false)}
              style={{
                marginTop: 16, width: '100%', background: '#F3F4F6',
                border: 'none', borderRadius: 10, padding: '10px',
                fontSize: 14, cursor: 'pointer', color: '#374151',
              }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MediaCard ────────────────────────────────────────────────────────────────

function MediaCard({
  item,
  canDelete,
  onClick,
  onDelete,
}: {
  item: MediaItem
  canDelete: boolean
  onClick: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 10,
        breakInside: 'avoid',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.18)' : '0 1px 6px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.2s, transform 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {item.tipo === 'foto' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnail_url ?? item.file_url}
          alt=""
          style={{ display: 'block', width: '100%', height: 'auto', minHeight: 80 }}
          loading="lazy"
        />
      ) : (
        <div style={{ position: 'relative', background: '#1F2937', minHeight: 120 }}>
          {item.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail_url}
              alt=""
              style={{ display: 'block', width: '100%', height: 'auto' }}
              loading="lazy"
            />
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 40 }}>🎬</span>
            </div>
          )}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
              <span style={{ fontSize: 18, marginLeft: 3 }}>▶</span>
            </div>
          </div>
        </div>
      )}

      {/* Overlay info + delete */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '10px 10px 8px',
        }}>
          {item.autore_nome && (
            <div style={{ color: '#fff', fontSize: 11, opacity: 0.9 }}>📷 {item.autore_nome}</div>
          )}
        </div>
      )}

      {canDelete && hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(239,68,68,0.9)',
            border: 'none', color: '#fff',
            cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  items,
  index,
  onClose,
  onChange,
}: {
  items: MediaItem[]
  index: number
  onClose: () => void
  onChange: (i: number) => void
}) {
  const item = items[index]

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = item.file_url
    a.download = `portfolio_${item.data}_${item.id}`
    a.target = '_blank'
    a.click()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* Chiudi */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '50%', width: 40, height: 40,
          color: '#fff', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ×
      </button>

      {/* Download */}
      <button
        onClick={e => { e.stopPropagation(); handleDownload() }}
        style={{
          position: 'absolute', top: 16, right: 64,
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 20, padding: '8px 16px',
          color: '#fff', fontSize: 13, cursor: 'pointer',
        }}
      >
        ⬇ Scarica
      </button>

      {/* Counter */}
      <div style={{
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.7)', fontSize: 13,
      }}>
        {index + 1} / {items.length}
      </div>

      {/* Freccia sinistra */}
      {index > 0 && (
        <button
          onClick={e => { e.stopPropagation(); onChange(index - 1) }}
          style={{
            position: 'absolute', left: 12,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%', width: 44, height: 44,
            color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ‹
        </button>
      )}

      {/* Media */}
      <div
        style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', alignItems: 'center' }}
        onClick={e => e.stopPropagation()}
      >
        {item.tipo === 'foto' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.file_url}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }}
          />
        ) : (
          <video
            src={item.file_url}
            controls
            autoPlay
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12 }}
          />
        )}
      </div>

      {/* Freccia destra */}
      {index < items.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); onChange(index + 1) }}
          style={{
            position: 'absolute', right: 12,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%', width: 44, height: 44,
            color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ›
        </button>
      )}

      {/* Info sotto */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center',
      }}>
        {item.data && <span>{new Date(item.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
        {item.gruppo_nome && <span> · {item.gruppo_nome}</span>}
        {item.autore_nome && <span> · 📷 {item.autore_nome}</span>}
      </div>
    </div>
  )
}
