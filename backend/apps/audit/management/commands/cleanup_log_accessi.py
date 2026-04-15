"""
Elimina i log accessi più vecchi di N mesi (default: configurabile via LOG_ACCESSI_RETENTION_MONTHS).
Retention minima GDPR: 6 mesi. Non scende mai sotto questo limite.

Utilizzo:
    python manage.py cleanup_log_accessi
    python manage.py cleanup_log_accessi --mesi 12

Da pianificare come cron mensile sul server:
    0 3 1 * * cd /var/www/sherazade && docker compose exec -T backend python manage.py cleanup_log_accessi
"""
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


RETENTION_MINIMA_MESI = 6  # GDPR: mai sotto 6 mesi


class Command(BaseCommand):
    help = 'Elimina i log accessi GDPR più vecchi del periodo di retention configurato'

    def add_arguments(self, parser):
        parser.add_argument(
            '--mesi',
            type=int,
            default=None,
            help='Mesi di retention (minimo 6 per GDPR). Default: LOG_ACCESSI_RETENTION_MONTHS da settings.',
        )

    def handle(self, *args, **options):
        from apps.audit.models import LogAccesso

        mesi = options.get('mesi') or getattr(settings, 'LOG_ACCESSI_RETENTION_MONTHS', 6)

        if mesi < RETENTION_MINIMA_MESI:
            raise CommandError(
                f'Retention minima GDPR: {RETENTION_MINIMA_MESI} mesi. '
                f'Valore fornito ({mesi}) non consentito.'
            )

        # Approssimazione: 1 mese = 30.44 giorni
        giorni = int(mesi * 30.44)
        cutoff = timezone.now() - timedelta(days=giorni)

        count = LogAccesso.objects.filter(timestamp__lt=cutoff).count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS(f'Nessun log da eliminare (retention: {mesi} mesi).'))
            return

        LogAccesso.objects.filter(timestamp__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(
            f'Eliminati {count} log accessi precedenti al {cutoff.strftime("%d/%m/%Y")} '
            f'(retention: {mesi} mesi).'
        ))
