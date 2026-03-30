from django.conf import settings
from django.db import models


class Bambino(models.Model):
    nome = models.CharField(max_length=100)
    cognome = models.CharField(max_length=100)
    data_nascita = models.DateField()
    codice_fiscale = models.CharField(max_length=16, unique=True, blank=True)
    foto_profilo = models.ImageField(upload_to='bambini/foto/', blank=True, null=True)
    sezione = models.CharField(max_length=50, blank=True)
    data_iscrizione = models.DateField()
    data_fine_iscrizione = models.DateField(null=True, blank=True)
    note_mediche = models.TextField(blank=True)
    attivo = models.BooleanField(default=True)
    non_fotografabile = models.BooleanField(default=False, verbose_name='Non fotografabile')
    creato_il = models.DateTimeField(auto_now_add=True)
    aggiornato_il = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Bambino'
        verbose_name_plural = 'Bambini'
        ordering = ['cognome', 'nome']

    def __str__(self):
        return f'{self.cognome} {self.nome}'


class Famiglia(models.Model):
    bambino = models.OneToOneField(
        Bambino,
        on_delete=models.CASCADE,
        related_name='famiglia',
    )
    genitore1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='figli_genitore1',
    )
    genitore2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='figli_genitore2',
        null=True,
        blank=True,
    )
    indirizzo = models.TextField(blank=True)
    telefono_emergenza = models.CharField(max_length=20)
    medico_base = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Famiglia'
        verbose_name_plural = 'Famiglie'

    def __str__(self):
        return f'Famiglia di {self.bambino}'


class DelegaRitiro(models.Model):
    bambino = models.ForeignKey(
        Bambino,
        on_delete=models.CASCADE,
        related_name='deleghe_ritiro',
    )
    nome_delegato = models.CharField(max_length=100)
    cognome_delegato = models.CharField(max_length=100)
    documento_identita = models.CharField(max_length=50)
    rapporto_familiare = models.CharField(max_length=100)
    attivo = models.BooleanField(default=True)
    creato_il = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Delega Ritiro'
        verbose_name_plural = 'Deleghe Ritiro'
        ordering = ['cognome_delegato', 'nome_delegato']

    def __str__(self):
        return f'{self.cognome_delegato} {self.nome_delegato} — {self.bambino}'
