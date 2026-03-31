from django.conf import settings
from django.db import models


class AllergiaIntolleranza(models.Model):

    class Tipo(models.TextChoices):
        ALLERGIA = 'allergia', 'Allergia'
        INTOLLERANZA = 'intolleranza', 'Intolleranza'
        PREF_RELIGIOSA = 'preferenza_religiosa', 'Preferenza religiosa'
        ALTRO = 'altro', 'Altro'

    class Gravita(models.TextChoices):
        LIEVE = 'lieve', 'Lieve'
        MODERATA = 'moderata', 'Moderata'
        GRAVE = 'grave', 'Grave'
        ANAFILASSI = 'anafilassi', 'Anafilassi (rischio vita)'

    bambino = models.ForeignKey(
        'children.Bambino',
        on_delete=models.CASCADE,
        related_name='allergie',
    )
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    descrizione = models.CharField(max_length=200)
    gravita = models.CharField(max_length=12, choices=Gravita.choices, default=Gravita.LIEVE)
    note_mediche = models.TextField(blank=True)
    attivo = models.BooleanField(default=True)
    creato_il = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Allergia / Intolleranza'
        verbose_name_plural = 'Allergie / Intolleranze'
        ordering = ['-gravita', 'tipo', 'descrizione']

    def __str__(self):
        return f'{self.bambino} — {self.get_tipo_display()}: {self.descrizione} ({self.get_gravita_display()})'


class MenuGiornaliero(models.Model):
    data = models.DateField()
    sezione = models.CharField(max_length=50, blank=True)
    primo = models.CharField(max_length=200, blank=True)
    secondo = models.CharField(max_length=200, blank=True)
    contorno = models.CharField(max_length=200, blank=True)
    frutta = models.CharField(max_length=200, blank=True)
    merenda = models.CharField(max_length=200, blank=True)
    bibita = models.CharField(max_length=200, blank=True)
    inserito_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='menu_inseriti',
    )
    creato_il = models.DateTimeField(auto_now_add=True)
    aggiornato_il = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Menu Giornaliero'
        verbose_name_plural = 'Menu Giornalieri'
        unique_together = [('data', 'sezione')]
        ordering = ['-data', 'sezione']

    def __str__(self):
        sezione_str = f' — Sez. {self.sezione}' if self.sezione else ''
        return f'Menu {self.data}{sezione_str}'


class RegistroPasto(models.Model):

    class Quantita(models.TextChoices):
        TUTTO = 'tutto', 'Tutto 🍽️'
        META = 'meta', 'Metà 🍽️½'
        POCO = 'poco', 'Poco 🥄'
        NULLA = 'nulla', 'Nulla ❌'

    bambino = models.ForeignKey(
        'children.Bambino',
        on_delete=models.CASCADE,
        related_name='registri_pasto',
    )
    data = models.DateField()
    primo_quantita = models.CharField(
        max_length=6, choices=Quantita.choices, blank=True,
    )
    secondo_quantita = models.CharField(
        max_length=6, choices=Quantita.choices, blank=True,
    )
    contorno_quantita = models.CharField(
        max_length=6, choices=Quantita.choices, blank=True,
    )
    frutta_quantita = models.CharField(
        max_length=6, choices=Quantita.choices, blank=True,
    )
    merenda_quantita = models.CharField(
        max_length=6, choices=Quantita.choices, blank=True,
    )
    note_pasto = models.TextField(blank=True)
    compilato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='pasti_compilati',
    )
    creato_at = models.DateTimeField(auto_now_add=True)
    aggiornato_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Registro Pasto'
        verbose_name_plural = 'Registri Pasto'
        unique_together = [('bambino', 'data')]
        ordering = ['-data', 'bambino__cognome', 'bambino__nome']

    def __str__(self):
        return f'{self.bambino} — {self.data}'
