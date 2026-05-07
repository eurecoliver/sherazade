'use client'

import { useEffect, useState } from 'react'

interface PresenzaInsegnante {
  id: number
  ora_entrata: string | null
  ora_uscita: string | null
}

interface InsegnanteRiga {
  insegnante_id: number
  nome: string
  cognome: string
  email: string
  stato: 'nessuno' | 'entrata_registrata' | 'uscita_registrata'
  presenza: PresenzaInsegnante | null
}

interface InsegnantiGiornataResp {
  data: string
  insegnanti: InsegnanteRiga[]
}

export default function RegistroInsegnantiPanel({ data }: { data: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [righe, setRighe] = useState<InsegnanteRiga[]>([])

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/presenze/insegnanti-giornata?data=${encodeURIComponent(data)}`)
      .then(async res => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.detail || 'Errore')
        return json as InsegnantiGiornataResp
      })
      .then(json => setRighe(json.insegnanti ?? []))
      .catch(() => setError('Impossibile caricare il registro insegnanti.'))
      .finally(() => setLoading(false))
  }, [data])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>Caricamento registro insegnanti...</div>
  }

  if (error) {
    return <div style={{ background: '#FADBD8', color: '#C0392B', padding: '0.75rem 1rem', borderRadius: '10px' }}>{error}</div>
  }

  if (!righe.length) {
    return (
      <div style={{ background: 'white', borderRadius: '14px', padding: '1.5rem', color: '#718096', textAlign: 'center' }}>
        Nessuna presenza insegnante registrata per questa data.
      </div>
    )
  }

  const presenti = righe.filter(r => r.stato !== 'nessuno').length

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
        <div style={{ background: '#F0FFF4', border: '2px solid #68D39155', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2F855A' }}>{presenti}</div>
          <div style={{ fontSize: '0.78rem', color: '#2F855A', fontWeight: 700 }}>Con timbratura</div>
        </div>
        <div style={{ background: '#F7FAFC', border: '2px solid #CBD5E055', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4A5568' }}>{righe.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#4A5568', fontWeight: 700 }}>Totale insegnanti</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {righe.map(r => {
          const entrata = r.presenza?.ora_entrata?.slice(0, 5)
          const uscita = r.presenza?.ora_uscita?.slice(0, 5)
          return (
            <div key={r.insegnante_id} style={{ background: 'white', border: '2px solid #E2E8F0', borderRadius: '12px', padding: '0.75rem 0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#2D3748', fontSize: '0.95rem' }}>{r.cognome} {r.nome}</div>
                  <div style={{ fontSize: '0.76rem', color: '#718096' }}>{r.email}</div>
                </div>
                {r.stato === 'nessuno' && <span style={{ fontSize: '0.75rem', color: '#A0AEC0' }}>Non registrato</span>}
                {r.stato === 'entrata_registrata' && <span style={{ fontSize: '0.75rem', color: '#2F855A', fontWeight: 700 }}>Entrata {entrata}</span>}
                {r.stato === 'uscita_registrata' && <span style={{ fontSize: '0.75rem', color: '#2B6CB0', fontWeight: 700 }}>Entrata {entrata} · Uscita {uscita}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
