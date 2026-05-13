# Manuale Utente — Portale Sherazade

> Guida operativa per l'utilizzo del portale dell'asilo nido/scuola primaria.
> Aggiornato al: 13 maggio 2026

---

## Indice

1. [Accesso e autenticazione](#1-accesso-e-autenticazione)
2. [Guida per ruolo](#2-guida-per-ruolo)
   - [Admin / Direttrice](#21-admin--direttrice)
   - [Coordinatrice / Insegnante](#22-coordinatrice--insegnante)
   - [Cuoca](#23-cuoca)
   - [Genitore](#24-genitore)
3. [Funzionalità dettagliate](#3-funzionalità-dettagliate)
   - [Anagrafica bambini](#31-anagrafica-bambini)
   - [Anagrafica genitori](#32-anagrafica-genitori)
   - [Consensi fotografici](#33-consensi-fotografici)
   - [Registro presenze](#34-registro-presenze)
   - [Diario del bambino](#35-diario-del-bambino)
   - [Foglio pappe](#36-foglio-pappe)
   - [Portfolio digitale](#37-portfolio-digitale)
   - [Agenda giornaliera](#38-agenda-giornaliera)
   - [Calendario scolastico](#39-calendario-scolastico)
   - [Circolari](#310-circolari)
   - [Fatture](#311-fatture)
   - [Gestione utenti](#312-gestione-utenti)
   - [Impostazioni (Gruppi, Orari, Ruoli)](#313-impostazioni)
   - [Sicurezza account (2FA, password)](#314-sicurezza-account)
4. [Presenze insegnanti e staff](#4-presenze-insegnanti-e-staff)

---

## 1. Accesso e autenticazione

### Come accedere

1. Aprire il portale nel browser (o installarlo come app sul telefono)
2. Inserire **email** e **password**
3. Se è abilitata la 2FA, inserire il codice dall'app di autenticazione
4. Il sistema reindirizza automaticamente alla dashboard del proprio ruolo

### Dashboard per ruolo

| Ruolo | Dashboard di atterraggio |
|-------|--------------------------|
| Admin | `/dashboard/admin` |
| Direttrice | `/dashboard/admin` |
| Coordinatrice | `/dashboard/staff` |
| Insegnante | `/dashboard/staff` |
| Cuoca | `/dashboard/cuoca` |
| Genitore | `/dashboard/genitore` |

### Logout

Il pulsante di logout (pill in alto a destra) è visibile su tutte le pagine.

---

## 2. Guida per ruolo

### 2.1 Admin / Direttrice

La dashboard admin ha sfondo viola con tutte le sezioni principali accessibili da card cliccabili.

**Accesso rapido dalla dashboard:**

| Voce | Funzione |
|------|----------|
| 👶 Bambini | Anagrafica bambini e famiglie |
| 👨‍👩‍👧 Genitori | Lista genitori registrati |
| 📋 Presenze | Registro presenze giornaliero |
| 📓 Diario | Diari giornalieri per bambino |
| 🍽️ Pappe | Foglio pappe e menu |
| 📸 Portfolio | Portfolio digitale per gruppo/anno |
| 🗓️ Calendario | Calendario scolastico ed eventi |
| 📝 Agenda | Note di turno condivise |
| 📢 Circolari | Messaggi broadcast alle famiglie |
| 💰 Fatture | Riepilogo fatturazione |
| ✅ Consensi | Gestione consensi fotografici GDPR |
| 👥 Utenti | Gestione account staff e genitori |
| ⚙️ Impostazioni | Gruppi, orari uscita, ruoli |

**Differenza Admin vs Direttrice:**
- L'admin può eliminare ruoli di sistema e gestire account con `role='admin'`
- La direttrice ha accesso equivalente a tutte le funzionalità operative ma non può modificare altri admin

---

### 2.2 Coordinatrice / Insegnante

La dashboard staff ha sfondo blu.

**Operazioni quotidiane tipiche (mattina):**
1. Aprire **Presenze** → registrare chi è arrivato e l'orario — oppure aprire il tab **QR Check-in** e orientare lo schermo verso l'ingresso per il self check-in dei genitori
2. Aprire **Agenda** → leggere le note di turno del giorno
3. Aprire **Pappe** → verificare menu del giorno e allergie dei bambini

**Operazioni quotidiane tipiche (durante il giorno):**
4. Aprire **Diario** → compilare scheda del bambino (sonno, popò, umore, note, foto)
5. Aprire **Pappe** → registrare quanto ha mangiato ogni bambino

**Differenza Coordinatrice vs Insegnante:**
- La coordinatrice ha accesso in lettura alle configurazioni
- Entrambe hanno CRUD su diario, presenze e pappe per i propri gruppi

---

### 2.3 Cuoca

La dashboard cuoca ha sfondo verde.

**Schermata principale:**
- Contatore prominente **bambini presenti oggi** (aggiornato in tempo reale)
- Pulsante diretto **Pappe del giorno**

**Flusso operativo:**
1. Alla mattina: aprire **Pappe** → vedere menu del giorno + lista allergie con alert rosso per allergie gravi/anafilassi
2. Usare il contatore presenti per calibrare le porzioni
3. La cuoca non ha accesso a diario, portfolio o dati anagrafici completi

---

### 2.4 Genitore

La dashboard genitore ha un'interfaccia calda e mobile-first.

**Cosa può fare il genitore:**

| Sezione | Operazioni |
|---------|-----------|
| 📱 QR Check-in | Scansionare il QR all'ingresso per registrare entrata/uscita del figlio |
| 📓 Diario | Vedere foto/video del giorno, umore, attività, sonno, tag |
| 📋 Presenze | Comunicare un'assenza, vedere storico e statistiche mese |
| 🍽️ Pappe | Vedere quanto ha mangiato il figlio + menu del giorno |
| 📸 Portfolio | Scorrere il portfolio fotografico per anno |
| ✅ Consensi | Dare/revocare consensi fotografici |
| 🗓️ Calendario | Vedere eventi e chiusure scolastiche |
| 📢 Circolari | Leggere comunicazioni della scuola |
| 💰 Fatture | Consultare le fatture |

**Comunicare un'assenza:**
1. Aprire **Presenze**
2. Toccare **"Comunica assenza"**
3. Selezionare il motivo (malattia / famiglia / vacanza / altro)
4. Confermare — lo staff vedrà l'assenza pre-comunicata

**Gestire i consensi fotografici:**
1. Aprire **Consensi**
2. Per ogni finalità (uso interno / genitori diretti / pubblico esterno) attivare o disattivare il toggle
3. La modifica richiede conferma da entrambi i genitori per essere completa
4. Per scaricare il modulo PDF: pulsante "📄 Riepilogo PDF"

---

## 3. Funzionalità dettagliate

### 3.1 Anagrafica bambini

**Percorso:** `Admin → Bambini`

**Lista bambini:**
- Filtri disponibili: gruppo/sezione, stato (attivo/inattivo), ricerca per nome
- Ogni card mostra: foto profilo (o avatar colorato), nome, gruppo, orario uscita

**Aggiungere un nuovo bambino:**
1. Pulsante **"+ Nuovo bambino"**
2. Compilare: nome, cognome, data di nascita, codice fiscale, gruppo, orario di uscita
3. Opzionali: foto profilo, alias nome (per la dashboard genitore), note allergie
4. Associare la famiglia (email genitore 1 e 2, già registrati o da creare)
5. Aggiungere eventuali **deleghe di ritiro** direttamente nel modal

**Modificare un bambino:**
1. Cliccare sulla card del bambino
2. Modal dettaglio con tab: Dati personali | Famiglia | Deleghe
3. Sezione Famiglia: tab **Genitore 1** / **Genitore 2** — modifica CF, indirizzo
4. Pulsante Salva in ogni sezione

**Alias nome:**
- Se `alias_attivo = ✓`, nella dashboard genitore apparirà l'alias invece del nome reale
- Utile per bambini adottati o con nome preferito diverso

**Disattivare un bambino:**
- Impostare `stato = inattivo` — il bambino non appare più nelle liste operative ma lo storico è conservato

---

### 3.2 Anagrafica genitori

**Percorso:** `Admin → Genitori`

**Vista disponibile:** card o tabella (toggle in alto a destra)

**Filtri:** ricerca testo, stato attivo/inattivo

**Dettaglio genitore:**
- Informazioni personali: nome, cognome, email, telefono, CF, indirizzo
- Lista figli collegati (con cross-reference dalla famiglia)

**Aggiungere un nuovo genitore:**
1. Pulsante **"+ Nuovo genitore"**
2. Compilare: nome, cognome, email, telefono, CF, indirizzo, password (opzionale — se omessa l'account non può fare login finché non viene impostata)
3. Dopo la creazione: modal **"Collega bambino"** → cerca un bambino esistente o creane uno nuovo

**Modificare un genitore:**
- Pulsante Modifica → form con tutti i campi
- PATCH su nome, cognome, email, telefono, CF, indirizzo, stato attivo

**Disattivare / Riattivare:**
- Toggle **Disattiva** / **Riattiva** — l'account non può più fare login ma i dati sono conservati

---

### 3.3 Consensi fotografici

**Percorso:** `Admin → Consensi`

**Le tre finalità:**

| Finalità | Descrizione |
|----------|-------------|
| Uso interno | Foto nel diario giornaliero, visibili solo allo staff e ai genitori diretti |
| Genitori diretti | Condivisione con altri genitori della stessa sezione |
| Pubblico esterno | Uso in materiali promozionali, social, sito web |

**Semaforo di stato:**
- 🟢 Completo — consenso da entrambi i genitori
- 🟡 Parziale — consenso da un solo genitore
- 🔴 Revocato
- ⚫ Nessun consenso

**Forzare un consenso (admin):**
1. Cliccare sul bambino nella tabella semaforo
2. Modal gestione: toggle per-genitore (Genitore 1 / Genitore 2) per ogni finalità
3. L'admin può impostare il consenso a True anche se il genitore aveva detto No

**Revocare tutti i consensi:**
- Pulsante "Revoca tutti" nel modal → imposta `revocato=True` su tutte le finalità

**⚠️ Bambino non fotografabile:**
- Se attivo, sovrascrive tutti i consensi — nessuna foto/video può essere caricata per quel bambino
- Si imposta nell'anagrafica del bambino

**PDF consensi:**
- Pulsante "📄 Scarica PDF" per ogni bambino → modulo WeasyPrint con spunte sulle finalità

---

### 3.4 Registro presenze

#### Staff / Coordinatrice

**Percorso:** `Staff → Presenze`

**Registrare le presenze del giorno:**
1. Data selezionata automaticamente a oggi (modificabile)
2. Filtro gruppo/sezione opzionale
3. Per ogni bambino: pulsante **Sì** (presente) o **No** (assente)
4. Se presente: inserire l'**ora di arrivo** (time picker)
5. Se assente: selezionare il motivo e spuntare "genitore ha avvisato" se applicabile
6. Pulsante **Salva** fisso in basso — salva tutti in un unico invio

**Badge automatici:**
- 🟠 Ritardo arrivo: arrivato dopo le 09:30
- 🔴 Ritardo uscita: uscito dopo l'orario previsto per il gruppo

**Contatori in tempo reale:** presenti / assenti / da registrare

#### Admin / Direttrice

Stessa schermata staff + tab aggiuntivo **"Riepilogo giornaliero"**:

**Riepilogo giornaliero:**
- Contatori globali: totale presenti, assenti, non ancora registrati
- Alert rosso **"Non arrivati"** — bambini attivi senza registrazione per la data indicata
- Riepilogo per sezione/gruppo

**Report mensile:**
- Tabella per bambino con percentuale di presenza
- Barra visiva della % presenze
- Pulsante **Stampa/PDF**

---

#### 📱 QR Check-in (self check-in genitori)

Il sistema permette ai genitori di registrare autonomamente l'entrata e l'uscita del figlio scansionando un QR code.

**Abilitare/disabilitare (Admin/Direttrice):**
1. Aprire **Presenze** → tab **"📱 QR Check-in"**
2. Toggle **Abilita / Disabilita** in cima — quando disabilitato il tab sparisce dalla vista staff e la pagina di check-in non è accessibile ai genitori

**Per lo staff (mattina):**
1. Aprire **Presenze** → tab **"📱 QR Check-in"**
2. Cliccare **🖨️ Stampa QR** per stampare il foglio da affiggere all'ingresso — oppure orientare lo schermo verso i genitori
3. Pulsante **🔄 Rinnova token** per generare un nuovo QR (es. se il foglio è stato smarrito)
4. Il QR è valido solo per il giorno corrente — ogni mattina ne va stampato uno nuovo

**Per il genitore:**
1. Scansionare il QR code con la fotocamera del telefono
2. Se non loggato, viene reindirizzato al login e poi torna automaticamente sul QR
3. Appaiono le card dei propri figli — il sistema rileva automaticamente:
   - Nessun arrivo registrato → pulsante **"🏫 Registra Entrata"**
   - Entrata già registrata → pulsante **"👋 Registra Uscita"**
   - Entrambi già registrati → messaggio "Già registrato per oggi"
4. Feedback visivo con orario confermato (es. "✓ Entrata registrata alle 08:45")

**Nota:** lo staff può sempre correggere o integrare manualmente gli orari dalla schermata principale del registro presenze.

---

### 3.5 Diario del bambino

#### Staff / Insegnante

**Percorso:** `Staff → Diario`

**Vista giornaliera:**
- Filtri: data (default oggi) e gruppo
- Tabella compatta: una riga per bambino
- Colonne: nome | sonno | popò | tag | umore | note | media

**Compilare la scheda di un bambino (tutto inline, senza aprire modal):**

| Campo | Come si inserisce |
|-------|------------------|
| Sonno | Time picker "dalle … alle …" |
| Popò | Checkbox |
| Tag "cosa portare" | Chip colorati selezionabili; campo "nuovo tag" inline per crearne uno al volo |
| Umore | Emoji selector |
| Note | Campo testo libero |
| Foto/Video | Upload diretto nella colonna media (drag & drop o browse) |

**Creare un nuovo tag:**
- Digitare il nome nel campo inline → selezionare un colore hex → Invio/pulsante aggiungi
- Il tag diventa disponibile per tutti i bambini

**⚠️ Upload media:** non è possibile caricare foto/video se il bambino non ha il consenso `uso_interno` attivo e `non_fotografabile = False`.

#### Genitore

**Percorso:** `Genitore → Diario`

- Feed cronologico dei diari del figlio (o selettore figlio se più figli)
- Ogni card mostra: data, emoji umore, attività, note, griglia foto/video, badge sonno, badge popò, badge tag colorati
- Tap su una foto → lightbox con navigazione prev/next e download
- Solo media con `visibile_a_genitori = True` vengono mostrati

---

### 3.6 Foglio pappe

#### Cuoca

**Percorso:** `Cuoca → Pappe`

**Vista mattutina:**
- Alert rosso in cima per bambini con allergie gravi/anafilassi
- Lista allergie moderate con badge colorati per gravità
- Form menu del giorno (6 portate: colazione, primo, secondo, monopiatto, contorno, pane, frutta, merenda)

**Inserire il menu del giorno:**
1. Compilare le portate nel form
2. Selezionare il gruppo/sezione di riferimento
3. Salva

#### Staff / Insegnante

**Percorso:** `Staff → Pappe`

**Menu del giorno automatico:**
- In cima alla pagina compare il banner **"📋 Menu del giorno"** con i piatti del ciclo per il gruppo selezionato
- Se il ciclo non è configurato compare un avviso — contattare l'admin
- I piatti sostituiti mostrano 🔄 accanto al nome

**Tabella foglio pappe:**
- Colonne: bambino | allergie | colazione | primo | secondo | contorno | frutta | merenda | note
- Allergie mostrate come badge colorati per gravità (rosso = grave, arancione = moderata, giallo = lieve)
- Dropdown quantità per ogni portata con colori: 🟢 tutto / 🟡 metà / 🟠 poco / 🔴 nulla
- Pulsante **Salva pappe** in fondo — salva tutti in un unico invio

#### Admin — Gestione menu ciclico

**Percorso:** `Admin → Pappe`

Il menu si ripete ogni **5 settimane** in modo automatico. Una volta configurato, non serve più inserirlo ogni giorno.

**Tab Piatti:**
Catalogo di tutti i piatti disponibili.
1. Pulsante **+ Nuovo piatto** → selezionare tipo (colazione/primo/secondo/monopiatto/contorno/pane/frutta/merenda), inserire descrizione e note
2. Modifica (✏️) o disattiva (🗑) un piatto esistente — i piatti disattivati non appaiono nel ciclo ma lo storico è conservato

**Tab Calendario:**
Assegna i piatti a specifiche settimane e giorni del ciclo.
1. Selezionare il gruppo di visualizzazione (pill colorati)
2. Pulsante **+ Assegna piatto** → scegliere piatto, gruppi, e uno dei due modi:
   - **Ogni giorno** — per pane, acqua, frutta fissa
   - **Settimana × giorno** — griglia 5 settimane × 5 giorni cliccabile
3. Salva assegnazione

**Tab Sostituzioni:**
Override temporanei per una data specifica (es. menù di Natale, variante giornaliera).
1. Pulsante **+ Nuova sostituzione**
2. Compilare: data, tipo portata da sostituire, piatto alternativo, gruppi coinvolti
3. La sostituzione sovrascrive il ciclo base solo per quella data

**Tab Ciclo:**
Configura la data di partenza del ciclo.
1. Selezionare il **lunedì della settimana 1** del ciclo
2. Salva — il sistema calcola automaticamente le settimane 1–5 per qualsiasi data futura
3. Il preview mostra le date corrispondenti ad ogni settimana del ciclo

> **Esempio:** se il ciclo inizia lunedì 1 settembre, il 29 settembre sarà settimana 5, il 6 ottobre ricomincia dalla settimana 1.

#### Genitore

- Card pasto del figlio con icone quantità (🍽️ tutto / ½ metà / 🥄 poco / ❌ nulla)
- Menu del giorno abbinato al pasto
- Storico pasti scorribile

---

### 3.7 Portfolio digitale

#### Staff / Admin

**Percorso:** `Staff → Portfolio`

**Selettori in alto:**
- **Anno scolastico** (pill orizzontali)
- **Gruppo** (pill colorati con il colore del gruppo)
- **Data** (strip date scrollabile orizzontalmente)

**Caricare foto/video:**
1. Selezionare anno e gruppo
2. Selezionare o confermare la data
3. Drag & drop multiplo o pulsante sfoglia — supporta foto (JPG, PNG, WEBP) e video (MP4, MOV)
4. Barra di progresso per ogni file
5. Le thumbnail vengono generate automaticamente (server-side)

**Gallery:**
- Layout masonry a colonne CSS
- Tap/click su un'immagine → lightbox con prev/next, pulsante download, info (data, autore)

**Gestione anni scolastici (admin/direttrice):**
- Pulsante ⚙️ **Anni** → modal CRUD
- Creare un anno: nome (es. "2024-2025" o "Campo Solare Estate 2025"), data inizio, data fine, flag attivo
- L'anno attivo è selezionato di default

#### Genitore

**Percorso:** `Genitore → Portfolio`

- Selettore figlio (se più figli)
- Mostra solo gli anni in cui il figlio risulta iscritto (via Iscrizioni)
- Strip date con toni caldi
- Stesse funzionalità gallery/lightbox

---

### 3.8 Agenda giornaliera

**Percorso:** `Staff → Agenda` (accessibile anche da Admin)

**A cosa serve:** note di turno condivise tra lo staff — informazioni operative del giorno non legate a un singolo bambino.

**Navigazione giorni:**
- Frecce prev/next per scorrere i giorni
- Il futuro è bloccato (non si possono scrivere note per giorni non ancora arrivati)

**Filtrare per gruppo:**
- Tab con i gruppi configurati (colori dinamici)
- Tab "Tutti i gruppi" per vedere tutte le note

**Pubblicare una nota:**
1. Digitare il testo nel campo in basso
2. Selezionare il gruppo di riferimento (o "Tutti i gruppi")
3. Pulsante **Pubblica** (oppure `Ctrl+Enter`)

**Eliminare una nota:**
- Pulsante × visibile solo sulle proprie note (o su tutte, se admin/direttrice)
- La nota viene disattivata (soft-delete) — il testo è conservato nel DB ma non visibile

**Aspetto delle note:**
- Avatar con iniziali dell'autore
- Badge ruolo (es. "Insegnante", "Coordinatrice")
- Badge gruppo colorato (o "Tutti i gruppi" in verde)
- Timestamp di pubblicazione

---

### 3.9 Calendario scolastico

#### Staff / Admin

**Percorso:** `Staff → Calendario`

**Vista:** mensile (griglia 7×N) o lista (toggle)

**Creare un evento:**
1. Click su una data nella griglia (o pulsante **+ Nuovo evento**)
2. Compilare: titolo, descrizione, tipo evento, data inizio/fine, orario (opzionale)
3. Selezionare i gruppi coinvolti (o "tutti")
4. Flag **⚠️ Chiusura scolastica** se il nido è chiuso quel giorno
5. Flag **Invia notifica** → manda email ai genitori dei gruppi selezionati all'invio
6. Salva

**Gestire i tipi di evento (solo admin/direttrice):**
- Modal **Gestione tipi** → CRUD tipi (nome, colore hex, icona emoji)

**Badge chiusura:** eventi con `chiusura_scolastica=True` mostrano badge ⚠️

#### Genitore

- Vista lista di default (più comoda su mobile) con toggle vista mese
- Read-only — solo visualizzazione
- Modal dettaglio con descrizione completa
- Badge "Il nido è chiuso" sui giorni di chiusura

---

### 3.10 Circolari

#### Admin / Direttrice

**Percorso:** `Admin → Circolari`

**Lista con filtri:** Tutte | Pubblicate | Bozze

**Creare una circolare:**
1. Pulsante **+ Nuova circolare**
2. Compilare: titolo, testo
3. Allegato: upload opzionale (PDF, immagine, documento)
4. Gruppi destinatari: selezionare uno o più gruppi, o lasciare vuoto per tutti
5. Flag **Pubblica subito** — se non selezionato, la circolare rimane in bozza
6. Flag **Invia notifica email** — invia email ai genitori dei gruppi selezionati
7. Salva

**Pubblicare una bozza:**
- Pulsante **Pubblica** direttamente nella lista

**Vedere chi ha letto:**
- Pulsante **Letture** → mostra lista utenti con timestamp di lettura

#### Genitore

- Circolari ordinate dalla più recente
- Pallino rosso sulle circolari non lette
- Badge "N nuove" in alto
- Badge circolari non lette visibile sulla dashboard principale
- Tap sulla circolare → modal di lettura + download allegato
- La circolare viene segnata automaticamente come letta all'apertura

---

### 3.11 Fatture

**Percorso:** `Admin → Fatture`

**Vista admin:**
- Matrice basata su famiglie (genitore 1 come intestatario)
- Colonne: famiglia, bambini, importo mensile, totale
- Totale complessivo (grand total) in fondo
- Pulsante stampa/export

**Vista genitore:**
- Header verde, pill back button
- Lista fatture della propria famiglia
- Download PDF per ogni fattura

---

### 3.12 Gestione utenti

**Percorso:** `Admin → Utenti`

**Lista utenti raggruppata per ruolo** con toggle attivo/inattivo per ogni account.

**Creare un nuovo utente:**
1. Pulsante **+ Nuovo utente**
2. Compilare: nome, cognome, email, telefono
3. Selezionare il ruolo dal dropdown
4. Password: opzionale — se omessa l'account non può fare login finché non viene impostata
5. Salva

**Modificare un utente:**
- Pulsante Modifica → form con tutti i campi
- Cambio password opzionale (lasciare vuoto per non cambiare)

**Disabilitare / Riabilitare:**
- Toggle nella riga dell'utente
- Account disabilitato non può fare login

**🛡️ Protezione account admin:**
- Gli account con `role='admin'` mostrano badge 🛡️ Admin
- Solo un admin può modificare o disabilitare altri admin
- Il ruolo `admin` non appare nel dropdown per utenti non-admin

**Eliminare un utente:**
- Pulsante Elimina → conferma obbligatoria

---

### 3.13 Impostazioni

**Percorso:** `Admin → Impostazioni`

Tre tab: **Gruppi** | **Orari uscita** | **Ruoli**

#### Tab Gruppi

**Creare un gruppo:**
1. Nome (es. "Gialli", "Rossi", "Grandi")
2. Colore hex (color picker) — usato negli avatar bambini e nei badge
3. Ordine (numero) — determina l'ordine di visualizzazione nelle liste
4. Flag Attivo
5. Salva

**Modificare / Eliminare un gruppo** — CRUD diretto dalla lista.

#### Tab Orari uscita

**Creare un orario:**
1. Etichetta (es. "Tempo pieno", "Mezzogiorno")
2. Orario (time picker) — usato per il calcolo automatico ritardi uscita
3. Ordine e flag Attivo
4. Salva

#### Tab Ruoli

**Creare un ruolo personalizzato:**
1. Nome del ruolo e codice (slug univoco)
2. Matrice permessi: per ogni risorsa (bambini, presenze, diario, pappe, portfolio, fatture, utenti, circolari, calendario, note, consensi) selezionare le azioni permesse (leggi / crea / modifica / elimina)
3. Salva → il ruolo è immediatamente disponibile nell'assegnazione utenti

**Modificare i permessi di un ruolo:**
- Cliccare sul ruolo → modal con matrice CRUD per risorsa → Salva

**Eliminare un ruolo:**
- Solo se nessun utente è assegnato a quel ruolo
- I ruoli di sistema (admin, direttrice, coordinatrice, insegnante, cuoca, genitore) non possono essere eliminati
- Il ruolo `admin` non può mai essere eliminato

---

### 3.14 Sicurezza account

**Percorso:** menu utente (pill in alto a destra) → **🔐 Sicurezza**

#### Cambio password

1. Menu utente → **🔑 Cambia password**
2. Inserire la password attuale
3. Inserire e confermare la nuova password (min. 8 caratteri)
4. Salva

#### Reset password (accesso perso)

1. Nella pagina di login: link **"Password dimenticata?"**
2. Inserire l'email dell'account
3. Ricevere il link via email (valido 1 ora)
4. Cliccare il link → inserire la nuova password
5. Effettuare il login con la nuova password

> **Nota:** se il server non ha l'SMTP configurato, il link di reset appare nei log del backend. Contattare l'amministratore.

#### Autenticazione a due fattori (2FA TOTP)

La 2FA aggiunge un secondo livello di sicurezza: dopo email e password, viene richiesto un codice a 6 cifre generato dall'app di autenticazione sul telefono.

**Attivare la 2FA:**
1. Menu utente → **🔐 Sicurezza**
2. Pulsante **"Attiva autenticazione a due fattori"**
3. Scansionare il QR code con un'app di autenticazione (es. Google Authenticator, Aegis, Authy)
4. Inserire il codice a 6 cifre mostrato dall'app per confermare
5. Da quel momento, ogni login richiederà il codice TOTP

**App consigliate:**

| App | Piattaforma |
|-----|-------------|
| Google Authenticator | iOS / Android |
| Aegis | Android (open source) |
| Authy | iOS / Android / Desktop |

**Login con 2FA attiva:**
1. Inserire email e password → Accedi
2. Comparirà la schermata **"Codice di autenticazione"**
3. Aprire l'app, digitare il codice a 6 cifre corrente
4. Il codice cambia ogni 30 secondi — inserirlo prima che scada
5. Link **"Torna al login"** per annullare e riprovare con credenziali diverse

**Disattivare la 2FA:**
1. Menu utente → **🔐 Sicurezza**
2. Pulsante **"Disattiva 2FA"**
3. Inserire la password attuale per confermare

> ⚠️ Se si perde l'accesso all'app di autenticazione, contattare l'amministratore per la disattivazione manuale dal pannello admin Django.

---

## 4. Presenze insegnanti e staff

**Percorso:** `Staff → Presenze` → tab **"👩‍🏫 Insegnanti"**

Il sistema tiene traccia anche delle presenze del personale, separatamente dal registro bambini.

### 4.1 Timbratura con QR (self check-in staff)

Analogamente al QR dei genitori, esiste un QR dedicato per il personale.

**Abilitare (Admin/Direttrice):**
1. `Presenze` → tab **"📱 QR Check-in"**
2. Sezione **"QR Insegnanti"** → Toggle **Abilita**

**Per lo staff:**
1. `Presenze` → tab **"📱 QR Check-in"** → sezione QR Insegnanti
2. Mostra il QR o stampalo per affiggerlo in sala professori
3. Pulsante **Rinnova** per generare un nuovo token giornaliero

**Timbratura (insegnante):**
1. Scansionare il QR con il telefono → pagina `/checkin-insegnanti`
2. Sistema riconosce automaticamente entrata o uscita:
   - Nessun record oggi → registra **entrata** con orario attuale
   - Entrata già registrata → registra **uscita**
   - Entrambi → messaggio "Già completato per oggi"

### 4.2 Registro giornaliero insegnanti (admin)

**Percorso:** `Admin → Presenze` → tab **"👩‍🏫 Presenze insegnanti"**

- Lista del personale con orari di entrata/uscita per la data selezionata
- Inserimento manuale: form con data, toggle Presente/Assente, orari, motivo assenza
- Prefill automatico se esiste già un record per la data scelta

**Motivi assenza:**
- Malattia
- Ferie
- Permesso
- Altro

### 4.3 Storico presenze personale

**Percorso:** `Staff → Presenze` → pulsante **"📊 Storico"** in alto a destra

- Tabella con data / ora entrata / ora uscita / stato (presente / assente)
- Stats del mese corrente: giorni totali, presenti, assenti
- Admin/Direttrice possono vedere lo storico di qualsiasi membro del personale (selettore dropdown)

### 4.4 Registrare assenze manuali (admin)

Dall'admin (`Presenze` → tab Insegnanti → form manuale):
1. Selezionare la data
2. Selezionare l'insegnante
3. Toggle **Assente** → selezionare il motivo
4. Salva

---

## Note operative importanti

### Calcolo automatico ritardi

| Tipo | Soglia | Badge |
|------|--------|-------|
| Ritardo arrivo | Dopo le 09:30 | 🟠 Arancione |
| Ritardo uscita | Dopo l'orario del gruppo | 🔴 Rosso |

Il calcolo avviene automaticamente al salvataggio della presenza — non serve intervento manuale.

### GDPR e foto

- Le foto/video nel **Diario** sono visibili solo al genitore del bambino ritratto
- Non è possibile caricare media senza consenso attivo per `uso_interno`
- Il flag `non_fotografabile` sul bambino blocca qualsiasi upload, indipendentemente dai consensi
- I media vengono eliminati automaticamente dopo N giorni (configurabile)

### Soft-delete

Le seguenti operazioni non eliminano fisicamente i dati:
- Eliminazione note agenda
- Disattivazione tag "cosa portare"
- Eliminazione media portfolio

Il dato rimane nel database ma non è visibile nell'interfaccia. Questo preserva la coerenza dello storico.

### Sessione e token

La sessione scade dopo 1 ora di inattività. Il sistema rinnova automaticamente il token se l'utente sta operando attivamente (es. durante un upload lungo). Se appare un errore di sessione scaduta, effettuare nuovamente il login.

---

*Sherazade — Portale per asilo nido e scuola primaria privata*
*Sviluppato con Claude Code — open source*
