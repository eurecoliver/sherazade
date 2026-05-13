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
1. [x] Autenticazione multi-ruolo (Auth + JWT) — 2FA non implementato, vedi Post-MVP
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
- [x] Calendario scolastico ed eventi
- [x] Messaggistica broadcast (circolari)
- [x] Agenda giornaliera condivisa — note di turno per staff
- [x] Ruoli personalizzati con permessi CRUD granulari
- [x] QR code check-in
- [x] Portfolio digitale del bambino
- [x] Fatturazione documentale (PDF, no pagamenti online)
- [x] Gestione menu settimanale (sostituita da Pappe v2 con ciclo 5 settimane)
- [ ] 2FA TOTP — ✅ COMPLETATO (13 maggio 2026): endpoint setup/verify/disable, step TOTP nel login, pagina `/dashboard/sicurezza`

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
- Per analisi massive di codice, lettura log o documentazione, delega SEMPRE l'esplorazione a Gemini usando questo comando: gemini -p "inserisci qui il prompt".

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
- [x] Monitoring e alerting — `/api/v1/health/` endpoint (DB check), script monitor.sh (disco/RAM/container) cron ogni 10 min → `/var/log/sherazade_monitor.log`; Uptime Robot da configurare manualmente
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

### Anagrafica v3 — CF/indirizzo genitore + UX modal bambini (8 aprile 2026)
- `User` model: aggiunti `codice_fiscale` (CharField 16) e `indirizzo` (TextField)
- Migration `users/0003_user_cf_indirizzo.py`
- `UserAdminSerializer`: aggiunto `codice_fiscale` e `indirizzo` nei fields
- Genitori page: CF/indirizzo in dettaglio, modifica e creazione; post-creazione modale "Collega bambino" (cerca esistente o crea nuovo)
- Bambini page: action buttons spostati in fondo al modal; sezione famiglia con tab Genitore 1 / Genitore 2

### UX/UI redesign globale — layout responsive + pill back button (9 aprile 2026)
- **Pattern design unificato** applicato a tutte le dashboard e sotto-pagine del portale
- **Gradient header** a tutta larghezza per ogni dashboard (colore specifico per ruolo):
  - Admin: `#6C5CE7 → #4834D4` (viola)
  - Staff: `#0984E3 → #0652DD` (blu)
  - Cuoca: `#00B894 → #00917A` (verde)
  - Genitore: già aggiornato (arancione/rosso/verde a seconda della sezione)
- **Pill back button** su tutte le sotto-pagine: `rgba(255,255,255,0.15)` + bordo + borderRadius 20px — sostituisce il vecchio pulsante invisibile `background: none, border: none`
- **maxWidth responsive** con `min(Npx, 96vw)` su tutte le pagine — si adatta automaticamente da mobile a desktop senza media queries
- **CSS grid auto-fill** per la navigazione: `repeat(auto-fill, minmax(min(180px, 100%), 1fr))` — si espande su desktop, si impila su mobile
- **`clamp()`** per la tipografia del titolo H1 nelle dashboard principali
- **Dashboard principali** completamente riscritte (admin, staff, cuoca): header gradiente, saluto utente, logout pill top-right, no max 600px
- **Cuoca dashboard**: attendance counter come card prominente con icona + numero grande + tasto Pappe del giorno

**File modificati:**
- `frontend/src/app/[locale]/dashboard/admin/page.tsx` — redesign completo
- `frontend/src/app/[locale]/dashboard/staff/page.tsx` — redesign completo
- `frontend/src/app/[locale]/dashboard/cuoca/page.tsx` — redesign completo
- `frontend/src/app/[locale]/dashboard/admin/bambini/page.tsx` — pill back, maxWidth
- `frontend/src/app/[locale]/dashboard/admin/consensi/page.tsx` — pill back (via costante), maxWidth
- `frontend/src/app/[locale]/dashboard/admin/fatture/page.tsx` — pill back, maxWidth
- `frontend/src/app/[locale]/dashboard/admin/genitori/page.tsx` — pill back, maxWidth
- `frontend/src/app/[locale]/dashboard/admin/pappe/page.tsx` — pill back, maxWidth
- `frontend/src/app/[locale]/dashboard/admin/presenze/page.tsx` — pill back, maxWidth
- `frontend/src/app/[locale]/dashboard/admin/utenti/page.tsx` — gradient header aggiunto, pill back, maxWidth
- `frontend/src/app/[locale]/dashboard/admin/impostazioni/page.tsx` — gradient header aggiunto, pill back, maxWidth
- `frontend/src/app/[locale]/dashboard/staff/diario/page.tsx` — pill back, maxWidth
- `frontend/src/app/[locale]/dashboard/staff/presenze/page.tsx` — pill back
- `frontend/src/app/[locale]/dashboard/staff/pappe/page.tsx` — pill back, maxWidth
- `frontend/src/app/[locale]/dashboard/cuoca/pappe/page.tsx` — pill back, maxWidth
- `frontend/src/app/[locale]/dashboard/genitore/diario/page.tsx` — pill back, maxWidth

### Fatture e consensi (9 aprile 2026)
- `backend/Dockerfile`: aggiunta `libgdk-pixbuf-2.0-0` (nome corretto per Debian Trixie, rimpiazza `libgdk-pixbuf2.0-0` rinominato) insieme alle altre librerie WeasyPrint
- `backend/apps/consents/views.py`: endpoint PDF consensi ora accessibile anche al genitore per i propri figli (verifica via `famiglia.genitore1_id/genitore2_id`)
- `frontend/genitore/consensi/page.tsx`: pulsante "📄 Riepilogo PDF" sempre visibile + "📄 Modulo riattivazione" se consenso revocato
- `frontend/admin/fatture/page.tsx`: matrice basata su famiglie (solo genitore1), nomi bambini, totale per riga e grand total
- `frontend/genitore/fatture/page.tsx`: header gradiente verde, pill back button, maxWidth responsive

### Agenda giornaliera condivisa — note di turno (9 aprile 2026)
- Nuova app Django `apps.notes` con modello `NotaGiornata`:
  - `testo` (TextField), `data` (DateField, default today), `autore` FK User, `gruppo` FK config.Gruppo (null = tutti i gruppi), `creato_at`, `aggiornato_at`, `attivo` (soft-delete)
  - Index su `['data', 'attivo']` per query efficienti per giornata
- Permessi: Admin/Direttrice/Coordinatrice/Insegnante: create + list + delete proprie note; Admin/Direttrice: delete qualsiasi nota; Cuoca/Genitore: nessun accesso
- `destroy()`: soft-delete (`attivo=False`) invece di DELETE fisico — storico preservato nel DB
- Filtri API: `?data=YYYY-MM-DD` e `?gruppo=<id>` (0 = solo note generali)
- Serializer: campi `autore_nome`, `autore_ruolo`, `gruppo_nome`, `is_own` (per mostrare/nascondere il pulsante elimina)
- API Next.js: `GET/POST /api/note`, `DELETE /api/note/[id]`
- Frontend: pagina `/dashboard/staff/agenda/page.tsx` condivisa tra staff e admin/direttrice (back button role-aware: → admin o → staff a seconda del ruolo)
- UX: navigazione giorni (prev/next con blocco futuro), tab filtro gruppi colorati, card note con avatar iniziali + badge ruolo + badge gruppo, timestamp, pulsante elimina ×
- Nota generale mostra badge verde "Tutti i gruppi"; nota per gruppo mostra il colore del gruppo
- Shortcut tastiera: Ctrl+Enter per pubblicare la nota
- Form: textarea + select gruppo + bottone pubblica (disabilitato se testo vuoto)
- Dashboard staff: aggiunto pulsante "📝 Agenda" nei NAV_ITEMS
- Dashboard admin: aggiunto pulsante "📝 Agenda" con path assoluto verso staff/agenda

**File creati:**
- `backend/apps/notes/__init__.py`
- `backend/apps/notes/apps.py`
- `backend/apps/notes/admin.py`
- `backend/apps/notes/models.py`
- `backend/apps/notes/permissions.py`
- `backend/apps/notes/serializers.py`
- `backend/apps/notes/views.py`
- `backend/apps/notes/urls.py`
- `backend/apps/notes/migrations/0001_initial.py`
- `backend/apps/notes/migrations/__init__.py`
- `frontend/src/app/api/note/route.ts`
- `frontend/src/app/api/note/[id]/route.ts`
- `frontend/src/app/[locale]/dashboard/staff/agenda/page.tsx`

**File modificati:**
- `backend/sherazade/settings/base.py`: aggiunto `apps.notes` in LOCAL_APPS
- `backend/sherazade/urls.py`: aggiunto include apps.notes.urls
- `frontend/src/app/[locale]/dashboard/staff/page.tsx`: aggiunto Agenda in NAV_ITEMS
- `frontend/src/app/[locale]/dashboard/admin/page.tsx`: aggiunto bottone Agenda

Prossimo task: deploy + test in produzione

### Calendario scolastico (9 aprile 2026)
- Nuova app Django `apps.calendario` con modelli:
  - `TipoEvento`: nome (unique), colore hex, icona emoji, attivo, creato_da FK
  - `EventoCalendario`: titolo, descrizione, tipo FK, data_inizio/fine, tutto_il_giorno bool, ora_inizio/fine, `chiusura_scolastica` bool, gruppi M2M, notifica_inviata bool, creato_da FK
- Permessi: Admin/Direttrice/Coordinatrice/Insegnante → CRUD; Genitore/Cuoca → read-only
- `TipoEventoPermission`: solo Admin/Direttrice possono creare/modificare tipi
- Email notifica genitori via `threading.Thread(daemon=True)` con `send_mail(fail_silently=True)` — non bloccante; attivata solo se `invia_notifica=True` nel POST
- Action `chiusure`: endpoint dedicato `/api/v1/calendario/chiusure/` per integrare con registro presenze
- Filtri API: `?mese=YYYY-MM`, `?anno=YYYY`, `?dal=`, `?al=`, `?chiusure=1`
- Frontend staff/admin: pagina calendario con vista mese (griglia 7×N) e vista lista; modal crea/modifica; modale gestione tipi evento (solo admin/direttrice); badge chiusura scolastica ⚠️
- Frontend genitore: calendario read-only con vista lista (default) e mese; modal dettaglio; badge "Il nido è chiuso"
- Backend route prefix: `calendario/tipi` e `calendario` nel DRF router

**File creati:**
- `backend/apps/calendario/__init__.py`
- `backend/apps/calendario/apps.py`
- `backend/apps/calendario/admin.py`
- `backend/apps/calendario/models.py`
- `backend/apps/calendario/permissions.py`
- `backend/apps/calendario/serializers.py`
- `backend/apps/calendario/views.py`
- `backend/apps/calendario/urls.py`
- `backend/apps/calendario/migrations/0001_initial.py`
- `backend/apps/calendario/migrations/__init__.py`
- `frontend/src/app/api/calendario/route.ts`
- `frontend/src/app/api/calendario/[id]/route.ts`
- `frontend/src/app/api/calendario/tipi/route.ts`
- `frontend/src/app/api/calendario/tipi/[id]/route.ts`
- `frontend/src/app/[locale]/dashboard/staff/calendario/page.tsx`
- `frontend/src/app/[locale]/dashboard/genitore/calendario/page.tsx`

**File modificati:**
- `backend/sherazade/settings/base.py`: aggiunto `apps.calendario` in LOCAL_APPS
- `backend/sherazade/urls.py`: aggiunto include apps.calendario.urls
- `frontend/src/app/[locale]/dashboard/staff/page.tsx`: aggiunto Calendario in NAV_ITEMS
- `frontend/src/app/[locale]/dashboard/admin/page.tsx`: aggiunto bottone Calendario (path assoluto → staff/calendario)
- `frontend/src/app/[locale]/dashboard/genitore/page.tsx`: aggiunto Calendario in NAV_ITEMS

Prossimo task: QR code check-in

### Messaggistica broadcast — circolari (9 aprile 2026)
- Nuova app Django `apps.messaggi` con modelli:
  - `Circolare`: titolo, testo, allegato (FileField), autore FK, gruppi M2M, pubblicata bool, notifica_inviata bool
  - `LetturaCircolare`: circolare FK + utente FK, unique_together → traccia chi ha letto
- Permessi: Admin/Direttrice CRUD (incluse bozze); Coordinatrice/Insegnante read-only pubblicate; Genitore read-only (solo gruppo proprio figlio o generali)
- Bozze visibili solo ad Admin/Direttrice
- Email notifica genitori in background thread all'invio (filtro per gruppi se specifici)
- Action `segna-letta`: genitore marca circolare come letta (crea LetturaCircolare)
- Action `letture`: admin vede chi ha letto (con timestamp)
- Genitore: filtra circolari per gruppo del figlio (via Famiglia → Bambino → gruppo)
- Frontend admin: lista con filtri (tutte/pubblicate/bozze), pulsante "Pubblica", pulsante "Letture", modal crea/modifica con upload allegato, selezione gruppi, checkbox pubblica+invia_notifica
- Frontend genitore: lista con badge "nuove" non lette, pallino rosso per non lette, auto-segna come letta all'apertura, modal lettura con download allegato

**File creati:**
- `backend/apps/messaggi/__init__.py`
- `backend/apps/messaggi/apps.py`
- `backend/apps/messaggi/admin.py`
- `backend/apps/messaggi/models.py`
- `backend/apps/messaggi/permissions.py`
- `backend/apps/messaggi/serializers.py`
- `backend/apps/messaggi/views.py`
- `backend/apps/messaggi/urls.py`
- `backend/apps/messaggi/migrations/0001_initial.py`
- `backend/apps/messaggi/migrations/__init__.py`
- `frontend/src/app/api/circolari/route.ts`
- `frontend/src/app/api/circolari/[id]/route.ts`
- `frontend/src/app/api/circolari/[id]/segna-letta/route.ts`
- `frontend/src/app/api/circolari/[id]/letture/route.ts`
- `frontend/src/app/[locale]/dashboard/admin/circolari/page.tsx`
- `frontend/src/app/[locale]/dashboard/genitore/circolari/page.tsx`

**File modificati:**
- `backend/sherazade/settings/base.py`: aggiunto `apps.messaggi` in LOCAL_APPS
- `backend/sherazade/urls.py`: aggiunto include apps.messaggi.urls
- `frontend/src/app/[locale]/dashboard/admin/page.tsx`: aggiunto pulsante Circolari
- `frontend/src/app/[locale]/dashboard/genitore/page.tsx`: aggiunto pulsante Circolari + badge contatore non lette

### Fix ordine circolari (10 aprile 2026)
- `backend/apps/messaggi/views.py`: aggiunto `order_by('-creato_at')` esplicito in fondo a `get_queryset()` — `annotate`+`distinct` per il genitore può perdere l'ordering dalla Meta del modello

### Badge circolari non lette sulla dashboard genitore (10 aprile 2026)
- `frontend/src/app/[locale]/dashboard/genitore/page.tsx`: fetch parallelo a `/api/circolari` al mount; contatore `nonLette`; pill badge arancione accanto al titolo "Circolari" nel grid; bordo accentuato quando ci sono messaggi da leggere

### Ruoli personalizzati con permessi CRUD granulari (11 aprile 2026)
- Backend `Ruolo` model: CRUD completo, safety check su delete (verifica utenti assegnati)
- `PermessoRuolo`: matrice granulare ruolo×risorsa×azione configurabile da admin
- `IsAdminOnly` permission: solo Admin gestisce ruoli/permessi
- `pagination_class = None` su tutti i viewset config (Ruolo, Gruppo, OrarioUscita) — risposta sempre array, non paginata
- Migration `users/0004_user_role_free.py`: rimosso vincolo `choices` da `User.role`, max_length 50
- Migration `config/0005_seed_ruoli.py`: 6 ruoli di sistema + permessi Direttrice (tutti True)
- Migration `config/0006_add_fatture_risorsa.py`: aggiunta risorsa 'fatture' ai permessi
- `apps.config.permessi.check_permesso()`: query diretta al DB (rimossa cache incompatibile con multi-worker Gunicorn)
- Dashboard admin/staff/genitore: caricano `/api/config/permessi-utente/` e filtrano i nav item dinamicamente
- `utenti/page.tsx`: ruoli completamente dinamici da API — filtro, raggruppamento, dropdown assegnazione tutti caricati da `/api/config/ruoli`; sezione "ruolo rimosso" per utenti con ruoli non più esistenti
- Fix route `/api/config/ruoli/[id]`: risposta 204 con `new NextResponse(null, { status: 204 })` (HTTP-corretto, no body)
- Fix `deleteRuolo`: try/catch/finally — `setDeletingRuolo(null)` sempre eseguito

**File modificati:**
- `backend/apps/config/views.py`: `pagination_class = None` su Ruolo/Gruppo/OrarioUscita viewsets
- `frontend/src/app/[locale]/dashboard/admin/utenti/page.tsx`: ruoli dinamici da API
- `frontend/src/app/api/config/ruoli/[id]/route.ts`: fix risposta 204
- `frontend/src/app/[locale]/dashboard/admin/impostazioni/page.tsx`: fix try/catch deleteRuolo

### Fix ruoli custom — redirect e visibilità dashboard (14 aprile 2026)
- `login/page.tsx`: ruoli non riconosciuti (custom) → `/dashboard/admin` invece di `/dashboard/genitore`; rimosso tipo hardcoded `Role`
- `admin/page.tsx`: voce "Utenti" inclusa sempre in `allItems`, filtrata da `canSee('utenti')` come gli altri item (non più `user.role === 'admin'` hardcoded)
- `RuoloViewSet.get_permissions()`: GET aperto a tutti gli autenticati — fix "ruolo rimosso" per utenti custom che accedono a `/utenti`
- `RuoloViewSet.destroy()`: blocco esplicito su `ruolo.codice == 'admin'` oltre al flag `sistema`
- `impostazioni/page.tsx`: bottone elimina e guard `deleteRuolo` escludono `r.codice === 'admin'`

### Protezione account admin in Gestione Utenti (14 aprile 2026)
- `UtentePermission.has_object_permission()`: blocca PATCH/DELETE su utenti con `role='admin'` da parte di non-admin (403)
- `UserAdminViewSet.perform_create/perform_update()`: blocca assegnazione `role='admin'` da parte di non-admin (403)
- `utenti/page.tsx`:
  - `UtenteRow` riceve `currentRole`; nasconde bottoni Modifica/Disabilita per utenti admin se `currentRole !== 'admin'`
  - Dropdown ruoli esclude `admin` se `currentRole !== 'admin'`
  - Mostra badge 🛡️ Admin su utenti con `role='admin'`
  - Nome utente loggato (👤 nome) visibile in alto a destra nell'header della pagina

**File modificati:**
- `frontend/src/app/[locale]/login/page.tsx`
- `frontend/src/app/[locale]/dashboard/admin/page.tsx`
- `frontend/src/app/[locale]/dashboard/admin/utenti/page.tsx`
- `frontend/src/app/[locale]/dashboard/admin/impostazioni/page.tsx`
- `backend/apps/config/views.py`
- `backend/apps/users/views.py`

### Fix nome utente in Gestione Utenti (14 aprile 2026)
- `utenti/page.tsx`: nome loggato mostra `first_name` se presente, altrimenti `nomeRuolo(role)`; visibile appena `currentRole` è disponibile (non dipende da `currentName`)

### Portfolio digitale del bambino (14 aprile 2026)
- Nuova app Django `apps.portfolio` con 3 modelli:
  - `AnnoScolastico`: nome, data_inizio/fine, attivo, descrizione (gestione manuale — supporta anche "Campo Solare" o periodi speciali)
  - `Iscrizione`: bambino FK + anno FK + gruppo FK, `unique_together (bambino, anno)` — storico gruppo per anno
  - `MediaPortfolio`: anno FK, gruppo FK, file (MinIO), tipo foto/video, thumbnail (generata server-side), data, autore, soft-delete
- Thumbnail automatica: Pillow per foto (600px), ffmpeg per video (frame a 1s) — background thread
- `ffmpeg` aggiunto al `backend/Dockerfile`
- Permessi via `PermessoRuolo` risorsa 'portfolio': direttrice/coordinatrice/insegnante → CRUD; cuoca/genitore → solo leggi; custom → configurabile
- Migration `config/0008_add_portfolio_risorsa.py`: seed permessi per tutti i ruoli esistenti
- Visibilità genitori: filtra per coppie (anno, gruppo) dalle Iscrizioni dei propri figli — genitore con più figli vede l'unione
- Frontend staff/admin: header gradiente blu, selettore anno (pill), selettore gruppo (pill colorati), strip date scrollabile, drag-drop multi-file con barra progresso, gallery masonry CSS columns, lightbox con prev/next + download + info
- Frontend genitore: selettore figlio (se più figli), solo anni iscritti, strip date calda arancione, gallery masonry, lightbox warm con overlay sfumato
- Admin/direttrice: pulsante ⚙️ Anni per creare/visualizzare anni scolastici e periodi speciali
- Accesso admin alla pagina portfolio via `staff/portfolio` (stessa pagina condivisa — pattern Agenda/Calendario)

**File creati:**
- `backend/apps/portfolio/__init__.py`, `apps.py`, `admin.py`, `models.py`, `permissions.py`, `serializers.py`, `views.py`, `urls.py`
- `backend/apps/portfolio/migrations/0001_initial.py`, `migrations/__init__.py`
- `backend/apps/config/migrations/0008_add_portfolio_risorsa.py`
- `frontend/src/app/api/portfolio/anni/route.ts`
- `frontend/src/app/api/portfolio/anni/[id]/route.ts`
- `frontend/src/app/api/portfolio/iscrizioni/route.ts`
- `frontend/src/app/api/portfolio/media/route.ts`
- `frontend/src/app/api/portfolio/media/[id]/route.ts`
- `frontend/src/app/api/portfolio/media/giorni/route.ts`
- `frontend/src/app/[locale]/dashboard/staff/portfolio/page.tsx`
- `frontend/src/app/[locale]/dashboard/genitore/portfolio/page.tsx`

**File modificati:**
- `backend/sherazade/settings/base.py`: aggiunto `apps.portfolio` in LOCAL_APPS
- `backend/sherazade/urls.py`: aggiunto include apps.portfolio.urls
- `backend/Dockerfile`: aggiunto `ffmpeg`
- `backend/apps/config/models.py`: aggiunta risorsa 'portfolio' in RISORSE
- `frontend/src/app/[locale]/dashboard/staff/page.tsx`: aggiunto Portfolio in NAV_ITEMS
- `frontend/src/app/[locale]/dashboard/admin/page.tsx`: aggiunto PORTFOLIO_ITEM + bottone
- `frontend/src/app/[locale]/dashboard/genitore/page.tsx`: aggiunto Portfolio in NAV_ITEMS

## Ultimo Aggiornamento
Data: 14 aprile 2026
Completato: Portfolio digitale del bambino (upload foto/video per gruppo, iscrizioni storiche, thumbnail automatica, gallery masonry, lightbox)

### QR code check-in (14 aprile 2026)
- Nuovi modelli in `attendance`: `ConfigurazioneCheckin` (singleton, `qr_abilitato` bool) e `DailyQRCodeToken` (token UUID giornaliero, unico per data)
- Token generato con `secrets.token_urlsafe(32)` — valido solo per la giornata corrente
- 4 nuove action su `PresenzaViewSet`: `qr_config` (admin toggle), `qr_token` (staff genera/rinnova QR), `checkin_info` (genitore vede figli + stato), `perform_checkin` (registra arrivo o uscita in automatico)
- Logica auto: nessun record → crea con ora_arrivo; record senza uscita → imposta ora_uscita; entrambi → 409 Conflict
- Toggle admin: quando `qr_abilitato=False` il tab QR sparisce dalla vista staff, la pagina `/checkin` risponde 403
- Frontend: tab "📱 QR Check-in" aggiunto sia a `staff/presenze` che ad `admin/presenze`; logica estratta nel componente condiviso `src/components/TabQRCheckin.tsx`
- Permessi: `qr_config` GET richiede solo `check_permesso('presenze','leggi')` — permette allo staff di leggere la config; PATCH riservato ad Admin/Direttrice con check inside la view
- Pagina `/[locale]/checkin`: mobile-first, card per figlio, bottone dinamico Entrata/Uscita, feedback visivo immediato
- Middleware aggiornato: `/checkin` è protetto, salva `callbackUrl` nel redirect al login
- Login aggiornato: post-login redirect verso `callbackUrl` se presente (preserva token QR dopo autenticazione)
- Libreria `qrcode.react` installata nel frontend
- Migration: `attendance/0004_qr_checkin.py`

**File creati:**
- `backend/apps/attendance/migrations/0004_qr_checkin.py`
- `frontend/src/app/api/presenze/qrconfig/route.ts`
- `frontend/src/app/api/presenze/qrtoken/route.ts`
- `frontend/src/app/api/presenze/checkin/route.ts`
- `frontend/src/app/[locale]/checkin/page.tsx`

**File modificati:**
- `backend/apps/attendance/models.py`: aggiunti `ConfigurazioneCheckin` e `DailyQRCodeToken`
- `backend/apps/attendance/serializers.py`: aggiunti serializer per nuovi modelli
- `backend/apps/attendance/views.py`: 4 nuove action QR
- `backend/apps/attendance/permissions.py`: registrate nuove action
- `frontend/src/app/[locale]/dashboard/staff/presenze/page.tsx`: tab QR + tab switcher + toggle admin
- `frontend/src/middleware.ts`: protegge `/checkin` con callbackUrl
- `frontend/src/app/[locale]/login/page.tsx`: gestisce callbackUrl post-login

### Fix permessi e refactoring QR Check-in (15 aprile 2026)
- `backend/apps/attendance/permissions.py`: `qr_config` GET ora usa `check_permesso('presenze','leggi')` — fix 403 per staff non-admin
- `backend/apps/attendance/views.py`: check `role in (ADMIN, DIRETTRICE)` spostato dentro l'action per il PATCH
- `frontend/src/components/TabQRCheckin.tsx`: componente condiviso estratto dalla pagina staff
- `frontend/src/app/[locale]/dashboard/admin/presenze/page.tsx`: aggiunto tab "📱 QR Check-in"

### Notifiche Push PWA + Email (15 aprile 2026) — branch feature/notifiche
- Nuova app `apps.notifications` con modello `PushSubscription` (user, endpoint, p256dh, auth, unique_together)
- `push.py`: `send_push_to_users()` sincrona (chiamata dall'interno dei thread email) — auto-rimuove sottoscrizioni scadute (HTTP 404/410)
- VAPID keys via env: `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_ADMIN_EMAIL`
- Management command `generate_vapid_keys`: genera e stampa chiavi VAPID pronte per .env
- Integrazione push in `_invia_notifica_circolare` (messaggi) e `_invia_notifica_evento` (calendario) — stesso thread dell'email, sincrono
- Email refactored in calendario: separazione destinatari email vs destinatari push (per ID)
- `public/manifest.json`: PWA manifest con nome, tema viola, riferimenti icone
- `public/sw.js`: service worker push (showNotification + notificationclick con focus/openWindow)
- `PushNotificationProvider`: client component che registra SW, chiede permesso, sottoscrive con VAPID key da API, synca al server
- `layout.tsx`: aggiunto manifest meta, theme-color, apple-touch-icon, PushNotificationProvider
- API routes: `/api/notifiche/vapid-key` (legge VAPID_PUBLIC_KEY server-side), `/api/notifiche/subscribe`, `/api/notifiche/unsubscribe`
- docker-compose: `VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY:-}` passato al frontend

**Attivazione:**
1. Nel container backend: `python manage.py generate_vapid_keys` → copia le 3 var in .env
2. Aggiungere `VAPID_PUBLIC_KEY` al docker-compose.yml (o .env server)
3. Per email Gmail: aggiungere `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`, `EMAIL_HOST=smtp.gmail.com`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` al .env

**File creati:**
- `backend/apps/notifications/__init__.py`, `apps.py`, `admin.py`, `models.py`, `push.py`, `views.py`, `urls.py`
- `backend/apps/notifications/management/commands/generate_vapid_keys.py`
- `backend/apps/notifications/migrations/0001_initial.py`
- `frontend/public/manifest.json`, `frontend/public/sw.js`
- `frontend/src/components/PushNotificationProvider.tsx`
- `frontend/src/app/api/notifiche/vapid-key/route.ts`
- `frontend/src/app/api/notifiche/subscribe/route.ts`
- `frontend/src/app/api/notifiche/unsubscribe/route.ts`

**File modificati:**
- `backend/requirements.txt`: aggiunto `pywebpush>=2.0`
- `backend/sherazade/settings/base.py`: aggiunto `apps.notifications`, VAPID settings
- `backend/sherazade/urls.py`: aggiunto `apps.notifications.urls`
- `backend/apps/messaggi/views.py`: push integrato in `_invia_notifica_circolare`
- `backend/apps/calendario/views.py`: push integrato in `_invia_notifica_evento`
- `docker-compose.yml`: aggiunto `VAPID_PUBLIC_KEY` al frontend
- `frontend/src/app/[locale]/layout.tsx`: manifest + PWA meta + PushNotificationProvider

### Log Accessi GDPR (15 aprile 2026) — branch feature/log-accessi
- Nuova app `apps.audit` con modello `LogAccesso`: timestamp, utente FK (SET_NULL), utente_email+ruolo snapshot, azione (leggi/crea/modifica/elimina), risorsa, oggetto_id, dettagli, ip_address
- `LogAccessoMixin`: mixin DRF che sovrascrive list/retrieve/create/update/destroy → log asincrono in thread separato
- Mixin aggiunto alle ViewSet sensibili: `BambinoViewSet`, `FamigliaViewSet`, `DelegaRitiroViewSet`, `RegistroDiarioViewSet`, `MediaDiarioViewSet`, `PresenzaViewSet`, `ConsensoFotograficoViewSet`, `AllergiaIntolleranzaViewSet`, `RegistroPastoViewSet`, `MediaPortfolioViewSet`
- `LogAccessoViewSet`: read-only, solo admin/direttrice, filtri dal/al/risorsa/azione/utente, paginazione DRF
- `cleanup_log_accessi`: management command con guardia GDPR (minimo 6 mesi), usa `LOG_ACCESSI_RETENTION_MONTHS` da settings (default 12)
- `LOG_ACCESSI_RETENTION_MONTHS` aggiunto a settings/base.py
- Risorsa `audit` aggiunta a `PermessoRuolo.RISORSE` (migration `config/0009_add_audit_risorsa.py`): direttrice può leggere, tutti gli altri No
- Pagina admin `/dashboard/admin/log-accessi`: tabella filtrata, badge colorati per azione/ruolo, paginazione client, nota GDPR con comando cleanup
- Pulsante "🔍 Log Accessi" nella dashboard admin (visibile solo a `role=admin`)
- `_get_ip()`: estrae IP reale anche dietro nginx (X-Forwarded-For)

**Pianificazione operativa:**
- Aggiungere cron mensile: `0 3 1 * * cd /var/www/sherazade && docker compose exec -T backend python manage.py cleanup_log_accessi`

**File creati:**
- `backend/apps/audit/__init__.py`, `apps.py`, `admin.py`, `models.py`, `mixin.py`, `serializers.py`, `views.py`, `urls.py`
- `backend/apps/audit/management/commands/cleanup_log_accessi.py`
- `backend/apps/audit/migrations/0001_initial.py`
- `backend/apps/config/migrations/0009_add_audit_risorsa.py`
- `frontend/src/app/[locale]/dashboard/admin/log-accessi/page.tsx`
- `frontend/src/app/api/audit/route.ts`

**File modificati:**
- `backend/apps/children/views.py`, `diary/views.py`, `attendance/views.py`, `consents/views.py`, `meals/views.py`, `portfolio/views.py`: aggiunto `LogAccessoMixin`
- `backend/apps/config/models.py`: aggiunta risorsa `audit`
- `backend/sherazade/settings/base.py`: aggiunto `apps.audit`, `LOG_ACCESSI_RETENTION_MONTHS`
- `backend/sherazade/urls.py`: aggiunto `apps.audit.urls`
- `frontend/src/app/[locale]/dashboard/admin/page.tsx`: aggiunto pulsante Log Accessi

### Presenze insegnanti con QR dedicato (7 maggio 2026) — branch feature/qr-presenze-insegnanti
- Nuovo modello `PresenzaInsegnante` in `attendance`: `insegnante`, `data`, `ora_entrata`, `ora_uscita`, `registrato_da`, vincolo univoco (`insegnante`, `data`)
- Nuovo modello `DailyQRCodeTokenInsegnanti`: token giornaliero separato da quello genitori (`secrets.token_urlsafe(32)`)
- `ConfigurazioneCheckin`: aggiunto flag `qr_insegnanti_abilitato` per attivare/disattivare indipendentemente il QR staff
- Nuove action su `PresenzaViewSet`:
  - `insegnanti_giornata`: registro giornaliero insegnanti (admin/direttrice/coordinatrice = lista completa, insegnante = solo se stesso)
  - `qr_token_insegnanti`: GET/POST token QR insegnanti
  - `checkin_info_insegnanti`: stato timbratura odierna del membro staff autenticato
  - `perform_checkin_insegnanti`: timbratura automatica entrata/uscita (409 se giornata gia completa)
- UI staff/admin presenze:
  - nuovo tab `👩‍🏫 Insegnanti` con pannello `RegistroInsegnantiPanel`
  - tab `📱 QR Check-in` esteso con card separata per QR insegnanti (`TabQRCheckinInsegnanti`)
- Nuova pagina mobile-first `/[locale]/checkin-insegnanti` per timbratura personale via QR con callback login
- API routes Next.js aggiunte: `/api/presenze/qrtoken-insegnanti`, `/api/presenze/checkin-insegnanti`, `/api/presenze/insegnanti-giornata`
- Migration: `attendance/0005_presenze_insegnanti_qr.py`

### Anomalia pregressa risolta (7 maggio 2026)
- Presenze backend: i filtri ora supportano sia `gruppo` (ID) sia `sezione` (nome gruppo) in `get_queryset`, `giornata`, `non_arrivati`, `report_mensile`
- Fix di compatibilita con frontend storico che inviava `?sezione=<nome>`

**File creati:**
- `backend/apps/attendance/migrations/0005_presenze_insegnanti_qr.py`
- `frontend/src/app/api/presenze/qrtoken-insegnanti/route.ts`
- `frontend/src/app/api/presenze/checkin-insegnanti/route.ts`
- `frontend/src/app/api/presenze/insegnanti-giornata/route.ts`
- `frontend/src/app/[locale]/checkin-insegnanti/page.tsx`
- `frontend/src/components/TabQRCheckinInsegnanti.tsx`
- `frontend/src/components/RegistroInsegnantiPanel.tsx`

**File modificati:**
- `backend/apps/attendance/models.py`
- `backend/apps/attendance/serializers.py`
- `backend/apps/attendance/permissions.py`
- `backend/apps/attendance/views.py`
- `backend/apps/attendance/admin.py`
- `frontend/src/app/[locale]/dashboard/staff/presenze/page.tsx`
- `frontend/src/app/[locale]/dashboard/admin/presenze/page.tsx`

### Storico presenze insegnanti con assenze (8 maggio 2026)
- Modello `PresenzaInsegnante` esteso con campi `presente` (BooleanField default=True) e `motivo_assenza` (TextChoices: malattia/ferie/permesso/altro)
- **TextChoices per assenze**: `MotivoAssenza` con 4 opzioni — indipendenti dal `MotivoAssenza` di `Presenza` (bambini)
- Nuova action `storico_insegnanti`: GET lista storico insegnante (ultimi 60 record) + stats mese (giorni presenti/assenti/totale)
  - Admin/Direttrice possono visualizzare lo storico di un'altra insegnante passando `?insegnante_id=<id>`
  - Insegnante vede solo il proprio storico
- Nuova action `crea_assenza_insegnante`: POST da admin/direttrice per registrare manualmente assenze (non QR)
- Logica modificata in `perform_checkin_insegnanti`: blocca il QR check-in se `presente=False` (409 Conflict)
- Serializer `PresenzaInsegnanteSerializer`: aggiunto `motivo_assenza_display` (testo leggibile)
- Nuovo serializer `PresenzaInsegnanteWriteSerializer`: accetta `insegnante`, `data`, `presente`, `motivo_assenza`, `ora_entrata`, `ora_uscita`
- Migration `attendance/0006_presenze_insegnanti_assenze.py`: aggiunge i due campi a `PresenzaInsegnante`
- Frontend API proxy: `/api/presenze/storico-insegnanti?insegnante_id=<id>` (GET)
- Nuova pagina `/dashboard/staff/presenze/storico`: header gradiente grigio scuro, tabella con colonne data/entrata/uscita/stato, stats mese (totale/presenti/assenti box)
  - Pulsante "← Indietro" con link a `/dashboard/staff/presenze`
  - Badge verde "Presente", badge rosso "Assente (motivo)"
  - Formattazione date italiane (es. "gio, 8 mag 2026")
- Pulsante "📊 Storico" aggiunto al header della pagina `dashboard/staff/presenze/page.tsx` (pill style, accanto a "← Dashboard")

**File creati:**
- `backend/apps/attendance/migrations/0006_presenze_insegnanti_assenze.py`
- `frontend/src/app/api/presenze/storico-insegnanti/route.ts`
- `frontend/src/app/[locale]/dashboard/staff/presenze/storico/page.tsx`

**File modificati:**
- `backend/apps/attendance/models.py`: aggiunto `MotivoAssenza` TextChoices e campi `presente`, `motivo_assenza` a `PresenzaInsegnante`; aggiornato `__str__`
- `backend/apps/attendance/serializers.py`: aggiunto `PresenzaInsegnanteWriteSerializer`, aggiornato `PresenzaInsegnanteSerializer` con `presente`, `motivo_assenza`, `motivo_assenza_display`
- `backend/apps/attendance/views.py`: aggiunto import `PresenzaInsegnanteWriteSerializer`; nuove action `storico_insegnanti` e `crea_assenza_insegnante`; logica modificata in `perform_checkin_insegnanti` per bloccare checkin se assente
- `frontend/src/app/[locale]/dashboard/staff/presenze/page.tsx`: aggiunto pulsante "📊 Storico" nel header

### Admin presenze insegnanti — storico completo + assenze da UI (8 maggio 2026)
- Dashboard admin `/dashboard/admin/presenze` tab `👩‍🏫 Presenze insegnanti` potenziato con pannello unico:
  - Registro giornaliero insegnanti con selettore data (riusa `RegistroInsegnantiPanel`)
  - Selettore insegnante (dropdown) con caricamento storico dedicato
  - Stats mese corrente per insegnante selezionata (presenti/assenti/totale)
  - Tabella storico con stato e motivazione assenza
  - Form admin per registrare assenze manuali direttamente da UI (data + motivo)
- API route Next.js `storico-insegnanti` estesa:
  - `GET` con query params verso `/api/v1/presenze/storico-insegnanti/`
  - `POST` verso `/api/v1/presenze/crea-assenza-insegnante/` con refresh cookie automatico
- Refactor tab admin insegnanti: da solo `RegistroInsegnantiPanel` a nuovo componente `AdminInsegnantiPanel`

**File creati:**
- `frontend/src/components/AdminInsegnantiPanel.tsx`

**File modificati:**
- `frontend/src/app/[locale]/dashboard/admin/presenze/page.tsx`
- `frontend/src/app/api/presenze/storico-insegnanti/route.ts`

### Presenze insegnanti manuali complete + fix POST (8 maggio 2026)
- Backend `attendance/views.py`: nuova action `salva_insegnante_manuale` (`POST /api/v1/presenze/salva-insegnante-manuale/`) per creare/aggiornare manualmente record insegnante per una data
  - Supporta sia `presente=True` (con `ora_entrata`/`ora_uscita`) sia `presente=False` (con `motivo_assenza`)
  - Upsert su `(insegnante, data)` per correggere facilmente dimenticanze senza duplicati
  - Se assente, azzera automaticamente gli orari; se presente, pulisce `motivo_assenza`
- Frontend API: nuova route `/api/presenze/insegnanti-manuale` (`POST`) che proxya al backend con refresh cookie automatico
- UI admin `AdminInsegnantiPanel` migliorata:
  - Form unico "Inserisci / modifica manualmente" con data + toggle Presente/Assente
  - Se Presente: campi ora entrata/uscita
  - Se Assente: dropdown motivo assenza
  - Prefill automatico dei campi se esiste già un record per la data selezionata
- Bugfix: flusso "Segna assente" con motivo `Altro` ora passa da endpoint manuale dedicato e non dipende più dal POST sulla route storico
- UX fix: uniformate dimensioni controlli (`input`/`select`/`time`) con stile condiviso per coerenza visiva

**File creati:**
- `frontend/src/app/api/presenze/insegnanti-manuale/route.ts`

**File modificati:**
- `backend/apps/attendance/views.py`
- `frontend/src/components/AdminInsegnantiPanel.tsx`

### Hardening errore "Impossibile salvare la presenza manuale" (8 maggio 2026)
- `frontend/src/app/api/presenze/insegnanti-manuale/route.ts`:
  - parsing robusto della risposta backend (anche non-JSON)
  - fallback compatibilità per assenze su endpoint legacy `/api/v1/presenze/crea-assenza-insegnante/` se il nuovo endpoint manuale non è ancora deployato (404/405)
  - messaggio esplicito per presenze manuali quando il backend non è allineato: "Backend non aggiornato... ricostruisci anche backend"
- `frontend/src/components/AdminInsegnantiPanel.tsx`:
  - visualizzazione dettagli errore backend reale (no più fallback generico)
  - messaggi HTTP più chiari durante il salvataggio manuale

### UX fix form manuale insegnanti + diagnostica HTTP 400 (8 maggio 2026)
- `AdminInsegnantiPanel`:
  - aggiunti pulsanti `📅` accanto ai campi data per aprire esplicitamente il date picker anche su Safari
  - uniformate larghezze dei controlli (`date`, `time`, `select`) con costante condivisa `CONTROL_WIDTH`
  - dropdown motivo assenza ora ha la stessa larghezza del campo data/ora
  - parsing intelligente degli errori DRF (`field: errore`) invece del solo fallback `Errore HTTP 400`
- `insegnanti-manuale/route.ts`:
  - risposta 503 include ora anche il messaggio errore catturato lato route Next per debug più rapido

## Ultimo Aggiornamento
Data: 11 maggio 2026 (aggiornato)
Completato: Reset password via email + Cambio password utente

### Reset password via email + Cambio password (11 maggio 2026) — branch feature/reset-password
- `PasswordResetToken` model: user FK, token CharField(64) unique, creato_at, usato BooleanField
- `PasswordResetRequestView`: rate-limited (5/10min), risponde sempre 200 (no user enumeration), crea token con `secrets.token_urlsafe(32)`, invia email in background thread
- `PasswordResetConfirmView`: valida token (non usato, ≤1h), chiama `set_password()`, marca usato
- `ChangePasswordView`: richiede autenticazione, verifica password attuale con `authenticate()`, poi `set_password()`
- Token scade dopo 1 ora; vecchi token dello stesso utente vengono invalidati prima di crearne uno nuovo
- Frontend pagina pubblica `/reset-password`: form email → stato "link inviato"
- Frontend pagina pubblica `/reset-password/confirm?token=XXX`: form nuova/conferma password → redirect login
- Frontend pagina protetta `/dashboard/change-password`: form password attuale + nuova + conferma
- `UserChip` dropdown: aggiunto link "🔑 Cambia password" sopra il pulsante Esci
- Login page: aggiunto link "Password dimenticata?" → `/reset-password`
- Migration `users/0005_password_reset_token.py`

**File creati:**
- `backend/apps/users/migrations/0005_password_reset_token.py`
- `frontend/src/app/api/auth/password-reset/route.ts`
- `frontend/src/app/api/auth/password-reset/confirm/route.ts`
- `frontend/src/app/api/auth/change-password/route.ts`
- `frontend/src/app/[locale]/reset-password/page.tsx`
- `frontend/src/app/[locale]/reset-password/confirm/page.tsx`
- `frontend/src/app/[locale]/dashboard/change-password/page.tsx`

**File modificati:**
- `backend/apps/users/models.py`: aggiunto `PasswordResetToken`
- `backend/apps/users/views.py`: aggiunte 3 view + helper email
- `backend/apps/users/urls.py`: aggiunti 3 path
- `frontend/src/app/[locale]/login/page.tsx`: link "Password dimenticata?"
- `frontend/src/components/UserChip.tsx`: link "Cambia password" nel dropdown

**File creati:**
- `backend/apps/diary/management/__init__.py`
- `backend/apps/diary/management/commands/__init__.py`
- `backend/apps/diary/management/commands/cleanup_media_diario.py`
- `backend/apps/portfolio/management/__init__.py`
- `backend/apps/portfolio/management/commands/__init__.py`
- `backend/apps/portfolio/management/commands/cleanup_media_portfolio.py`

**File modificati:**
- `backend/sherazade/settings/base.py`: aggiunto `MEDIA_PORTFOLIO_DELETE_DAYS` (default 1825 giorni / 5 anni)
- `frontend/src/app/[locale]/dashboard/admin/impostazioni/page.tsx`: aggiunto tab `🔐 GDPR` con sezioni per ogni variabile retention e crontab suggerito

**Cron da configurare sul server:**
```
0 2 * * * cd /var/www/sherazade && docker compose exec -T backend python manage.py cleanup_media_diario
0 3 1 * * cd /var/www/sherazade && docker compose exec -T backend python manage.py cleanup_media_portfolio
30 3 1 * * cd /var/www/sherazade && docker compose exec -T backend python manage.py cleanup_log_accessi
```

### Fix URL email reset password (13 maggio 2026)
- `docker-compose.yml`: `NEXTAUTH_URL=http://159.69.9.230:3000` → `http://159.69.9.230` (rimossa porta interna Docker)
- `frontend/src/app/api/auth/password-reset/route.ts`: usa `process.env.NEXTAUTH_URL` come URL pubblico invece di `request.nextUrl.origin` (che restituiva la porta interna 3000)
- Funzionalità testata e funzionante in produzione: reset password, conferma token, cambio password da UserChip

## Ultimo Aggiornamento
Data: 13 maggio 2026
Completato: Reset password via email + Cambio password — testato e deployato in produzione

Prossimo task: HTTPS + Nginx (in attesa dominio) oppure 2FA

### 2FA TOTP (13 maggio 2026)
- `TwoFactorSetupView` (GET + POST): genera secret + QR provisioning URI firmato con `django.core.signing` (salt `2fa-setup`, 10 min) — stateless, nessun salvataggio nel DB fino alla conferma
- `TwoFactorDisableView` (POST): verifica password attuale → imposta `two_factor_enabled=False` e `two_factor_secret=''`
- `TwoFactorVerifyLoginView` (POST): step 2 del login — verifica TOTP dal `totp_session` firmato (salt `2fa-login`, 5 min), restituisce JWT; rate-limited 10/5min
- `LoginView` modificata: se `user.two_factor_enabled` restituisce `{totp_required: true, totp_session: signed}` invece dei JWT
- Frontend login: se risposta ha `totp_required=True` → switcha a form TOTP con input numerico monospace; link "Torna al login" per annullare
- Frontend pagina `/dashboard/sicurezza`: stato 2FA, attivazione con QR code (`QRCodeSVG` da `qrcode.react`) + input codice, disattivazione con password; sezione link "Cambia password"
- `UserChip` dropdown: aggiunto link "🔐 Sicurezza" sopra "🔑 Cambia password"
- API routes Next.js: `GET/POST /api/auth/2fa/setup`, `POST /api/auth/2fa/verify`, `POST /api/auth/2fa/disable`
- Fix TypeScript: route 2FA usano pattern `{ res, newAccessToken } = await fetchBackend(...)` con `NextResponse.json(data, { status })` per compatibilità con il tipo di ritorno di Next.js
- Fix login route: `totp_required` non veniva passato al frontend (route costruiva risposta con solo `role`+`user`)
- Fix cookie 2FA verify: `secure: process.env.NODE_ENV === 'production'` → `secure: false` tramite `COOKIE_OPTIONS` condiviso — cookie `secure` su HTTP venivano scartati dal browser in silenzio

**File creati:**
- `backend/apps/users/views.py`: aggiunte `TwoFactorSetupView`, `TwoFactorDisableView`, `TwoFactorVerifyLoginView`
- `frontend/src/app/api/auth/2fa/setup/route.ts`
- `frontend/src/app/api/auth/2fa/verify/route.ts`
- `frontend/src/app/api/auth/2fa/disable/route.ts`
- `frontend/src/app/[locale]/dashboard/sicurezza/page.tsx`

**File modificati:**
- `backend/apps/users/views.py`: `LoginView.post()` con step 2FA
- `backend/apps/users/urls.py`: aggiunti 3 path `2fa/setup/`, `2fa/verify/`, `2fa/disable/`
- `frontend/src/app/[locale]/login/page.tsx`: step TOTP condizionale
- `frontend/src/components/UserChip.tsx`: link "🔐 Sicurezza"

## Ultimo Aggiornamento
Data: 13 maggio 2026
Completato: Manutenzione — cron jobs verificati e funzionanti, logrotate configurato per log sherazade (settimanale, 8 settimane), warning `version` rimosso da docker-compose.yml

**Stato cron jobs sul server:**
- `0 2 * * *` → `cleanup_media_diario` → `/var/log/sherazade-cleanup.log`
- `0 3 1 * *` → `cleanup_media_portfolio` → `/var/log/sherazade-cleanup.log`
- `30 3 1 * *` → `cleanup_log_accessi` → `/var/log/sherazade-cleanup.log`
- `*/10 * * * *` → `monitor.sh` (disco/RAM/container) → `/var/log/sherazade_monitor.log`
- logrotate weekly: `/etc/logrotate.d/sherazade` (8 rotazioni, compresso)

Prossimo task: Backup offsite
