# Sherazade — Contesto Progetto

## Identità
Portale web open source gratuito per asilo nido privato Roma (~60 bambini).
GitHub: `eurecoliver/sherazade` | Server: `159.69.9.230` (Hetzner, Nuremberg 🇩🇪)
Cartella server: `/var/www/sherazade` | Deploy: `bash deploy.sh`

## Stack
- Frontend: Next.js 14+ TypeScript — **modalità PRODUZIONE** (`npm run build + npm start`) — ogni modifica richiede rebuild via deploy.sh
- Backend: Django REST Framework + Gunicorn
- DB: PostgreSQL 15
- Storage: MinIO (S3-compatible)
- Auth: JWT (SimpleJWT)
- Containerizzazione: Docker Compose
- OS: Ubuntu 24.04

## Variabili .env critiche (server)
```
MEDIA_EXTERNAL_BASE_URL=http://159.69.9.230:8000  # Per URL foto profilo
NEXTAUTH_URL=http://159.69.9.230:3000
NEXT_PUBLIC_API_URL=http://159.69.9.230:8000
```

## Architettura decisioni chiave

### Perché Next.js in produzione (non dev)
Dev mode compilava le pagine al primo accesso → 30s per pagina. Produzione → istantaneo.

### Perché MEDIA_EXTERNAL_BASE_URL
MinIO non è esposto pubblicamente. Le foto vengono servite tramite Django su porta 8000. Il serializer prepende questa URL al path relativo `/media/bambini/foto/...`.

### Perché deploy.sh
Git non preserva il bit esecuzione su `entrypoint.sh` → chmod falliva ad ogni deploy. deploy.sh esegue automaticamente `chmod +x backend/entrypoint.sh` prima di `docker compose up`.

### Perché Gunicorn invece di runserver
Django runserver è single-threaded e lento. Gunicorn con 2 worker gestisce richieste concorrenti.

### Perché Docker iptables=true (NON false)
Con `iptables: false` Docker non riesce a creare le reti interne → i container non comunicano. Il valore corretto è `true` (default). UFW blocca le porte esterne correttamente.

### Perché postgres senza porta esposta
BSI (ufficio sicurezza tedesco) ha notificato Hetzner che la porta 5432 era pubblica. Rimossa dal docker-compose — PostgreSQL raggiungibile solo internamente via nome servizio `db`.

## App Django
```
apps/users/      — User custom con 6 ruoli: admin, direttrice, coordinatrice, insegnante, cuoca, genitore
apps/children/   — Bambino, Famiglia, DelegalRitiro
apps/config/     — Gruppo (ex Sezione: Piccoli/Medi/Grandi/Classe Ponte), OrarioUscita
apps/consents/   — ConsensoFotografico per finalità (uso_interno, genitori_diretti, newsletter)
apps/diary/      — RegistroDiario, MediaDiario
apps/meals/      — AllergiaIntolleranza, MenuGiornaliero, RegistroPasto
apps/attendance/ — Presenza
```

## Ruoli e permessi pattern
- Admin/Direttrice: CRUD completo
- Coordinatrice/Insegnante: read + operazioni quotidiane
- Cuoca: read only lista presenti + allergie
- Genitore: read only proprio figlio

## Sicurezza implementata
- UFW: 22/80/443 open, tutto il resto bloccato (incluso 5432)
- SSH: solo chiave ed25519, password disabilitata (`PasswordAuthentication no`)
- Fail2ban: ban dopo 3 tentativi SSH falliti, durata 24h
- Rate limiting login: `django-ratelimit` max 5 tentativi/IP/5min → **ATTENZIONE: django-ratelimit deve essere in requirements.txt**
- DRF throttling: 100/h anonimo, 1000/h autenticato
- Backup: `/etc/cron.daily/sherazade-backup` → PostgreSQL dump notturno, 7 giorni retention in `/var/backups/sherazade/`
- HTTPS: **da fare** — richiede dominio definitivo

## Git Flow
```
main      → produzione stabile
develop   → integrazione
feature/* → sviluppo singole funzionalità
```
Branch corrente: `feature/v2-updates`

## Funzionalità completate ✅
1. Auth multi-ruolo (JWT, redirect per ruolo)
2. Anagrafica bambini (foto, alias, gruppo, orario uscita) + Famiglia
3. Consensi fotografici GDPR (granulari per finalità, semaforo visivo)
4. Diario bambino (foto/video, controllo consensi)
5. Diario alimentare pappe (menu, registro pasti, allergie)
6. Registro presenze/assenze
7. Gestione utenti CRUD (admin/direttrice)
8. Gruppi configurabili + Orari uscita configurabili
9. Anagrafica-v2 (foto profilo, alias, gruppi, dati famiglia completi)

## Bug noto da risolvere PRIMA di procedere
**`ModuleNotFoundError: No module named 'ratelimit'`**
Il backend crasha al restart perché `django-ratelimit` è importato in `apps/users/views.py` ma non è in `requirements.txt` nel branch `feature/v2-updates`.

**Fix immediato:**
1. Aggiungi `django-ratelimit` a `backend/requirements.txt`
2. Committa su `feature/v2-updates`
3. Push + `bash deploy.sh` sul server

## Prossimo task (feature/v2-updates)
Dopo il fix del ratelimit, implementare in un unico commit:

### PRESENZE-V2
- Aggiungi a `Presenza`: `ora_arrivo` (Time), `ora_uscita` (Time), `minuti_ritardo_arrivo` (auto-calcolato se arrivo > 09:00), `minuti_ritardo_uscita` (auto-calcolato se uscita > `OrarioUscita` del bambino)
- Frontend `staff/presenze`: time picker, badge ritardo arancione (arrivo) / rosso (uscita), mostra orario previsto come riferimento
- Frontend `admin/presenze`: colonne ritardo, evidenziazione colorata

### DIARIO-V2
- Aggiungi a `RegistroDiario`: `sonno_mattina_inizio/fine` (Time), `sonno_pomeriggio_inizio/fine` (Time), `popo` (boolean)
- Nuovo modello `TagCosaPortare`: nome, creato_da, attivo
- ManyToMany `RegistroDiario` ↔ `TagCosaPortare`
- Frontend `staff/diario`: time range picker sonno, toggle popò, tag "cosa portare" con possibilità di creare nuovi
- Frontend `genitore/diario`: mostra sonno, popò, tag

## Comandi utili
```bash
# Deploy server
cd /var/www/sherazade && bash deploy.sh

# SSH server
ssh root@159.69.9.230

# Claude Code locale
cd ~/repos/sherazade && claude

# Log backend
docker logs sherazade-backend-1 --tail 30

# Shell Django
docker exec -it sherazade-backend-1 python manage.py shell -c '...'

# Backup manuale
bash /etc/cron.daily/sherazade-backup
```

## Regola aggiornamento CLAUDE.md
Ad ogni task completato aggiornare CLAUDE.md con: funzionalità completata, file modificati, decisioni tecniche, prossimo task.
