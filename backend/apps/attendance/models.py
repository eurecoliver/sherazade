from django.conf import settings
from django.db import models


class Presenza(models.Model):

    class MotivoAssenza(models.TextChoices):
        MALATTIA = 'malattia', 'Malattia'
        FAMIGLIA = 'famiglia', 'Motivi familiari'
        VACANZA = 'vacanza', 'Vacanza'
        ALTRO = 'altro', 'Altro'

    bambino = models.ForeignKey(
        'children.Bambino',
        on_delete=models.CASCADE,
        related_name='presenze',
    )
    data = models.DateField()
    presente = models.BooleanField()
    ora_arrivo = models.TimeField(null=True, blank=True)
    ora_uscita = models.TimeField(null=True, blank=True)
    assenza_comunicata = models.BooleanField(
        default=False,
        verbose_name='Assenza comunicata dal genitore',
    )
    motivo_assenza = models.CharField(
        max_length=10,
        choices=MotivoAssenza.choices,
        blank=True,
    )
    note = models.TextField(blank=True)
    registrato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='presenze_registrate',
    )
    creato_at = models.DateTimeField(auto_now_add=True)
    aggiornato_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Presenza'
        verbose_name_plural = 'Presenze'
        ordering = ['-data', 'bambino__cognome', 'bambino__nome']

    def __str__(self):
        stato = 'Presente' if self.presente else 'Assente'
        return f'{self.bambino} — {self.data} ({stato})'
