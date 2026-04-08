/**
 * Mappa nomi campo Django → etichetta italiana leggibile.
 */
const FIELD_LABELS: Record<string, string> = {
  username: 'Nome utente',
  email: 'Email',
  password: 'Password',
  first_name: 'Nome',
  last_name: 'Cognome',
  phone: 'Telefono',
  codice_fiscale: 'Codice fiscale',
  indirizzo: 'Indirizzo',
  nome: 'Nome',
  cognome: 'Cognome',
  data_nascita: 'Data di nascita',
  data_iscrizione: 'Data di iscrizione',
  telefono_emergenza: 'Telefono di emergenza',
  medico_base: 'Medico di base',
  bambino: 'Bambino',
  genitore1: 'Genitore 1',
  genitore2: 'Genitore 2',
  genitore1_email: 'Email Genitore 1',
  genitore2_email: 'Email Genitore 2',
  finalita: 'Finalità',
  role: 'Ruolo',
  is_active: 'Stato account',
  gruppo: 'Gruppo',
  orario_uscita: 'Orario uscita',
}

/**
 * Traduce i messaggi di errore Django più comuni in italiano leggibile.
 */
function translateMsg(msg: string): string {
  const map: Array<[RegExp | string, string]> = [
    [/questo campo non può essere omesso/i, 'campo obbligatorio'],
    [/questo campo non può essere lasciato vuoto/i, 'campo obbligatorio'],
    [/inserisci un indirizzo email valido/i, 'email non valida'],
    [/un utente con questo username esiste già/i, 'nome utente già in uso'],
    [/un utente con questo indirizzo email esiste già/i, 'email già registrata'],
    [/assicurati che questo valore contenga al più (\d+) caratter/i, (m: RegExpMatchArray) => `massimo ${m[1]} caratteri`],
    [/assicurati che questo valore contenga almeno (\d+) caratter/i, (m: RegExpMatchArray) => `minimo ${m[1]} caratteri`],
    [/questo campo deve essere univoco/i, 'valore già presente'],
    [/oggetto non trovato/i, 'elemento non trovato'],
    [/campo obbligatorio/i, 'campo obbligatorio'],
  ]
  for (const [pattern, replacement] of map) {
    if (typeof pattern === 'string') {
      if (msg.toLowerCase().includes(pattern.toLowerCase())) {
        return typeof replacement === 'string' ? replacement : replacement([] as unknown as RegExpMatchArray)
      }
    } else {
      const m = msg.match(pattern)
      if (m) return typeof replacement === 'string' ? replacement : replacement(m)
    }
  }
  // Rimuovi punto finale e porta in minuscolo se già in italiano
  return msg.replace(/\.$/, '')
}

/**
 * Converte un oggetto errore Django REST Framework in una stringa leggibile.
 * Esempio: {"email": ["Inserisci un indirizzo email valido."]} → "Email: email non valida"
 */
export function formatApiErrors(data: unknown): string {
  if (!data || typeof data !== 'object') return String(data ?? 'Errore sconosciuto.')
  if (Array.isArray(data)) return data.map(v => translateMsg(String(v))).join('\n')

  const lines: string[] = []
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const label = key === 'non_field_errors' || key === 'detail'
      ? ''
      : `${FIELD_LABELS[key] ?? key}: `
    const msgs = Array.isArray(val) ? val : [val]
    lines.push(`${label}${msgs.map(m => translateMsg(String(m))).join(', ')}`)
  }
  return lines.join('\n') || 'Errore sconosciuto.'
}
