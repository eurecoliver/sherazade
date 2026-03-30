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
3. [ ] Consensi fotografici digitali (GDPR compliant)
4. [ ] Diario del bambino (foto/video giornalieri)
5. [ ] Diario alimentare (foglio pappe + allergie)
6. [ ] Registro presenze/assenze

## Funzionalità Post-MVP
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
- Avviare Claude Code: cd ~/repos/sherazade && claude

## Decisioni Tecniche

### Struttura progetto (30 marzo 2026)
- Settings Django split in `base.py` / `local.py` / `production.py` per separare ambienti
- `AUTH_USER_MODEL = 'users.User'` con campo `role` (TextChoices) impostato dalla prima migrazione — non cambiare dopo il primo deploy
- MinIO abilitato via flag `USE_S3` nelle settings (False in locale, True in produzione)
- JWT con `ROTATE_REFRESH_TOKENS=True` e blacklist attiva per sicurezza
- Frontend usa Next.js App Router con `[locale]` dynamic segment (next-intl v3)
- `next.config.mjs` con `output: 'standalone'` per Docker ottimizzato
- docker-compose.yml orientato allo sviluppo locale (runserver Django, next dev); produzione usa le stesse immagini con variabili diverse

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

## Ultimo Aggiornamento
Data: 30 marzo 2026
Data: 30 marzo 2026
Completato: feature/anagrafica — lista bambini, card, modal dettaglio, famiglia e deleghe di ritiro
Branch: mergiato su develop
Prossimo task: feature/consensi — gestione consensi fotografici GDPR
