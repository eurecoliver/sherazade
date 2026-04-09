from django.conf import settings
from django.db import models


class TipoEvento(models.Model):
    nome = models.CharField(max_length=80, unique=True, verbose_name='Nome tipo evento')
    colore = models.CharField(max_length=7, default='#6C5CE7', verbose_name='Colore hex')
    icona = models.CharField(max_length=10, default='📅', verbose_name='Emoji icona')
    attivo = models.BooleanField(default=True)
    creato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='tipi_evento_creati',
    )

    class Meta:
        verbose_name = 'Tipo evento'
        verbose_name_plural = 'Tipi evento'
        ordering = ['nome']

    def __str__(self):
        return f'{self.icona} {self.nome}'


class EventoCalendario(models.Model):
    titolo = models.CharField(max_length=200, verbose_name='Titolo')
    descrizione = models.TextField(blank=True, default='', verbose_name='Descrizione')
    tipo = models.ForeignKey(
        TipoEvento,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='eventi',
        verbose_name='Tipo evento',
    )
    data_inizio = models.DateField(db_index=True, verbose_name='Data inizio')
    data_fine = models.DateField(null=True, blank=True, verbose_name='Data fine')
    tutto_il_giorno = models.BooleanField(default=True, verbose_name='Tutto il giorno')
    ora_inizio = models.TimeField(null=True, blank=True, verbose_name='Ora inizio')
    ora_fine = models.TimeField(null=True, blank=True, verbose_name='Ora fine')
    chiusura_scolastica = models.BooleanField(
        default=False,
        verbose_name='Chiusura scolastica',
        help_text='Se True, il nido è chiuso. Integrato con registro presenze.',
    )
    gruppi = models.ManyToManyField(
        'config.Gruppo',
        blank=True,
        related_name='eventi_calendario',
        verbose_name='Gruppi (vuoto = tutti)',
    )
    notifica_inviata = models.BooleanField(default=False, verbose_name='Email notifica inviata')
    creato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='eventi_creati',
        verbose_name='Creato da',
    )
    creato_at = models.DateTimeField(auto_now_add=True)
    aggiornato_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Evento calendario'
        verbose_name_plural = 'Eventi calendario'
        ordering = ['data_inizio', 'ora_inizio']
        indexes = [
            models.Index(fields=['data_inizio']),
            models.Index(fields=['data_inizio', 'data_fine']),
        ]

    def __str__(self):
        return f'{self.data_inizio} — {self.titolo}'
