#!/bin/bash
# monitor.sh — alert via email se qualcosa non va
# Cron suggerito: */10 * * * * bash /var/www/sherazade/monitor.sh >> /var/log/sherazade_monitor.log 2>&1

ALERT_EMAIL="${ALERT_EMAIL:-}"
PROJECT_DIR="/var/www/sherazade"
DISK_THRESHOLD=85   # % disco usata oltre la quale scatta alert
MEM_THRESHOLD=90    # % RAM usata

send_alert() {
    local subject="$1"
    local body="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: $subject"
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$body" | mail -s "[Sherazade] $subject" "$ALERT_EMAIL"
    fi
}

# --- Disco ---
DISK_USED=$(df / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
if [ "$DISK_USED" -ge "$DISK_THRESHOLD" ]; then
    send_alert "Disco quasi pieno (${DISK_USED}%)" \
        "Il disco del server ha raggiunto ${DISK_USED}% di utilizzo. Libera spazio o espandi il volume."
fi

# --- Memoria ---
MEM_USED=$(free | awk '/^Mem:/ {printf "%d", $3/$2*100}')
if [ "$MEM_USED" -ge "$MEM_THRESHOLD" ]; then
    send_alert "RAM quasi esaurita (${MEM_USED}%)" \
        "La RAM del server è al ${MEM_USED}% di utilizzo."
fi

# --- Container Docker ---
cd "$PROJECT_DIR" || exit 1
for SERVICE in backend frontend db; do
    STATUS=$(docker compose ps --status running --services 2>/dev/null | grep "^${SERVICE}$" || true)
    if [ -z "$STATUS" ]; then
        send_alert "Container $SERVICE non in esecuzione" \
            "Il container Docker '$SERVICE' risulta DOWN. Esegui: docker compose up -d $SERVICE"
    fi
done

# --- Health check backend ---
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8000/api/v1/health/ 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" != "200" ]; then
    send_alert "Backend non risponde (HTTP $HTTP_STATUS)" \
        "L'endpoint /api/v1/health/ ha risposto con HTTP $HTTP_STATUS invece di 200."
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK — disk:${DISK_USED}% mem:${MEM_USED}% http:${HTTP_STATUS}"
