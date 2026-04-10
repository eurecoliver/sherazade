from django.conf import settings
from django.db import models


class PermessoRuolo(models.Model):
    """Matrice permessi configurabile per ruolo × risorsa × azione."""

    RUOLI = [
        ('coordinatrice', 'Coordinatrice'),
        ('insegnante', 'Insegnante'),
        ('cuoca', 'Cuoca'),
        ('genitore', 'Genitore'),
    ]
    RISORSE = [
        ('bambini',    'Anagrafica bambini'),
        ('consensi',   'Consensi fotografici'),
        ('presenze',   'Presenze'),
        ('diario',     'Diario'),
        ('pappe',      'Pappe e menu'),
        ('circolari',  'Circolari'),
        ('calendario', 'Calendario'),
        ('agenda',     'Agenda note'),
        ('utenti',     'Gestione utenti'),
    ]
    AZIONI = [
        ('leggi',    'Visualizza'),
        ('scrivi',   'Crea e modifica'),
        ('elimina',  'Elimina'),
    ]

    ruolo     = models.CharField(max_length=30, choices=RUOLI)
    risorsa   = models.CharField(max_length=30, choices=RISORSE)
    azione    = models.CharField(max_length=10, choices=AZIONI)
    consentito = models.BooleanField(default=False)

    class Meta:
        unique_together = [('ruolo', 'risorsa', 'azione')]
        verbose_name = 'Permesso ruolo'
        verbose_name_plural = 'Permessi ruoli'
        ordering = ['ruolo', 'risorsa', 'azione']

    def __str__(self):
        stato = '✓' if self.consentito else '✗'
        return f'[{stato}] {self.ruolo} → {self.risorsa} → {self.azione}'


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
