'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bambino {
  id: number
  nome: string
  cognome: string
  alias_nome: string
  alias_attivo: boolean
  gruppo: number | null
  gruppo_nome: string
  gruppo_colore: string
}

interface Iscrizione {
  id: number
  bambino: number
  anno: number
  anno_nome: string
  gruppo: number | null
  gruppo_nome: string
  gruppo_colore: string
}

interface AnnoScolastico {
  id: number
  nome: string
  data_inizio: string
  data_fine: string
  attivo: boolean
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

function nomeBambino(b: Bambino): string {
  return b.alias_attivo && b.alias_nome ? b.alias_nome : `${b.nome} ${b.cognome}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GenitorePortfolioPage() {
  const router = useRouter()
  const locale = useLocale()

  const [bambini, setBambini] = useState<Bambino[]>([])
  const [selectedBambino, setSelectedBambino] = useState<number | null>(null)
  const [iscrizioni, setIscrizioni] = useState<Iscrizione[]>([])
  const [anni, setAnni] = useState<AnnoScolastico[]>([])
  const [selectedAnno, setSelectedAnno] = useState<number | null>(null)
  const [selectedGruppo, setSelectedGruppo] = useState<number | null>(null)
  const [giorni, setGiorni] = useState<string[]>([])
  const [selectedData, setSelectedData] = useState<string | null>(null)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [lightbox, setLightbox] = useState<{ items: MediaItem[]; index: number } | null>(null)

  const stripRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/bambini').then(r => r.ok ? r.json() : []),
      fetch('/api/portfolio/anni').then(r => r.ok ? r.json() : []),
    ]).then(([bambiniData, anniData]) => {
      const list: Bambino[] = Array.isArray(bambiniData) ? bambiniData : (bambiniData.results ?? [])
      setBambini(list)
      setAnni(Array.isArray(anniData) ? anniData : [])
      if (list.length > 0) setSelectedBambino(list[0].id)
    })
  }, [])

  // ── Iscrizioni del bambino selezionato ─────────────────────────────────────

  useEffect(() => {
    if (!selectedBambino) return
    fetch(`/api/portfolio/iscrizioni?bambino=${selectedBambino}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Iscrizione[]) => {
        setIscrizioni(Array.isArray(data) ? data : [])
        // Seleziona l'anno più recente tra quelli iscritti
        if (data.length > 0) {
          // Trova l'anno attivo o il primo
          const annoAttivo = anni.find(a => a.attivo && data.some(i => i.anno === a.id))
          const firstAnno = data[0]
          if (annoAttivo) {
            setSelectedAnno(annoAttivo.id)
            setSelectedGruppo(data.find(i => i.anno === annoAttivo.id)?.gruppo ?? null)
          } else {
            setSelectedAnno(firstAnno.anno)
            setSelectedGruppo(firstAnno.gruppo)
          }
        } else {
          setSelectedAnno(null)
          setSelectedGruppo(null)
        }
      })
  }, [selectedBambino, anni])

  // ── Anni filtrati per iscrizioni ───────────────────────────────────────────

  const anniVisibili = anni.filter(a => iscrizioni.some(i => i.anno === a.id))

  // ── Quando cambia anno, aggiorna gruppo ────────────────────────────────────

  useEffect(() => {
    if (!selectedAnno) return
    const iscr = iscrizioni.find(i => i.anno === selectedAnno)
    if (iscr) setSelectedGruppo(iscr.gruppo)
  }, [selectedAnno, iscrizioni])

  // ── Giorni con contenuto ───────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedAnno) return
    const params = new URLSearchParams({ anno: String(selectedAnno) })
    if (selectedGruppo) params.set('gruppo', String(selectedGruppo))
    fetch(`/api/portfolio/media/giorni?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then((dates: string[]) => {
        setGiorni(dates)
        // Seleziona l'ultimo giorno con contenuto di default
        if (dates.length > 0 && !selectedData) {
          setSelectedData(dates[dates.length - 1])
        } else if (dates.length === 0) {
          setSelectedData(null)
        }
      })
  }, [selectedAnno, selectedGruppo]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Media per data ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedAnno || !selectedData) { setMedia([]); return }
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

  // ── Scroll strip ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!stripRef.current || !selectedData) return
    const el = stripRef.current.querySelector('[data-selected="true"]')
    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedData, giorni])

  // ── Lightbox keyboard ──────────────────────────────────────────────────────

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

  const bambinoSel = bambini.find(b => b.id === selectedBambino)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#FFF9F5', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
        color: '#fff',
      }}>
        <div style={{ maxWidth: 'min(800px, 96vw)', margin: '0 auto', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => router.push(`/${locale}/dashboard/genitore`)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.35)',
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
                <div style={{ fontSize: 12, opacity: 0.85 }}>Ricordi del nido</div>
              </div>
            </div>
            <UserChip onLogout={handleLogout} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 'min(800px, 96vw)', margin: '0 auto', padding: '20px' }}>

        {/* ── Selettore figlio (se più di uno) ── */}
        {bambini.length > 1 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {bambini.map(b => (
              <button
                key={b.id}
                onClick={() => {
                  setSelectedBambino(b.id)
                  setSelectedData(null)
                  setGiorni([])
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 24,
                  border: selectedBambino === b.id ? 'none' : '2px solid #FDDCCA',
                  background: selectedBambino === b.id
                    ? (b.gruppo_colore || '#F97316')
                    : '#fff',
                  color: selectedBambino === b.id ? '#fff' : '#374151',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 15,
                  transition: 'all 0.15s',
                  boxShadow: selectedBambino === b.id ? '0 4px 12px rgba(249,115,22,0.3)' : 'none',
                }}
              >
                {nomeBambino(b)}
              </button>
            ))}
          </div>
        )}

        {/* ── Contesto bambino ── */}
        {bambinoSel && (
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '14px 18px',
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: bambinoSel.gruppo_colore || '#F97316',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 18,
              flexShrink: 0,
            }}>
              {nomeBambino(bambinoSel).charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1F2937' }}>{nomeBambino(bambinoSel)}</div>
              {bambinoSel.gruppo_nome && (
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  <span style={{
                    display: 'inline-block',
                    background: `${bambinoSel.gruppo_colore}22`,
                    color: bambinoSel.gruppo_colore,
                    borderRadius: 8,
                    padding: '1px 8px',
                    fontWeight: 600,
                    fontSize: 12,
                  }}>
                    {bambinoSel.gruppo_nome}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Selettore anno ── */}
        {anniVisibili.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {anniVisibili.map(a => (
              <button
                key={a.id}
                onClick={() => { setSelectedAnno(a.id); setSelectedData(null) }}
                style={{
                  padding: '7px 18px',
                  borderRadius: 20,
                  border: selectedAnno === a.id ? 'none' : '1.5px solid #FDDCCA',
                  background: selectedAnno === a.id ? '#F97316' : '#fff',
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
        ) : (
          selectedBambino && (
            <div style={{
              background: '#fff', borderRadius: 16,
              padding: '32px 20px', textAlign: 'center',
              color: '#9CA3AF', marginBottom: 20,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              <div style={{ fontWeight: 600 }}>Nessun anno scolastico configurato</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Contatta il nido per informazioni</div>
            </div>
          )
        )}

        {/* ── Strip date ── */}
        {giorni.length > 0 && (
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Scegli un giorno
            </div>
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
                      padding: '8px 14px',
                      borderRadius: 14,
                      border: 'none',
                      background: isSelected ? '#F97316' : '#FFF3EE',
                      color: isSelected ? '#fff' : '#EA580C',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? '0 2px 8px rgba(249,115,22,0.3)' : 'none',
                    }}
                  >
                    {fmtData(d)}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Gallery ── */}
        {!selectedData ? (
          giorni.length === 0 && selectedAnno ? (
            <div style={{
              background: '#fff', borderRadius: 16,
              padding: '48px 20px', textAlign: 'center', color: '#9CA3AF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🌟</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                Nessuna foto ancora
              </div>
              <div style={{ fontSize: 14 }}>Le insegnanti caricheranno presto i momenti del nido!</div>
            </div>
          ) : null
        ) : loadingMedia ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Caricamento…</div>
        ) : media.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 16,
            padding: '48px 20px', textAlign: 'center', color: '#9CA3AF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
            <div style={{ fontWeight: 600 }}>Nessun contenuto per {fmtDataLong(selectedData)}</div>
          </div>
        ) : (
          <>
            <div style={{
              fontSize: 14, color: '#9CA3AF', marginBottom: 12,
              textAlign: 'center', fontWeight: 500,
            }}>
              {fmtDataLong(selectedData)} · {media.length} {media.length === 1 ? 'elemento' : 'elementi'}
            </div>
            <div style={{ columns: 'auto 160px', columnGap: 10 }}>
              {media.map((item, idx) => (
                <GenitoreMediaCard
                  key={item.id}
                  item={item}
                  onClick={() => setLightbox({ items: media, index: idx })}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <GenitoreLightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={closeLightbox}
          onChange={idx => setLightbox(lb => lb ? { ...lb, index: idx } : null)}
        />
      )}
    </div>
  )
}

// ─── GenitoreMediaCard ────────────────────────────────────────────────────────

function GenitoreMediaCard({
  item,
  onClick,
}: {
  item: MediaItem
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 10,
        breakInside: 'avoid',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: hovered
          ? '0 8px 24px rgba(249,115,22,0.2)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.2s, transform 0.15s',
        transform: hovered ? 'translateY(-3px) scale(1.01)' : 'none',
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
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2D3748, #4A5568)' }}>
              <span style={{ fontSize: 44 }}>🎬</span>
            </div>
          )}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
              <span style={{ fontSize: 20, marginLeft: 4 }}>▶</span>
            </div>
          </div>
        </div>
      )}

      {/* Overlay caldo al hover */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(234,88,12,0.4) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}

// ─── GenitoreLightbox ─────────────────────────────────────────────────────────

function GenitoreLightbox({
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
    a.download = `ricordo_${item.data}_${item.id}`
    a.target = '_blank'
    a.click()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10,5,0,0.94)',
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
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: 44, height: 44,
          color: '#fff', fontSize: 22, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ×
      </button>

      {/* Download */}
      <button
        onClick={e => { e.stopPropagation(); handleDownload() }}
        style={{
          position: 'absolute', top: 16, right: 68,
          background: 'rgba(249,115,22,0.85)',
          border: 'none',
          borderRadius: 20, padding: '9px 18px',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        ⬇ Scarica
      </button>

      {/* Counter */}
      <div style={{
        position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.6)', fontSize: 13,
      }}>
        {index + 1} / {items.length}
      </div>

      {/* Freccia sinistra */}
      {index > 0 && (
        <button
          onClick={e => { e.stopPropagation(); onChange(index - 1) }}
          style={{
            position: 'absolute', left: 12,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', width: 48, height: 48,
            color: '#fff', fontSize: 24, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ‹
        </button>
      )}

      {/* Media */}
      <div
        style={{ maxWidth: '90vw', maxHeight: '82vh', display: 'flex', alignItems: 'center' }}
        onClick={e => e.stopPropagation()}
      >
        {item.tipo === 'foto' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.file_url}
            alt=""
            style={{
              maxWidth: '90vw', maxHeight: '82vh',
              borderRadius: 16, objectFit: 'contain',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          />
        ) : (
          <video
            src={item.file_url}
            controls
            autoPlay
            style={{
              maxWidth: '90vw', maxHeight: '82vh',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          />
        )}
      </div>

      {/* Freccia destra */}
      {index < items.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); onChange(index + 1) }}
          style={{
            position: 'absolute', right: 12,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', width: 48, height: 48,
            color: '#fff', fontSize: 24, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ›
        </button>
      )}

      {/* Info – stile caldo */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(249,115,22,0.18)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(249,115,22,0.3)',
        borderRadius: 12,
        padding: '8px 20px',
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>
        ✨ {item.data ? new Date(item.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
        {item.gruppo_nome && ` · ${item.gruppo_nome}`}
      </div>
    </div>
  )
}
