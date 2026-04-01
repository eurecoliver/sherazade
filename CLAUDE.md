# Progetto Sherazade

## Descrizione
Portale web per asilo nido / scuola primaria privata a Roma (~60 bambini).
Progetto open source gratuito sviluppato con Claude Code.
Nome interno: Sherazade.

## Stack Tecnologico
- Frontend: Next.js 14+ (React) con TypeScript
- Backend: Django REST Framework (Python)
- Database: PostgreSQL
- Storage media: MinIO (self-hosted, S3-compatible)
- Autenticazione: Auth.js + JWT + 2FA
- Notifiche: PWA push notifications + Email fallback
- PDF generation: WeasyPrint
- Internazionalizzazione: next-intl (IT, EN prioritarie)
- Containerizzazione: Docker + Docker Compose

## Hosting
- Provider: Hetzner Cloud (Nuremberg, Germania)
- Server: CPX22 — 2 CPU AMD, 4GB RAM, 80GB SSD
- IP: 159.69.9.230
- OS: Ubuntu 24.04
- GDPR compliant: server UE

## Ruoli Utente
1. Admin — controllo totale del sistema
2. Direttrice — controllo quasi totale con alcuni limiti
3. Coordinatrice
4. Insegnante
5. Cuoca
6. Genitore

## Funzionalità MVP (ordine di sviluppo)
1. [x] Autenticazione multi-ruolo (Auth + JWT + 2FA)
2. [x] Anagrafica bambini e famiglie
3. [x] Consensi fotografici digitali (GDPR compliant)
4. [x] Diario del bambino (foto/video giornalieri)
5. [x] Diario alimentare (foglio pappe + allergie)
6. [x] Registro presenze/assenze

## Funzionalità Post-MVP
- [x] Gestione utenti e gruppi configurabili (feature/utenti)
- Calendario scolastico ed eventi
- Messaggistica broadcast (circolari)
- Gestione menu settimanale
- Fatturazione documentale (PDF, no pagamenti online)
- QR code check-in
- Portfolio digitale del bambino

## Design
- Interfaccia genitori: calda, colorata, mobile-first
- Interfaccia staff: rapida, funzionale, ottimizzata per uso ripetitivo
- Responsive: PWA installabile su iOS e Android
- Multilingua: IT e EN obbligatorie

## Vincoli GDPR Critici
- Foto/video visibili SOLO al genitore del bambino ritratto
- Consenso fotografico granulare per finalità
- Consenso doppio genitore con sistema di revoca
- Auto-eliminazione media dopo N giorni configurabile
- Server obbligatoriamente in UE
- DPIA obbligatoria prima del go-live
- Log accessi ai dati minori per 6 mesi minimi

## Regola di Aggiornamento Automatico
Ad ogni task completato aggiorna questo file:
- Cambia [ ] in [x] per le funzionalità completate
- Aggiungi decisioni tecniche importanti prese durante lo sviluppo
- Aggiorna la sezione Ultimo Aggiornamento

IMPORTANTE: Al termine di ogni task, prima di considerarlo completato, aggiorna SEMPRE il CLAUDE.md con:
- Segna [x] la funzionalità completata
- Aggiungi nella sezione Ultimo Aggiornamento la data, cosa è stato fatto e il prossimo task
- Aggiungi eventuali decisioni tecniche importanti prese
- Elenca i file creati o modificati

## Comandi Utili
- Avviare il progetto in locale: docker-compose up
- Accedere al server: ssh root@159.69.9.230
- Deploy sul server: cd /var/www/sherazade && bash deploy.sh
- Avviare Claude Code: cd ~/repos/sherazade && claude

## Decisioni Tecniche

### Struttura progetto (30 marzo 2026)
- Settings Django split in `base.py` / `local.py` / `production.py` per separare ambienti
- `AUTH_USER_MODEL = 'users.User'` con campo `role` (TextChoices) impostato dalla prima migrazione — non cambiare dopo il primo deploy
- MinIO abilitato via flag `USE_S3` nelle settings (False in locale, True in produzione)
- JWT con `ROTATE_REFRESH_TOKENS=True` e blacklist attiva per sicurezza
- Frontend usa Next.js App Router con `[locale]` dynamic segment (next-intl v3)
- `next.config.mjs` con `output: 'standalone'` per Docker ottimizzato
- docker-compose.yml usa Gunicorn (backend, 2 workers, --reload) e Next.js standalone runner (frontend, target: runner) per performance migliori anche in locale; `docker-compose build frontend` necessario ad ogni modifica frontend
- Frontend Next.js gira in modalità PRODUZIONE (npm run build + npm start) — NON development. Ogni modifica al frontend richiede rebuild con deploy.sh

### Anagrafica bambini e famiglie (30 marzo 2026)
- App Django `apps.children` con modelli: Bambino, Famiglia, DelegaRitiro
- Login famiglia accetta email dei genitori (FamigliaCreateSerializer risolve email → User)
- Permessi granulari: Admin/Direttrice CRUD, Coordinatrice/Insegnante read+note, Genitore solo propri figli, Cuoca campi limitati (BambinoCuocaSerializer)
- `entrypoint.sh` ora esegue `makemigrations` (senza app specifica) per coprire tutte le app
- Frontend: pagina `/dashboard/admin/bambini` con lista card, filtri sezione/stato/ricerca, modal "Nuovo bambino", modal dettaglio con gestione famiglia e deleghe di ritiro inline
- API routes Next.js: /api/bambini, /api/bambini/[id], /api/famiglie, /api/deleghe

### Autenticazione JWT (30 marzo 2026)
- Login via email (non username) — backend cerca User per email__iexact, autentica via username internamente
- Token JWT contiene il campo `role` nel payload per evitare lookup aggiuntivi
- Frontend: Next.js API routes proxy le chiamate a Django e impostano httpOnly cookies (`access_token`, `refresh_token`)
- `BACKEND_URL=http://backend:8000` usato dalle API routes server-side in Docker; `NEXT_PUBLIC_API_URL` rimane per chiamate client-side future
- Redirect post-login basato su ruolo: admin/direttrice→/dashboard/admin, coordinatrice/insegnante→/dashboard/staff, cuoca→/dashboard/cuoca, genitore→/dashboard/genitore
- Middleware Next.js controlla cookie `access_token` per proteggere tutte le route `/dashboard/*`
- Nessuna dipendenza da Auth.js: autenticazione custom con JWT simplejwt + httpOnly cookies

### Permessi entrypoint.sh (30 marzo 2026)
- `.gitattributes` nella radice garantisce `eol=lf` per `backend/entrypoint.sh` (Git non preserva il bit di esecuzione su Windows/Linux)
- `Dockerfile` usa `chmod +x /app/entrypoint.sh` con path assoluto dopo `COPY . .`
- Shebang `#!/bin/bash` invece di `#!/bin/sh` per compatibilità con le funzionalità bash usate
- `docker-compose.yml` sovrascrive il command del backend con `bash -c "chmod +x /app/entrypoint.sh && /app/entrypoint.sh python manage.py runserver 0.0.0.0:8000"` — soluzione definitiva ai permessi E garantisce che le migrazioni girino anche in locale (il precedente `command: python manage.py runserver` bypassava completamente entrypoint.sh)

### Migrazione users.User (30 marzo 2026)
- `INSTALLED_APPS = LOCAL_APPS + DJANGO_APPS + THIRD_PARTY_APPS` — apps.users deve precedere django.contrib.admin per AUTH_USER_MODEL
- Migrazione iniziale `0001_initial.py` scritta a mano e committata nel repo (non generata a runtime)
- `entrypoint.sh` esegue `makemigrations users --noinput` prima di `migrate` come guardia per ambienti di sviluppo

### Consensi fotografici GDPR (30 marzo 2026)
- App Django `apps.consents` con modello `ConsensoFotografico`: bambino, finalita (3 valori TextChoices), consenso_genitore1/2, data_consenso_genitore1/2, revocato, data_revoca
- `unique_together = [('bambino', 'finalita')]` — un solo record per coppia bambino+finalità
- Campo `non_fotografabile` aggiunto a `Bambino` (migration 0002) — override assoluto su tutti i consensi
- Property `.stato` su ConsensoFotografico: calcola semaforo `non_fotografabile|revocato|completo|parziale|nessuno`
- Action `miei` (genitore): restituisce figli con campo `is_genitore2` e `mio_consenso`/`mia_data_consenso` specifici per il genitore autenticato
- Actions `dai_consenso`/`revoca_consenso`: comportamento differenziato per ruolo — genitore aggiorna solo il proprio campo, admin aggiorna entrambi
- Frontend admin: tabella semaforo (🟢🟡🔴⚫) per bambino×finalità, modal gestione con toggle per-genitore, revoca per-finalità, revoca tutti
- Frontend genitore: card per figlio con toggle consenso per finalità, testo GDPR, timestamps, stati revocato/non-configurato
- Permessi: Admin/Direttrice CRUD, Coordinatrice/Insegnante read-only, Genitore read+dai/revoca_consenso+miei, Cuoca nessun accesso

### Diario del bambino (31 marzo 2026)
- App Django `apps.diary` con modelli `RegistroDiario` (bambino, data, autore, umore, testi) e `MediaDiario` (file, tipo foto/video, thumbnail, visibile_a_genitori)
- `unique_together = [('bambino', 'data')]` — un registro per bambino per giorno
- Vincolo GDPR: prima di ogni upload media, verifica consenso attivo per `uso_interno` E `genitori_diretti`; blocca con errore esplicito se mancante o revocato
- Action `giornata`: vista staff per data — lista bambini con registro del giorno e flag consenso_ok per ogni bambino
- Action `mio_figlio`: feed cronologico genitore — solo media `visibile_a_genitori=True`, verifica proprietà prima dell'accesso
- Permessi: Admin/Direttrice/Coordinatrice CRUD, Insegnante CRUD, Genitore read-only propri figli, Cuoca nessun accesso
- Upload media via `MultiPartParser` (FormData), path dinamico `diario/{bambino_id}/{data}/{filename}`
- Frontend staff: vista giornaliera con BambinoCard espandibile (form umore+testi+upload), filtro data e sezione, contatore compilati
- Frontend genitore: feed con RegistroCard (emoji umore, attività, note, griglia foto/video), lightbox con download, selettore figlio se più figli

### Registro presenze/assenze (31 marzo 2026)
- App Django `apps.attendance` con modello `Presenza`: bambino, data, presente (bool), ora_arrivo/uscita, assenza_comunicata, motivo_assenza (TextChoices: malattia/famiglia/vacanza/altro), note, registrato_da
- `UniqueConstraint(fields=['bambino', 'data'])` — un registro per bambino per giorno
- Action `giornata`: staff/admin — lista bambini con presenza del giorno, opz. sezione
- Action `salva_giornata`: bulk `update_or_create` per salvare tutti i bambini in un POST
- Action `non_arrivati`: admin/direttrice — bambini attivi senza registro per la data indicata (alert mattutino)
- Action `report_mensile`: admin — report bambino per bambino con %presenza, base per export PDF
- Action `presenti_oggi`: cuoca — contatore bambini presenti per calibrare porzioni
- Action `comunica_assenza`: genitore — crea/aggiorna presenza con presente=False, assenza_comunicata=True
- Action `mio_figlio`: genitore — storico presenze + statistiche mese corrente
- Permessi: Admin/Direttrice/Coordinatrice CRUD + report; Insegnante CRUD; Cuoca read + presenti_oggi; Genitore read propri figli + comunica_assenza + mio_figlio
- Frontend staff: lista bambini con toggle Sì/No a un tap, campo ora_arrivo se presente, dropdown motivo se assente, checkbox "genitore ha avvisato", contatori presenti/assenti/da fare, bottone Salva fisso in basso
- Frontend admin: tab "Riepilogo giornaliero" (contatori globali + alert non arrivati in rosso + riepilogo per sezione) e "Report mensile" (tabella con barra % presenza + bottone Stampa/PDF)
- Frontend genitore: card stato di oggi, bottone "Comunica assenza" con form motivo, statistiche mese, storico recente 20 giorni
- Dashboard cuoca aggiornata: contatore "Bambini presenti oggi" visibile subito all'apertura

### Gestione utenti e gruppi configurabili (31 marzo 2026)
- Nuova app Django `apps.config` con modelli `Gruppo` (nome, colore hex, ordine, attivo, creato_da FK) e `OrarioUscita` (etichetta, orario, ordine, attivo)
- `apps.config` aggiunta in LOCAL_APPS prima di `apps.children` per rispettare la dipendenza FK
- `Bambino.sezione` CharField rimosso, sostituito da `gruppo = FK(config.Gruppo)` e `orario_uscita = FK(config.OrarioUscita)`, entrambi null/blank
- Property `sezione` aggiunta a Bambino per backward-compat Python (ritorna `gruppo.nome` o `''`) — i filtri ORM usano `bambino__gruppo_id=<id>` non la property
- Ordering `order_by('sezione', ...)` → `order_by('gruppo__ordine', ...)` in tutti i viewset
- Filtro API cambiato da `?sezione=Gialli` (string) a `?gruppo=3` (ID intero) — frontend aggiornato di conseguenza
- `UserAdminSerializer` con password write-only e `is_active` writable; `UserAdminViewSet` protetto da `IsAdminOrDirettrice`
- `UserAdminViewSet` registrato nel router in `apps/users/urls.py` — esposto su `/api/v1/auth/utenti/`
- Frontend: `/dashboard/admin/utenti` — lista per ruolo, toggle attivo/disabilitato, form nuovo/modifica utente con password opzionale
- Frontend: `/dashboard/admin/impostazioni` — tab Gruppi (CRUD + color picker), tab Orari uscita (CRUD)
- Frontend bambini: dropdown gruppi caricato da API, dropdown orari uscita, colore avatar dinamico da `gruppo_colore`

### Diario alimentare / foglio pappe (31 marzo 2026)
- App Django `apps.meals` con 3 modelli: `AllergiaIntolleranza` (tipo, gravita, note_mediche), `MenuGiornaliero` (portate + sezione, unique_together data+sezione), `RegistroPasto` (5 portate con quantità, unique_together bambino+data)
- Enum `Quantita`: tutto/meta/poco/nulla — usato in tutti i campi portata
- Action `per_sezione`: lista bambini con allergie attive per vista mattutina cuoca; flag `ha_allergie_gravi` per alert immediato
- Action `giornata`: staff view — bambini con allergie + registro pasto del giorno
- Action `salva_sezione`: bulk `update_or_create` per salvare tutti i pasti della sezione in un unico POST
- Action `mio_figlio`: genitore vede feed storico pasti propri figli; autorizzazione via `famiglia.genitore1_id/genitore2_id` (PK comparison, no lazy load); fallback su tutti i bambini visibili se Famiglia mancante o bambino_id non fornito
- Permessi: Cuoca CRUD menu + read allergie; Insegnante CRUD registri pasto; Admin/Direttrice/Coordinatrice CRUD completo; Genitore read-only
- Frontend cuoca: alert rosso per allergie gravi/anafilassi, lista allergie moderate, form menu del giorno con 6 portate
- Frontend staff: tabella foglio pappe con dropdown colorati per quantità (verde/giallo/arancione/rosso), allergie come badge colorati per gravità, salvataggio sezione in un click
- Frontend genitore: PastoCard con icone quantità (🍽️/🥄/❌), menu sezione abbinato, storico pasti

### Anagrafica v2 — espansione campi bambini/famiglie (1 aprile 2026)
- `Bambino`: aggiunti `alias_nome` (CharField) e `alias_attivo` (BooleanField) — solo nella dashboard genitore, se alias_attivo=True viene mostrato alias invece del nome reale
- `Famiglia`: aggiunti `genitore1_codice_fiscale`, `genitore1_indirizzo`, `genitore2_codice_fiscale`, `genitore2_indirizzo` — CF e indirizzo per-genitore separati dall'indirizzo famiglia; nome/cognome/email/telefono restano su User FK
- API Next.js `/api/bambini`: supporto multipart/form-data per upload foto profilo (POST e PATCH)
- API Next.js `/api/famiglie/[id]`: aggiunto GET e PATCH
- Frontend admin bambini: upload foto con preview, campo alias + toggle, form famiglia espanso con CF/indirizzo per-genitore e toggle genitore2, badge "alias" su card
- Frontend genitore: mostra alias_nome se alias_attivo=True, con foto profilo e gruppo del figlio in dashboard
- Migration: `children/0004_anagrafica_v2.py`

## Ultimo Aggiornamento
Data: 1 aprile 2026
Completato: feature/anagrafica-v2 — espansione anagrafica bambini (alias, foto) e famiglie (CF, indirizzi per-genitore)
Branch: feature/anagrafica-v2
Prossimo task: feature/calendario
