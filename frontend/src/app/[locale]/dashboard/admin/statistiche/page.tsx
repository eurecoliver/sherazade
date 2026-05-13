'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import UserChip from '@/components/UserChip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendMese {
  mese: number
  giorni_scolastici: number
  registrazioni: number
  presenti: number
  assenti: number
  perc_presenza: number
  avg_ritardo_arrivo: number
  avg_ritardo_uscita: number
}

interface GruppoRiepilogo {
  gruppo_id: number
  gruppo_nome: string
  gruppo_colore: string
  presenti: number
  assenti: number
  perc_presenza: number
}

interface TopAssente {
  bambino_id: number
  nome: string
  cognome: string
  gruppo: string
  giorni_assenti: number
}

interface StatData {
  anno: number
  trend_mensile: TrendMese[]
  riepilogo_gruppi: GruppoRiepilogo[]
  top_assenti: TopAssente[]
}

interface Gruppo {
  id: number
  nome: string
  colore: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MESI_BREVI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

// ─── BarChart ─────────────────────────────────────────────────────────────────

function BarChart({ data, maxVal, colorFn, labelFn, valueFn, height = 120 }: {
  data: TrendMese[]
  maxVal: number
  colorFn: (d: TrendMese) => string
  labelFn: (d: TrendMese) => string
  valueFn: (d: TrendMese) => number
  height?: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: height + 24, paddingBottom: '24px', position: 'relative' }}>
      {data.map((d, i) => {
        const val = valueFn(d)
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700 }}>{val > 0 ? val : ''}</div>
            <div
              title={`${MESI_BREVI[d.mese - 1]}: ${labelFn(d)}`}
              style={{ width: '100%', height: `${Math.max(pct, 2)}%`, minHeight: val > 0 ? 4 : 0, background: colorFn(d), borderRadius: '4px 4px 0 0', transition: 'height 0.3s', cursor: 'default', maxHeight: height }}
            />
            <div style={{ fontSize: '0.6rem', color: '#888', position: 'absolute', bottom: 0 }}>{MESI_BREVI[d.mese - 1]}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── PercBar ──────────────────────────────────────────────────────────────────

function PercBar({ value, color = '#27AE60', label }: { value: number; color?: string; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {label && <span style={{ minWidth: '5rem', fontSize: '0.8rem', color: '#555', fontWeight: 600 }}>{label}</span>}
      <div style={{ flex: 1, background: '#F0F4F8', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, background: color, height: '100%', borderRadius: '6px', transition: 'width 0.4s' }} />
      </div>
      <span style={{ minWidth: '2.5rem', fontSize: '0.8rem', fontWeight: 800, color }}>{value}%</span>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#2D3436' }}>{title}</h2>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatistichePage() {
  const router = useRouter()
  const locale = useLocale()
  const [data, setData] = useState<StatData | null>(null)
  const [loading, setLoading] = useState(true)
  const [anno, setAnno] = useState(new Date().getFullYear())
  const [gruppoFiltro, setGruppoFiltro] = useState('')
  const [gruppi, setGruppi] = useState<Gruppo[]>([])

  const carica = useCallback(async (a: number, g: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ anno: String(a) })
      if (g) params.set('gruppo', g)
      const res = await fetch(`/api/presenze/statistiche?${params}`)
      if (res.status === 401) { router.push(`/${locale}/login`); return }
      if (res.ok) setData(await res.json())
    } catch { /* silenzioso */ }
    finally { setLoading(false) }
  }, [locale, router])

  useEffect(() => {
    fetch('/api/config/gruppi')
      .then(r => r.ok ? r.json() : [])
      .then(d => setGruppi(Array.isArray(d) ? d : d.results ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => { carica(anno, gruppoFiltro) }, [anno, gruppoFiltro, carica])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  // Valori massimi per i grafici
  const maxPresenti = data ? Math.max(...data.trend_mensile.map(m => m.presenti), 1) : 1
  const maxAssenti  = data ? Math.max(...data.trend_mensile.map(m => m.assenti),  1) : 1
  const maxRitardo  = data ? Math.max(...data.trend_mensile.map(m => Math.max(m.avg_ritardo_arrivo, m.avg_ritardo_uscita)), 1) : 1

  // Mesi con dati (evita mostrare mesi futuri vuoti)
  const oggi = new Date()
  const mesiFiltrati = data?.trend_mensile.filter(m =>
    m.registrazioni > 0 || (anno < oggi.getFullYear()) || m.mese <= oggi.getMonth() + 1
  ) ?? []

  // Riepiloghi rapidi
  const totPresenti = data?.trend_mensile.reduce((s, m) => s + m.presenti, 0) ?? 0
  const totAssenti  = data?.trend_mensile.reduce((s, m) => s + m.assenti,  0) ?? 0
  const percGlobale = totPresenti + totAssenti > 0
    ? Math.round(totPresenti / (totPresenti + totAssenti) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2D3436 0%, #636E72 100%)', padding: '1.25rem 1.5rem 1.75rem', color: 'white' }}>
        <div style={{ maxWidth: 'min(1200px, 96vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <button
              onClick={() => router.push(`/${locale}/dashboard/admin`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '0.35rem 0.875rem 0.35rem 0.625rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit' }}
            >
              ← Dashboard
            </button>
            <UserChip onLogout={handleLogout} />
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 800 }}>📊 Statistiche Presenze</h1>

          {/* Filtri */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={anno}
              onChange={e => setAnno(Number(e.target.value))}
              style={{ padding: '0.35rem 0.75rem', borderRadius: '10px', border: 'none', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer' }}
            >
              {[oggi.getFullYear() - 2, oggi.getFullYear() - 1, oggi.getFullYear()].map(y => (
                <option key={y} value={y} style={{ color: '#222' }}>{y}</option>
              ))}
            </select>
            <select
              value={gruppoFiltro}
              onChange={e => setGruppoFiltro(e.target.value)}
              style={{ padding: '0.35rem 0.75rem', borderRadius: '10px', border: 'none', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer' }}
            >
              <option value="" style={{ color: '#222' }}>Tutti i gruppi</option>
              {gruppi.map(g => (
                <option key={g.id} value={String(g.id)} style={{ color: '#222' }}>{g.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#636E72', fontWeight: 600 }}>Caricamento statistiche...</div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#aaa' }}>Nessun dato disponibile.</div>
      ) : (
        <div style={{ maxWidth: 'min(1200px, 96vw)', margin: '0 auto', padding: '1.5rem 1rem 3rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* KPI box */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Presenze totali', value: totPresenti, color: '#27AE60', bg: '#D5F5E3' },
              { label: 'Assenze totali',  value: totAssenti,  color: '#E74C3C', bg: '#FADBD8' },
              { label: '% presenze anno', value: `${percGlobale}%`, color: '#0984E3', bg: '#EAF4FF' },
              { label: 'Mesi con dati',   value: mesiFiltrati.filter(m => m.registrazioni > 0).length, color: '#6C5CE7', bg: '#F3F0FF' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color }}>{value}</p>
                <p style={{ margin: 0, fontSize: '0.73rem', color, fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Trend presenze mensile */}
          <Card title={`📈 Presenze mensili — ${anno}`}>
            <BarChart
              data={mesiFiltrati}
              maxVal={maxPresenti}
              colorFn={() => '#27AE60'}
              labelFn={d => `${d.presenti} presenze`}
              valueFn={d => d.presenti}
              height={130}
            />
          </Card>

          {/* Trend assenze mensile */}
          <Card title={`📉 Assenze mensili — ${anno}`}>
            <BarChart
              data={mesiFiltrati}
              maxVal={maxAssenti}
              colorFn={() => '#E74C3C'}
              labelFn={d => `${d.assenti} assenze`}
              valueFn={d => d.assenti}
              height={100}
            />
          </Card>

          {/* Percentuale presenza per mese */}
          <Card title={`📊 % Presenza per mese — ${anno}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {mesiFiltrati.filter(m => m.registrazioni > 0).map(m => (
                <PercBar
                  key={m.mese}
                  label={MESI_BREVI[m.mese - 1]}
                  value={m.perc_presenza}
                  color={m.perc_presenza >= 80 ? '#27AE60' : m.perc_presenza >= 60 ? '#F39C12' : '#E74C3C'}
                />
              ))}
              {mesiFiltrati.filter(m => m.registrazioni > 0).length === 0 && (
                <p style={{ color: '#aaa', textAlign: 'center', margin: 0 }}>Nessun dato registrato.</p>
              )}
            </div>
          </Card>

          {/* Ritardi medi */}
          {mesiFiltrati.some(m => m.avg_ritardo_arrivo > 0 || m.avg_ritardo_uscita > 0) && (
            <Card title={`⏱ Ritardo medio (minuti) per mese — ${anno}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <p style={{ margin: '0 0 0.375rem', fontSize: '0.8rem', fontWeight: 700, color: '#E67E22' }}>Ritardo arrivo (media min)</p>
                  <BarChart
                    data={mesiFiltrati}
                    maxVal={maxRitardo}
                    colorFn={() => '#FAB032'}
                    labelFn={d => `${d.avg_ritardo_arrivo} min medio`}
                    valueFn={d => d.avg_ritardo_arrivo}
                    height={80}
                  />
                </div>
                <div>
                  <p style={{ margin: '0 0 0.375rem', fontSize: '0.8rem', fontWeight: 700, color: '#E74C3C' }}>Ritardo uscita (media min)</p>
                  <BarChart
                    data={mesiFiltrati}
                    maxVal={maxRitardo}
                    colorFn={() => '#E74C3C'}
                    labelFn={d => `${d.avg_ritardo_uscita} min medio`}
                    valueFn={d => d.avg_ritardo_uscita}
                    height={80}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Riepilogo per gruppo */}
          {data.riepilogo_gruppi.length > 0 && (
            <Card title={`🎨 Confronto gruppi — ${anno}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.riepilogo_gruppi.filter(g => g.presenti + g.assenti > 0).map(g => (
                  <div key={g.gruppo_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: g.gruppo_colore || '#555' }}>
                        {g.gruppo_nome}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#888' }}>
                        {g.presenti} presenze · {g.assenti} assenze
                      </span>
                    </div>
                    <PercBar
                      value={g.perc_presenza}
                      color={g.gruppo_colore || '#27AE60'}
                    />
                  </div>
                ))}
                {data.riepilogo_gruppi.every(g => g.presenti + g.assenti === 0) && (
                  <p style={{ color: '#aaa', textAlign: 'center', margin: 0 }}>Nessun dato per l&apos;anno selezionato.</p>
                )}
              </div>
            </Card>
          )}

          {/* Top assenti */}
          {data.top_assenti.length > 0 && (
            <Card title={`⚠️ Bambini con più assenze — ${anno}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {data.top_assenti.map((b, i) => (
                  <div key={b.bambino_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: i % 2 === 0 ? '#F8F9FA' : 'white', borderRadius: '10px' }}>
                    <span style={{ width: '1.5rem', textAlign: 'center', fontWeight: 900, fontSize: '0.85rem', color: i < 3 ? '#E74C3C' : '#888' }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, fontWeight: 700, color: '#222', fontSize: '0.875rem' }}>
                      {b.cognome} {b.nome}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#888', marginRight: '0.5rem' }}>{b.gruppo}</span>
                    <span style={{ background: i < 3 ? '#FADBD8' : '#F0F4F8', color: i < 3 ? '#E74C3C' : '#636E72', borderRadius: '10px', padding: '0.2rem 0.625rem', fontWeight: 800, fontSize: '0.8rem' }}>
                      {b.giorni_assenti} gg
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
