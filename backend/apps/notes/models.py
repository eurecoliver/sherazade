from datetime import date

from django.conf import settings
from django.db import models


class NotaGiornata(models.Model):
    """
    Nota condivisa tra staff per la giornata corrente.
    Funge da agenda/diario di turno visibile a tutti gli operatori.
    """
    testo = models.TextField(verbose_name='Testo nota')
    data = models.DateField(default=date.today, db_index=True, verbose_name='Data')
    autore = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='note_giornata',
        verbose_name='Autore',
    )
    gruppo = models.ForeignKey(
        'config.Gruppo',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='note_giornata',
        verbose_name='Gruppo (null = tutti)',
    )
    creato_at = models.DateTimeField(auto_now_add=True)
    aggiornato_at = models.DateTimeField(auto_now=True)
    attivo = models.BooleanField(default=True, verbose_name='Attivo (soft-delete)')

    class Meta:
        verbose_name = 'Nota giornata'
        verbose_name_plural = 'Note giornata'
        ordering = ['-creato_at']
        indexes = [
            models.Index(fields=['data', 'attivo']),
        ]

    def __str__(self):
        gruppo = self.gruppo.nome if self.gruppo else 'Tutti'
        return f'{self.data} [{gruppo}] — {self.autore}: {self.testo[:40]}'
