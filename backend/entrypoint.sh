#!/bin/bash
set -e

echo "Running database migrations..."
python manage.py migrate --noinput

if [ "$DJANGO_DEBUG" = "False" ]; then
    echo "Collecting static files..."
    python manage.py collectstatic --noinput
fi

echo "Starting application..."
exec gunicorn sherazade.wsgi:application --bind 0.0.0.0:8000 --workers 2
