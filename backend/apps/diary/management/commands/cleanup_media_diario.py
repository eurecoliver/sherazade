"""
Elimina i media del diario (foto e video) più vecchi di MEDIA_AUTO_DELETE_DAYS giorni.

Strategia GDPR:
- Cancella il file fisico da MinIO/filesystem
- Cancella il record DB (cascade su thumbnail)
- Logga il conteggio eliminato per audit trail

Default: 365 giorni (configurabile via MEDIA_AUTO_DELETE_DAYS in .env)

Utilizzo:
    python manage.py cleanup_media_diario
    python manage.py cleanup_media_diario --giorni 180
    python manage.py cleanup_media_diario --dry-run

Da pianificare come cron notturno sul server:
    0 2 * * * cd /var/www/sherazade && docker compose exec -T backend python manage.py cleanup_media_diario
"""
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


RETENTION_MINIMA_GIORNI = 30  # Minimo assoluto: 30 giorni


class Command(BaseCommand):
    help = 'Elimina i media del diario GDPR più vecchi del periodo di retention configurato'

    def add_arguments(self, parser):
        parser.add_argument(
            '--giorni',
            type=int,
            default=None,
            help=f'Giorni di retention (minimo {RETENTION_MINIMA_GIORNI}). Default: MEDIA_AUTO_DELETE_DAYS da settings.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostra cosa verrebbe eliminato senza cancellare nulla.',
        )

    def handle(self, *args, **options):
        from apps.diary.models import MediaDiario

        giorni = options.get('giorni') or getattr(settings, 'MEDIA_AUTO_DELETE_DAYS', 365)
        dry_run = options.get('dry_run', False)

        if giorni < RETENTION_MINIMA_GIORNI:
            raise CommandError(
                f'Retention minima: {RETENTION_MINIMA_GIORNI} giorni. '
                f'Valore fornito ({giorni}) non consentito.'
            )

        cutoff = timezone.now() - timedelta(days=giorni)
        qs = MediaDiario.objects.filter(creato_at__lt=cutoff).select_related('registro')

        count = qs.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS(
                f'Nessun media diario da eliminare (retention: {giorni} giorni).'
            ))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'[DRY-RUN] Verrebbero eliminati {count} media diario '
                f'precedenti al {cutoff.strftime("%d/%m/%Y")} (retention: {giorni} giorni).'
            ))
            for m in qs[:20]:
                self.stdout.write(f'  - [{m.tipo}] {m.registro.bambino} — {m.registro.data} — {m.file.name}')
            if count > 20:
                self.stdout.write(f'  ... e altri {count - 20}')
            return

        # Elimina file fisici + record DB
        eliminati = 0
        errori = 0
        for media in qs:
            try:
                # Elimina file principale
                if media.file:
                    media.file.delete(save=False)
                # Elimina thumbnail
                if media.thumbnail:
                    media.thumbnail.delete(save=False)
                media.delete()
                eliminati += 1
            except Exception as e:
                errori += 1
                self.stderr.write(f'Errore eliminazione media {media.pk}: {e}')

        self.stdout.write(self.style.SUCCESS(
            f'Eliminati {eliminati} media diario precedenti al {cutoff.strftime("%d/%m/%Y")} '
            f'(retention: {giorni} giorni).'
            + (f' Errori: {errori}.' if errori else '')
        ))
