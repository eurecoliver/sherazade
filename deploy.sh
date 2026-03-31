#!/bin/bash
set -e
echo "🚀 Deploy Sherazade..."
git stash 2>/dev/null || true
git pull
chmod +x backend/entrypoint.sh
docker compose down
docker compose up --build -d
echo "✅ Deploy completato!"
