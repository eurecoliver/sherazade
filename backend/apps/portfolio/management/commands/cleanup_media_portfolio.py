"""
Elimina i media del portfolio più vecchi di MEDIA_PORTFOLIO_DELETE_DAYS giorni
(o di N anni scolastici fa, se configurato diversamente).

Il portfolio ha retention più lunga del diario: i ricordi annuali
vengono tipicamente conservati per l'intera durata della frequenza
del bambino + qualche anno. Default: 5 anni (1825 giorni).

Utilizzo:
    python manage.py cleanup_media_portfolio
    python manage.py cleanup_media_portfolio --giorni 730
    python manage.py cleanup_media_portfolio --dry-run

Da pianificare come cron mensile sul server:
    0 3 1 * * cd /var/www/sherazade && docker compose exec -T backend python manage.py cleanup_media_portfolio
"""
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


RETENTION_MINIMA_GIORNI = 365  # Portfolio: minimo 1 anno


class Command(BaseCommand):
    help = 'Elimina i media del portfolio più vecchi del periodo di retention configurato'

    def add_arguments(self, parser):
        parser.add_argument(
            '--giorni',
            type=int,
            default=None,
            help=f'Giorni di retention (minimo {RETENTION_MINIMA_GIORNI}). Default: MEDIA_PORTFOLIO_DELETE_DAYS da settings.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostra cosa verrebbe eliminato senza cancellare nulla.',
        )

    def handle(self, *args, **options):
        from apps.portfolio.models import MediaPortfolio

        giorni = options.get('giorni') or getattr(settings, 'MEDIA_PORTFOLIO_DELETE_DAYS', 1825)
        dry_run = options.get('dry_run', False)

        if giorni < RETENTION_MINIMA_GIORNI:
            raise CommandError(
                f'Retention minima portfolio: {RETENTION_MINIMA_GIORNI} giorni. '
                f'Valore fornito ({giorni}) non consentito.'
            )

        cutoff = timezone.now() - timedelta(days=giorni)
        qs = MediaPortfolio.objects.filter(caricato_at__lt=cutoff)

        count = qs.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS(
                f'Nessun media portfolio da eliminare (retention: {giorni} giorni).'
            ))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'[DRY-RUN] Verrebbero eliminati {count} media portfolio '
                f'precedenti al {cutoff.strftime("%d/%m/%Y")} (retention: {giorni} giorni).'
            ))
            for m in qs[:20]:
                self.stdout.write(f'  - [{m.tipo}] {m.anno} — {m.gruppo} — {m.data} — {m.file.name}')
            if count > 20:
                self.stdout.write(f'  ... e altri {count - 20}')
            return

        eliminati = 0
        errori = 0
        for media in qs:
            try:
                if media.file:
                    media.file.delete(save=False)
                if media.thumbnail:
                    media.thumbnail.delete(save=False)
                media.delete()
                eliminati += 1
            except Exception as e:
                errori += 1
                self.stderr.write(f'Errore eliminazione media portfolio {media.pk}: {e}')

        self.stdout.write(self.style.SUCCESS(
            f'Eliminati {eliminati} media portfolio precedenti al {cutoff.strftime("%d/%m/%Y")} '
            f'(retention: {giorni} giorni).'
            + (f' Errori: {errori}.' if errori else '')
        ))
