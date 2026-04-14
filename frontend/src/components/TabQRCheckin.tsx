'use client'

import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function TabQRCheckin({ isAdmin }: { isAdmin: boolean }) {
  const locale = typeof window !== 'undefined'
    ? (window.location.pathname.split('/')[1] || 'it')
    : 'it'

  const [qrAbilitato, setQrAbilitato] = useState<boolean | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loadingToken, setLoadingToken] = useState(false)
  const [toggling, setToggling] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkinUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/checkin?token=${token}`
    : null

  useEffect(() => {
    fetch('/api/presenze/qrconfig')
      .then(r => r.json())
      .then(d => setQrAbilitato(d.qr_abilitato ?? false))
      .catch(() => setQrAbilitato(false))
  }, [])

  useEffect(() => {
    if (!qrAbilitato) { setToken(null); return }
    caricaToken()
    // Auto-rinnovo ogni 8 ore (per telefono fisso all'ingresso)
    intervalRef.current = setInterval(() => caricaToken(), 8 * 60 * 60 * 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrAbilitato])

  async function caricaToken(forceNew = false) {
    setLoadingToken(true)
    try {
      const res = await fetch('/api/presenze/qrtoken', {
        method: forceNew ? 'POST' : 'GET',
      })
      const data = await res.json()
      if (res.ok) setToken(data.token)
    } finally {
      setLoadingToken(false)
    }
  }

  async function toggleAbilitato(nuovoValore: boolean) {
    setToggling(true)
    try {
      const res = await fetch('/api/presenze/qrconfig', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_abilitato: nuovoValore }),
      })
      if (res.ok) setQrAbilitato(nuovoValore)
    } finally {
      setToggling(false)
    }
  }

  if (qrAbilitato === null) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>Caricamento...</div>
  }

  return (
    <div>
      {/* Toggle admin/direttrice */}
      {isAdmin && (
        <div style={{
          background: 'white', borderRadius: '14px', padding: '1rem 1.25rem',
          marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
        }}>
          <div>
            <div style={{ fontWeight: 700, color: '#2D3748', fontSize: '0.95rem' }}>QR Check-in</div>
            <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.2rem' }}>
              {qrAbilitato
                ? 'Attivo — i genitori possono usare il QR'
                : 'Disabilitato — il QR non è visibile ai genitori'}
            </div>
          </div>
          <button
            onClick={() => toggleAbilitato(!qrAbilitato)}
            disabled={toggling}
            style={{
              padding: '0.5rem 1.25rem',
              background: qrAbilitato ? '#FED7D7' : '#C6F6D5',
              color: qrAbilitato ? '#C53030' : '#276749',
              border: 'none', borderRadius: '20px', fontWeight: 700,
              cursor: toggling ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.85rem',
              opacity: toggling ? 0.6 : 1,
            }}
          >
            {toggling ? '...' : qrAbilitato ? 'Disabilita' : 'Abilita'}
          </button>
        </div>
      )}

      {!qrAbilitato && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', color: '#718096' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚫</div>
          <p style={{ margin: 0, fontWeight: 600 }}>QR Check-in disabilitato</p>
          {isAdmin && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
              Usa il toggle qui sopra per riattivarlo.
            </p>
          )}
        </div>
      )}

      {qrAbilitato && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#2D3748', marginBottom: '0.25rem' }}>
              📱 QR Code per i genitori
            </div>
            <div style={{ fontSize: '0.8rem', color: '#718096' }}>
              Stampa questo QR e affiggi all&apos;ingresso
            </div>
          </div>

          {loadingToken && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#718096' }}>Generazione QR...</div>
          )}

          {!loadingToken && checkinUrl && (
            <div id="qr-print-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'white', borderRadius: '12px', border: '3px solid #0984E3' }}>
                <QRCodeSVG value={checkinUrl} size={220} />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#718096', textAlign: 'center' }}>
                Valido oggi · {new Date().toLocaleDateString('it-IT')}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    padding: '0.625rem 1.5rem', background: '#0984E3', color: 'white',
                    border: 'none', borderRadius: '10px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem',
                  }}
                >
                  🖨️ Stampa QR
                </button>
                <button
                  onClick={() => caricaToken(true)}
                  style={{
                    padding: '0.625rem 1.25rem', background: '#EDF2F7', color: '#4A5568',
                    border: 'none', borderRadius: '10px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem',
                  }}
                >
                  🔄 Rinnova token
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSS print: mostra solo il QR */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #qr-print-area { display: flex !important; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  )
}
