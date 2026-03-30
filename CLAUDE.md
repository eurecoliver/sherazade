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
1. [ ] Autenticazione multi-ruolo (Auth + JWT + 2FA)
2. [ ] Anagrafica bambini e famiglie
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

### Permessi entrypoint.sh (30 marzo 2026)
- `.gitattributes` nella radice garantisce `eol=lf` per `backend/entrypoint.sh` (Git non preserva il bit di esecuzione su Windows/Linux)
- `Dockerfile` usa `chmod +x /app/entrypoint.sh` con path assoluto dopo `COPY . .`
- Shebang `#!/bin/bash` invece di `#!/bin/sh` per compatibilità con le funzionalità bash usate

### Migrazione users.User (30 marzo 2026)
- `INSTALLED_APPS = LOCAL_APPS + DJANGO_APPS + THIRD_PARTY_APPS` — apps.users deve precedere django.contrib.admin per AUTH_USER_MODEL
- Migrazione iniziale `0001_initial.py` scritta a mano e committata nel repo (non generata a runtime)
- `entrypoint.sh` esegue `makemigrations users --noinput` prima di `migrate` come guardia per ambienti di sviluppo

## Ultimo Aggiornamento
Data: 30 marzo 2026
Completato: Fix permessi entrypoint.sh — bit esecuzione non preservato da Git su Linux/Docker
File creati/modificati:
- .gitattributes (nuovo — eol=lf per entrypoint.sh)
- backend/Dockerfile (chmod +x con path assoluto /app/entrypoint.sh)
- backend/entrypoint.sh (shebang #!/bin/bash)
- CLAUDE.md aggiornato
Prossimo task: Test avvio locale con Docker Compose
