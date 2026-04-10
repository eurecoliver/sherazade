from django.conf import settings
from django.db import models


class Circolare(models.Model):
    titolo = models.CharField(max_length=200, verbose_name='Titolo')
    testo = models.TextField(verbose_name='Testo')
    allegato = models.FileField(
        upload_to='circolari/%Y/%m/',
        null=True, blank=True,
        verbose_name='Allegato (PDF/immagine)',
    )
    autore = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='circolari_inviate',
        verbose_name='Autore',
    )
    gruppi = models.ManyToManyField(
        'config.Gruppo',
        blank=True,
        related_name='circolari',
        verbose_name='Gruppi destinatari (vuoto = tutti)',
    )
    pubblicata = models.BooleanField(
        default=False,
        verbose_name='Pubblicata',
        help_text='Se False è una bozza, visibile solo ad admin/direttrice.',
    )
    notifica_inviata = models.BooleanField(default=False, verbose_name='Email notifica inviata')
    creato_at = models.DateTimeField(auto_now_add=True, verbose_name='Data creazione')
    aggiornato_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Circolare'
        verbose_name_plural = 'Circolari'
        ordering = ['-creato_at']
        indexes = [
            models.Index(fields=['creato_at']),
            models.Index(fields=['pubblicata']),
        ]

    def __str__(self):
        stato = 'PUB' if self.pubblicata else 'BOZZA'
        return f'[{stato}] {self.titolo}'


class LetturaCircolare(models.Model):
    """Traccia quali genitori hanno aperto/letto una circolare."""
    circolare = models.ForeignKey(
        Circolare,
        on_delete=models.CASCADE,
        related_name='letture',
    )
    utente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='circolari_lette',
    )
    letto_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('circolare', 'utente')]
        verbose_name = 'Lettura circolare'
        verbose_name_plural = 'Letture circolari'

    def __str__(self):
        return f'{self.utente} → {self.circolare}'
