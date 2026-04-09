'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

interface TipoEvento {
  id: number
  nome: string
  colore: string
  icona: string
}

interface Evento {
  id: number
  titolo: string
  descrizione: string
  tipo_dettaglio: TipoEvento | null
  data_inizio: string
  data_fine: string | null
  tutto_il_giorno: boolean
  ora_inizio: string | null
  ora_fine: string | null
  chiusura_scolastica: boolean
}

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
              'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const GIORNI_BREVI = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']

function localIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

function meseStr(anno: number, mese: number) {
  return `${anno}-${String(mese + 1).padStart(2, '0')}`
}

function eventiPerGiorno(eventi: Evento[], isoDate: string) {
  return eventi.filter(e => {
    if (e.data_fine) return e.data_inizio <= isoDate && isoDate <= e.data_fine
    return e.data_inizio === isoDate
  })
}

export default function CalendarioGenitore() {
  const router = useRouter()
  const locale = useLocale()

  const [oggi] = useState(() => new Date())
  const [anno, setAnno] = useState(oggi.getFullYear())
  const [mese, setMese] = useState(oggi.getMonth())
  const [vista, setVista] = useState<'mese' | 'lista'>('lista')
  const [eventi, setEventi] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [dettaglio, setDettaglio] = useState<Evento | null>(null)

  const caricaEventi = useCallback(async () => {
    setLoading(true)
    try {
      const ms = meseStr(anno, mese)
      const r = await fetch(`/api/calendario?mese=${ms}`)
      if (r.ok) {
        const data = await r.json()
        setEventi(Array.isArray(data) ? data : (data.results ?? []))
      }
    } finally {
      setLoading(false)
    }
  }, [anno, mese])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => router.push(`/${locale}/login`))
  }, [locale, router])

  useEffect(() => { caricaEventi() }, [caricaEventi])

  const navMese = (delta: number) => {
    const d = new Date(anno, mese + delta, 1)
    setAnno(d.getFullYear())
    setMese(d.getMonth())
  }

  const oggiIso = localIso(oggi)

  // Griglia mese
  const primoGiorno = new Date(anno, mese, 1)
  const ultimoGiorno = new Date(anno, mese + 1, 0)
  const startDow = (primoGiorno.getDay() + 6) % 7
  const giorni: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) giorni.push(null)
  for (let d = 1; d <= ultimoGiorno.getDate(); d++) giorni.push(new Date(anno, mese, d))
  while (giorni.length % 7 !== 0) giorni.push(null)

  const eventiLista = [...eventi].sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))

  const formatData = (iso: string) => {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF3EE' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #E17055 0%, #C0392B 100%)', padding: '2rem 1.5rem 3rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(780px, 96vw)', margin: '0 auto' }}>
          <button
            onClick={() => router.push(`/${locale}/dashboard/genitore`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', marginBottom: '0.875rem' }}
          >
            ‹ Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 800 }}>📅 Calendario scolastico</h1>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.875rem' }}>Eventi, gite e chiusure del nido</p>
        </div>
      </div>

      {/* Contenuto */}
      <div style={{ maxWidth: 'min(780px, 96vw)', margin: '-1.5rem auto 0', padding: '0 1rem 3rem', position: 'relative', zIndex: 1 }}>

        {/* Toolbar */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '0.875rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 2px 12px rgba(225,112,85,0.08)' }}>
          <button onClick={() => navMese(-1)} style={{ background: '#FFF3EE', border: 'none', borderRadius: '10px', width: 36, height: 36, cursor: 'pointer', fontSize: '1.1rem', color: '#E17055', fontWeight: 700 }}>‹</button>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#333', flex: 1, textAlign: 'center' }}>{MESI[mese]} {anno}</p>
          <button onClick={() => navMese(1)} style={{ background: '#FFF3EE', border: 'none', borderRadius: '10px', width: 36, height: 36, cursor: 'pointer', fontSize: '1.1rem', color: '#E17055', fontWeight: 700 }}>›</button>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => setVista('lista')} style={{ padding: '0.35rem 0.75rem', background: vista === 'lista' ? '#E17055' : '#FFF3EE', color: vista === 'lista' ? 'white' : '#E17055', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>Lista</button>
            <button onClick={() => setVista('mese')} style={{ padding: '0.35rem 0.75rem', background: vista === 'mese' ? '#E17055' : '#FFF3EE', color: vista === 'mese' ? 'white' : '#E17055', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>Mese</button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#E17055', padding: '2rem' }}>Caricamento...</p>
        ) : vista === 'lista' ? (
          /* ── Lista ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {eventiLista.length === 0 && (
              <div style={{ background: 'white', borderRadius: '14px', padding: '2rem', textAlign: 'center', color: '#BBB' }}>
                Nessun evento in questo mese.
              </div>
            )}
            {eventiLista.map(ev => {
              const colore = ev.tipo_dettaglio?.colore ?? '#E17055'
              return (
                <button
                  key={ev.id}
                  onClick={() => setDettaglio(ev)}
                  style={{
                    background: 'white', borderRadius: '14px', padding: '1rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '1rem', width: '100%',
                    boxShadow: '0 2px 8px rgba(225,112,85,0.06)',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    borderLeft: `4px solid ${colore}`,
                  }}
                >
                  <div style={{ minWidth: 44, textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '1.4rem' }}>{ev.tipo_dettaglio?.icona ?? '📅'}</p>
                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, color: '#AAA' }}>{formatData(ev.data_inizio)}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#333' }}>
                      {ev.chiusura_scolastica && '⚠️ '}{ev.titolo}
                    </p>
                    {ev.tipo_dettaglio && (
                      <span style={{ fontSize: '0.7rem', background: colore + '20', color: colore, padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600 }}>{ev.tipo_dettaglio.nome}</span>
                    )}
                    {ev.chiusura_scolastica && (
                      <span style={{ fontSize: '0.7rem', background: '#FFF3EE', color: '#E17055', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600, marginLeft: '0.3rem' }}>Il nido è chiuso</span>
                    )}
                  </div>
                  <span style={{ color: '#DDD', fontSize: '1.1rem' }}>›</span>
                </button>
              )
            })}
          </div>
        ) : (
          /* ── Vista Mese ── */
          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(225,112,85,0.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#FFF3EE' }}>
              {GIORNI_BREVI.map(g => (
                <div key={g} style={{ textAlign: 'center', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#E17055' }}>{g}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#EEE' }}>
              {giorni.map((giorno, idx) => {
                if (!giorno) return <div key={idx} style={{ background: '#FAFAFA', minHeight: 70 }} />
                const iso = localIso(giorno)
                const evG = eventiPerGiorno(eventi, iso)
                const isOggi = iso === oggiIso
                return (
                  <div key={iso} style={{ background: isOggi ? '#FFF3EE' : 'white', minHeight: 70, padding: '0.3rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, borderRadius: '50%', fontSize: '0.72rem', fontWeight: isOggi ? 800 : 600,
                      color: isOggi ? 'white' : (giorno.getDay() === 0 || giorno.getDay() === 6 ? '#CCC' : '#333'),
                      background: isOggi ? '#E17055' : 'transparent',
                    }}>
                      {giorno.getDate()}
                    </span>
                    <div style={{ marginTop: '0.15rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      {evG.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          onClick={() => setDettaglio(ev)}
                          style={{
                            fontSize: '0.6rem', fontWeight: 600, padding: '0.1rem 0.25rem',
                            borderRadius: '4px', color: 'white', cursor: 'pointer',
                            background: ev.tipo_dettaglio?.colore ?? '#E17055',
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                          }}
                        >
                          {ev.titolo}
                        </div>
                      ))}
                      {evG.length > 2 && <span style={{ fontSize: '0.55rem', color: '#AAA' }}>+{evG.length - 2}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal dettaglio evento */}
      {dettaglio && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setDettaglio(null)}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 500 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '1.5rem' }}>{dettaglio.tipo_dettaglio?.icona ?? '📅'}</p>
                <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#333' }}>{dettaglio.titolo}</h2>
              </div>
              <button onClick={() => setDettaglio(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#999' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem' }}>📅</span>
                <span style={{ fontSize: '0.875rem', color: '#555', fontWeight: 600 }}>
                  {formatData(dettaglio.data_inizio)}
                  {dettaglio.data_fine && dettaglio.data_fine !== dettaglio.data_inizio && ` – ${formatData(dettaglio.data_fine)}`}
                </span>
              </div>
              {!dettaglio.tutto_il_giorno && dettaglio.ora_inizio && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>🕐</span>
                  <span style={{ fontSize: '0.875rem', color: '#555', fontWeight: 600 }}>
                    {dettaglio.ora_inizio.slice(0, 5)}{dettaglio.ora_fine ? ` – ${dettaglio.ora_fine.slice(0, 5)}` : ''}
                  </span>
                </div>
              )}
              {dettaglio.tipo_dettaglio && (
                <span style={{ fontSize: '0.8rem', background: (dettaglio.tipo_dettaglio.colore) + '20', color: dettaglio.tipo_dettaglio.colore, padding: '0.2rem 0.75rem', borderRadius: '12px', fontWeight: 600, alignSelf: 'flex-start' }}>
                  {dettaglio.tipo_dettaglio.nome}
                </span>
              )}
              {dettaglio.chiusura_scolastica && (
                <div style={{ background: '#FFF3EE', border: '1.5px solid #FFD4B3', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#E17055', fontSize: '0.875rem' }}>⚠️ Il nido è chiuso in questa data</p>
                </div>
              )}
              {dettaglio.descrizione && (
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#555', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{dettaglio.descrizione}</p>
              )}
            </div>

            <button onClick={() => setDettaglio(null)}
              style={{ width: '100%', padding: '0.75rem', background: '#FFF3EE', color: '#E17055', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
