from django.conf import settings
from django.db import models


class Gruppo(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    colore = models.CharField(max_length=7, default='#6B7280')
    ordine = models.PositiveSmallIntegerField(default=0)
    attivo = models.BooleanField(default=True)
    creato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='gruppi_creati',
    )
    creato_il = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Gruppo'
        verbose_name_plural = 'Gruppi'
        ordering = ['ordine', 'nome']

    def __str__(self):
        return self.nome


class OrarioUscita(models.Model):
    etichetta = models.CharField(max_length=100, unique=True)
    orario = models.TimeField()
    attivo = models.BooleanField(default=True)
    ordine = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = 'Orario di uscita'
        verbose_name_plural = 'Orari di uscita'
        ordering = ['ordine', 'orario']

    def __str__(self):
        return f'{self.etichetta} ({self.orario})'
