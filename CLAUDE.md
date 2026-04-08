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
7. [x] Presenze v2 — ritardi arrivo/uscita automatici
8. [x] Diario v2 — sonno, popò, tag "cosa portare"

## Funzionalità Post-MVP
- [x] Gestione utenti e gruppi configurabili (feature/utenti)
- [x] Anagrafica v2 — foto profilo, alias nome, dati famiglia completi (feature/anagrafica-v2)
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
'- Per analisi massive di codice, lettura log o documentazione, delega SEMPRE l'esplorazione a Gemini usando questo comando: gemini -p "inserisci qui il prompt".'

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

## Sicurezza — Stato Attuale

### Completato ✅
- UFW firewall attivo: porte 22, 80, 443 aperte — tutto il resto bloccato
- PostgreSQL non esposto pubblicamente (rimossa porta dal docker-compose)
- Docker iptables configurato correttamente (iptables: true)
- SSH hardening: root login solo con chiave SSH, password disabilitata
- Chiave SSH ed25519 configurata per accesso Mac → server
- Rate limiting login: max 5 tentativi per IP ogni 5 minuti (django-ratelimit)
- DRF throttling: 100/hour anonimo, 1000/hour autenticato
- Fail2ban attivo: banna IP dopo 3 tentativi SSH falliti (ban 24h)
- Backup automatico PostgreSQL: ogni notte, ultimi 7 giorni in /var/backups/sherazade/
- Kernel aggiornato dopo reboot

### Da fare prima del go-live 🔴
- HTTPS con Let's Encrypt + Nginx (richiede dominio definitivo)

### Da fare post go-live 🟡
- Monitoring e alerting (es. Uptime Robot per downtime)
- Backup offsite (copia backup su storage esterno)

### Presenze v2 — ritardi arrivo/uscita (2 aprile 2026)
- `Presenza` model: aggiunti `minuti_ritardo_arrivo` e `minuti_ritardo_uscita` (IntegerField, null=True)
- `save()` override: calcola automaticamente ritardo arrivo (vs 09:00 fisso) e ritardo uscita (vs `bambino.orario_uscita.orario`)
- `_calcola_ritardi()` helper: usa `datetime.combine()` per aritmetica su TimeField
- BUGFIX (7 aprile 2026): `_to_time()` helper aggiunto — converte stringa "HH:MM" a oggetto `time` prima del confronto; `update_or_create` passa stringhe non convertite a Django, causava TypeError silenzioso e perdita dell'orario
- `giornata` action: restituisce `orario_uscita_previsto` nel bambino dict (da `bambino.orario_uscita.orario`)
- Frontend staff presenze: ora_uscita time picker, badge arancione ritardo arrivo, badge rosso ritardo uscita, "Previsto: HH:MM"
- Frontend admin presenze: badge ritardo arrivo e uscita inline nella lista per-sezione
- Migration: `attendance/0002_presenza_ritardi.py`

### Diario v2 — sonno, popò, tags (2 aprile 2026)
- `TagCosaPortare` model: nome (unique), creato_da FK, attivo BooleanField
- `RegistroDiario`: aggiunti 4 TimeField sonno (mattina/pomeriggio inizio/fine), `popo` BooleanField, M2M `tags_cosa_portare`
- `TagCosaPortareViewSet`: CRUD, genitore vede solo attivi, staff/admin vede tutti; `creato_da` settato automaticamente
- `RegistroDiarioWriteSerializer`: accetta `tags_cosa_portare` come lista di PK
- `RegistroDiarioSerializer`: serializza `tags_cosa_portare` nested con `TagCosaPortareSerializer`
- Frontend staff diario: sezione sonno 2×2 grid time range picker, checkbox popò con stile, TagSelector con chip toggle + campo "nuovo tag" inline
- Frontend genitore diario: mostra badge popò, badge tag cosa portare, sezione sonno mattina/pomeriggio
- API route Next.js: `/api/diario/tags` (GET list + POST crea)
- Migration: `diary/0002_diario_v2.py`

### Diario Fase 1 — sonno unificato + tag colorati (7 aprile 2026)
- `TagCosaPortare`: aggiunto campo `colore` (CharField hex, default `#0984E3`)
- `RegistroDiario`: campi sonno da 4 (mattina/pomeriggio inizio/fine) → 2 (`sonno_inizio`, `sonno_fine`)
- `TagCosaPortareViewSet.destroy()`: soft-delete (imposta `attivo=False`) per preservare storico diari; solo staff autorizzato
- API route Next.js `/api/diario/tags/[id]`: DELETE (soft-delete) e PATCH
- Frontend staff diario: vista tabellare compatta — una riga per bambino, tutto inline senza espandere; chip tag con colore personalizzato; color picker per nuovo tag; colonna media collassabile
- Frontend genitore diario: badge tag con colore personalizzato (`colore` da API); sonno mostrato come "dalle HH:MM alle HH:MM"
- Migration: `diary/0004_diario_fase1.py`

### Hotfix deploy (7 aprile 2026)
- Migrazioni `attendance/0003` e `diary/0003`: sostituite `RemoveConstraint` con `SeparateDatabaseAndState` (RunSQL `IF EXISTS` + state operation) per gestire constraint già rimossi o mai creati nel DB
- `AlterUniqueTogether` in `diary/0003` resa idempotente con `SeparateDatabaseAndState` + DO block PostgreSQL `IF NOT EXISTS`
- Rimosso `makemigrations --noinput` da `entrypoint.sh`: generava migration spurie (`0004`) ad ogni restart in produzione
- `fetchBackend` utility (`frontend/src/lib/fetchBackend.ts`): refresh automatico del `access_token` su 401 in tutte le route Next.js API — previene perdita dati quando il token scade dopo 1 ora di sessione

### Piano sviluppo concordato con direttrice (7 aprile 2026)

#### Fase 1 — Diario ✅ COMPLETATA (7 aprile 2026)
- Sonno: da 4 campi (mattina/pomeriggio inizio/fine) → 2 campi (`sonno_inizio`, `sonno_fine`)
- Tag: aggiunto `colore` (hex) a `TagCosaPortare`; insegnante/direttrice possono disattivare tag (soft-delete, storico preservato)
- Frontend staff diario: vista tabellare inline (nome | sonno | popò | tag | umore | note, tutto senza espandere)

#### Fase 2 — Consensi admin ✅ COMPLETATA (7 aprile 2026)
- Admin può forzare consenso a True anche se genitore aveva detto No (già funzionante via PATCH toggle per-genitore)
- PDF precompilato scaricabile con spunte sui consensi richiesti (generato da WeasyPrint)

#### Fase 3 — Pappe (redesign completo) ✅ COMPLETATA (7 aprile 2026)
Nuova architettura menu ciclico 5 settimane (ciclo continuo tra mesi):
- `ConfigMenuCiclo`: data_inizio_ciclo (imposta una volta, usata per calcolo automatico settimana 1-5)
- `Piatto`: tipo (Colazione/Primo/Secondo/Monopiatto/Contorno/Pane/Frutta/Merenda) | descrizione | data_inizio | data_fine
- `PiattoAssegnazione`: piatto FK | gruppo FK | sempre bool | giorni_per_settimana JSON `{"1":[0,3],"2":[1,4],...}` (0=lun, 4=ven)
- `SostituzionePiatto`: M2M gruppi | data_inizio | data_fine | tipo | descrizione | inserito_da (override temporaneo senza toccare ciclo base)
- `RegistroPasto`: aggiunti colazione_quantita, monopiatto_quantita, pane_quantita
- Frontend admin: CRUD piatti + scheduler grafico settimane/giorni + gestione sostituzioni
- Frontend staff pappe: menu del giorno calcolato automaticamente + registrazione consumo
- Frontend genitore: menu del giorno + quanto ha mangiato il figlio

#### Modifiche anagrafica/permessi (da fare in parallelo alle fasi)
- Anagrafica admin: popup bidirezionale bambino↔famiglia già parzialmente presente, verificare completezza
- Admin: permessi CRUD completi su tutti i campi inclusi consensi

## Ultimo Aggiornamento
Data: 7 aprile 2026
Completato: Presenze v2 (orario 09:30, tab registra admin, ritardi genitore) + anagrafica genitori

### Fix orario ingresso (7 aprile 2026)
- `backend/apps/attendance/models.py`: `ORA_INGRESSO = time(9, 0)` → `time(9, 30)`
- `frontend/dashboard/staff/presenze`: `calcolaRitardoArrivo` aggiornato a 09:30

### Admin presenze: tab Registra (7 aprile 2026)
- Aggiunto tab "📝 Registra presenze" alla dashboard admin/presenze
- Stesso pannello delle presenze staff (BambinoRow, selezione data/sezione, salva bulk)
- Admin/Direttrice possono ora registrare presenze come lo staff

### Genitore presenze: ritardi (7 aprile 2026)
- `Presenza`: aggiunto `minuti_ritardo_arrivo`, `minuti_ritardo_uscita`, `ora_uscita`
- Card "Oggi": badge ritardo arrivo/uscita se presenti
- Stats mese: box aggiuntivi totale minuti ritardo arrivo/uscita (solo se > 0)
- Storico: badge ritardo inline per ogni giorno

### Anagrafica Genitori (7 aprile 2026)
- Nuova pagina `/dashboard/admin/genitori` con vista card + tabella
- Filtri: ricerca testo, stato attivo/inattivo, toggle vista
- Detail modal: info personali, lista figli (cross-reference con famiglie)
- Edit modal: PATCH su UserAdminViewSet (nome, cognome, email, telefono, is_active)
- Nuovo genitore: POST con password opzionale (se omessa → unusable password)
- Disattiva/Riattiva (PATCH is_active) + Elimina (DELETE)
- Bidirezionale: stesso modello User condiviso con anagrafica bambini
- `frontend/src/app/api/famiglie/route.ts`: aggiunto GET handler
- Pulsante "👨‍👩‍👧 Genitori" nella dashboard admin

Prossimo task: deploy + test in produzione
