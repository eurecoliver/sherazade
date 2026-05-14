'use client'
import { useEffect, useState } from 'react'

interface Config {
  aperto: boolean
  anno_scolastico: string
  messaggio_benvenuto: string
  messaggio_chiuso: string
}

interface FormData {
  bambino_nome: string
  bambino_cognome: string
  bambino_data_nascita: string
  bambino_codice_fiscale: string
  bambino_note_mediche: string
  g1_nome: string
  g1_cognome: string
  g1_email: string
  g1_telefono: string
  g1_codice_fiscale: string
  g1_indirizzo: string
  g2_nome: string
  g2_cognome: string
  g2_email: string
  g2_telefono: string
  note_genitore: string
}

const EMPTY: FormData = {
  bambino_nome: '', bambino_cognome: '', bambino_data_nascita: '',
  bambino_codice_fiscale: '', bambino_note_mediche: '',
  g1_nome: '', g1_cognome: '', g1_email: '', g1_telefono: '',
  g1_codice_fiscale: '', g1_indirizzo: '',
  g2_nome: '', g2_cognome: '', g2_email: '', g2_telefono: '',
  note_genitore: '',
}

const INPUT = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e0d7f0', fontSize: 15, boxSizing: 'border-box' as const, marginBottom: 4 }
const LABEL = { display: 'block', fontWeight: 600, fontSize: 13, color: '#5a3e8a', marginBottom: 4 }
const FIELD = { marginBottom: 14 }
const H2 = { margin: '0 0 18px', color: '#5a3e8a', fontSize: 19, fontWeight: 700 }
const STEP_INFO = { fontSize: 13, color: '#888', marginBottom: 18, lineHeight: 1.5 }

export default function IscrizioniPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/iscrizioni/config').then(r => r.json()).then(setConfig)
  }, [])

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }))

  const validateStep = () => {
    if (step === 1) {
      if (!form.bambino_nome.trim() || !form.bambino_cognome.trim() || !form.bambino_data_nascita) {
        setError('Compila nome, cognome e data di nascita del bambino.')
        return false
      }
    }
    if (step === 2) {
      if (!form.g1_nome.trim() || !form.g1_cognome.trim() || !form.g1_email.trim() || !form.g1_telefono.trim()) {
        setError('Compila tutti i campi obbligatori del genitore 1.')
        return false
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.g1_email)) {
        setError('Email genitore 1 non valida.')
        return false
      }
    }
    if (step === 3) {
      const hasG2 = form.g2_nome || form.g2_email
      if (hasG2 && (!form.g2_nome.trim() || !form.g2_email.trim())) {
        setError('Per il genitore 2 indicare nome, cognome ed email.')
        return false
      }
      if (form.g2_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.g2_email)) {
        setError('Email genitore 2 non valida.')
        return false
      }
    }
    setError('')
    return true
  }

  const next = () => { if (validateStep()) setStep(s => s + 1) }
  const back = () => { setError(''); setStep(s => s - 1) }

  const submit = async () => {
    if (!validateStep()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/iscrizioni/richieste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = typeof data === 'object' ? Object.values(data).flat().join(' ') : data.detail || 'Errore'
        setError(String(msg))
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Errore di rete. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  if (!config) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf8ff' }}>
      <p style={{ color: '#888' }}>Caricamento…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8f0ff 0%, #fff4e6 100%)', fontFamily: 'system-ui, sans-serif', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🌟</div>
        <h1 style={{ margin: 0, fontSize: 'clamp(22px,5vw,30px)', fontWeight: 800, color: '#5a3e8a' }}>
          Iscrizioni {config.anno_scolastico}
        </h1>
        <p style={{ color: '#888', margin: '8px 0 0', fontSize: 15 }}>Nido Sherazade</p>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Iscrizioni chiuse */}
        {!config.aperto && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ color: '#5a3e8a', margin: '0 0 12px' }}>Iscrizioni chiuse</h2>
            <p style={{ color: '#666', lineHeight: 1.6, margin: 0 }}>{config.messaggio_chiuso}</p>
          </div>
        )}

        {/* Successo */}
        {config.aperto && success && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: '#00b894', margin: '0 0 12px' }}>Richiesta inviata!</h2>
            <p style={{ color: '#555', lineHeight: 1.6, margin: 0 }}>
              Grazie! Abbiamo ricevuto la richiesta di iscrizione per <strong>{form.bambino_nome} {form.bambino_cognome}</strong>.<br /><br />
              Riceverai una conferma all&apos;indirizzo <strong>{form.g1_email}</strong> e ti ricontatteremo al più presto.
            </p>
          </div>
        )}

        {/* Form */}
        {config.aperto && !success && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            {/* Stepper */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4].map(s => (
                <div key={s} style={{
                  flex: 1, height: 6, borderRadius: 4,
                  background: s <= step ? '#7c5cbf' : '#e8e0f5',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>

            {/* Step 1 — Bambino */}
            {step === 1 && <>
              <h2 style={H2}>👶 Dati del bambino</h2>
              <p style={STEP_INFO}>{config.messaggio_benvenuto}</p>
              <div style={FIELD}><label style={LABEL}>Nome *</label><input style={INPUT} value={form.bambino_nome} onChange={e => set('bambino_nome', e.target.value)} /></div>
              <div style={FIELD}><label style={LABEL}>Cognome *</label><input style={INPUT} value={form.bambino_cognome} onChange={e => set('bambino_cognome', e.target.value)} /></div>
              <div style={FIELD}><label style={LABEL}>Data di nascita *</label><input type="date" style={INPUT} value={form.bambino_data_nascita} onChange={e => set('bambino_data_nascita', e.target.value)} /></div>
              <div style={FIELD}><label style={LABEL}>Codice fiscale</label><input style={INPUT} value={form.bambino_codice_fiscale} onChange={e => set('bambino_codice_fiscale', e.target.value.toUpperCase())} maxLength={16} /></div>
              <div style={FIELD}><label style={LABEL}>Note mediche / allergie</label><textarea style={{ ...INPUT, minHeight: 70, resize: 'vertical' }} value={form.bambino_note_mediche} onChange={e => set('bambino_note_mediche', e.target.value)} /></div>
            </>}

            {/* Step 2 — Genitore 1 */}
            {step === 2 && <>
              <h2 style={H2}>👤 Genitore 1</h2>
              <p style={STEP_INFO}>Dati del genitore o tutore principale, che riceverà la conferma via email.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <div style={FIELD}><label style={LABEL}>Nome *</label><input style={INPUT} value={form.g1_nome} onChange={e => set('g1_nome', e.target.value)} /></div>
                <div style={FIELD}><label style={LABEL}>Cognome *</label><input style={INPUT} value={form.g1_cognome} onChange={e => set('g1_cognome', e.target.value)} /></div>
              </div>
              <div style={FIELD}><label style={LABEL}>Email *</label><input type="email" style={INPUT} value={form.g1_email} onChange={e => set('g1_email', e.target.value)} /></div>
              <div style={FIELD}><label style={LABEL}>Telefono *</label><input type="tel" style={INPUT} value={form.g1_telefono} onChange={e => set('g1_telefono', e.target.value)} /></div>
              <div style={FIELD}><label style={LABEL}>Codice fiscale</label><input style={INPUT} value={form.g1_codice_fiscale} onChange={e => set('g1_codice_fiscale', e.target.value.toUpperCase())} maxLength={16} /></div>
              <div style={FIELD}><label style={LABEL}>Indirizzo di residenza</label><textarea style={{ ...INPUT, minHeight: 60, resize: 'vertical' }} value={form.g1_indirizzo} onChange={e => set('g1_indirizzo', e.target.value)} /></div>
            </>}

            {/* Step 3 — Genitore 2 + Note */}
            {step === 3 && <>
              <h2 style={H2}>👥 Genitore 2 &amp; Note</h2>
              <p style={STEP_INFO}>Il secondo genitore è opzionale. Compila solo se applicabile.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <div style={FIELD}><label style={LABEL}>Nome</label><input style={INPUT} value={form.g2_nome} onChange={e => set('g2_nome', e.target.value)} /></div>
                <div style={FIELD}><label style={LABEL}>Cognome</label><input style={INPUT} value={form.g2_cognome} onChange={e => set('g2_cognome', e.target.value)} /></div>
              </div>
              <div style={FIELD}><label style={LABEL}>Email</label><input type="email" style={INPUT} value={form.g2_email} onChange={e => set('g2_email', e.target.value)} /></div>
              <div style={FIELD}><label style={LABEL}>Telefono</label><input type="tel" style={INPUT} value={form.g2_telefono} onChange={e => set('g2_telefono', e.target.value)} /></div>
              <div style={{ borderTop: '1px solid #f0eafa', margin: '12px 0 16px' }} />
              <div style={FIELD}><label style={LABEL}>Note per la segreteria</label><textarea style={{ ...INPUT, minHeight: 80, resize: 'vertical' }} value={form.note_genitore} onChange={e => set('note_genitore', e.target.value)} placeholder="Eventuali domande o informazioni aggiuntive..." /></div>
            </>}

            {/* Step 4 — Riepilogo */}
            {step === 4 && <>
              <h2 style={H2}>📋 Riepilogo</h2>
              <p style={STEP_INFO}>Verifica i dati prima di inviare la richiesta.</p>
              {[
                { label: 'Bambino', value: `${form.bambino_nome} ${form.bambino_cognome} — nato/a il ${form.bambino_data_nascita}` },
                { label: 'Genitore 1', value: `${form.g1_nome} ${form.g1_cognome} — ${form.g1_email} — ${form.g1_telefono}` },
                form.g2_email ? { label: 'Genitore 2', value: `${form.g2_nome} ${form.g2_cognome} — ${form.g2_email}` } : null,
                form.bambino_note_mediche ? { label: 'Note mediche', value: form.bambino_note_mediche } : null,
                form.note_genitore ? { label: 'Note segreteria', value: form.note_genitore } : null,
              ].filter(Boolean).map((row, i) => (
                <div key={i} style={{ marginBottom: 10, padding: '10px 14px', background: '#f8f4ff', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7c5cbf', marginBottom: 2 }}>{row!.label}</div>
                  <div style={{ fontSize: 14, color: '#333' }}>{row!.value}</div>
                </div>
              ))}
            </>}

            {/* Errore */}
            {error && <div style={{ color: '#d63031', background: '#fff5f5', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginTop: 8, marginBottom: 4 }}>{error}</div>}

            {/* Bottoni */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {step > 1 && <button onClick={back} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #c9b8e8', background: '#fff', color: '#7c5cbf', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>← Indietro</button>}
              {step < 4 && <button onClick={next} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(90deg,#7c5cbf,#a78bca)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>Avanti →</button>}
              {step === 4 && <button onClick={submit} disabled={loading} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: loading ? '#b39ddb' : 'linear-gradient(90deg,#7c5cbf,#a78bca)', color: '#fff', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontSize: 15 }}>{loading ? 'Invio…' : '✉️ Invia richiesta'}</button>}
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 20 }}>
          Nido Sherazade — Roma
        </p>
      </div>
    </div>
  )
}
