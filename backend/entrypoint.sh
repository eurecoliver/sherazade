#!/bin/bash
set -e

echo "Running database migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

if [ "$DJANGO_DEBUG" = "False" ]; then
    echo "Collecting static files..."
    python manage.py collectstatic --noinput
fi

echo "Starting application..."
exec "$@"
