from django.conf import settings
from django.db import models


def _media_upload_path(instance, filename):
    return f'diario/{instance.registro.bambino_id}/{instance.registro.data}/{filename}'


class TagCosaPortare(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    creato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='tags_creati',
    )
    attivo = models.BooleanField(default=True)
    creato_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Tag Cosa Portare'
        verbose_name_plural = 'Tag Cosa Portare'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class RegistroDiario(models.Model):

    class Umore(models.TextChoices):
        FELICE = 'felice', 'Felice 😊'
        SERENO = 'sereno', 'Sereno 🙂'
        STANCO = 'stanco', 'Stanco 😴'
        AGITATO = 'agitato', 'Agitato 😤'
        TRISTE = 'triste', 'Triste 😢'

    bambino = models.ForeignKey(
        'children.Bambino',
        on_delete=models.CASCADE,
        related_name='registri_diario',
    )
    data = models.DateField()
    autore = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='registri_compilati',
    )
    umore = models.CharField(
        max_length=10,
        choices=Umore.choices,
        blank=True,
    )
    attivita_descrizione = models.TextField(blank=True)
    note_giornata = models.TextField(blank=True)
    # Sonno
    sonno_mattina_inizio = models.TimeField(null=True, blank=True)
    sonno_mattina_fine = models.TimeField(null=True, blank=True)
    sonno_pomeriggio_inizio = models.TimeField(null=True, blank=True)
    sonno_pomeriggio_fine = models.TimeField(null=True, blank=True)
    # Popò
    popo = models.BooleanField(default=False)
    # Cosa portare domani
    tags_cosa_portare = models.ManyToManyField(
        TagCosaPortare,
        blank=True,
        related_name='registri',
    )
    creato_at = models.DateTimeField(auto_now_add=True)
    aggiornato_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Registro Diario'
        verbose_name_plural = 'Registri Diario'
        unique_together = [('bambino', 'data')]
        ordering = ['-data', 'bambino__cognome', 'bambino__nome']

    def __str__(self):
        return f'{self.bambino} — {self.data}'


class MediaDiario(models.Model):

    class Tipo(models.TextChoices):
        FOTO = 'foto', 'Foto'
        VIDEO = 'video', 'Video'

    registro = models.ForeignKey(
        RegistroDiario,
        on_delete=models.CASCADE,
        related_name='media',
    )
    file = models.FileField(upload_to=_media_upload_path)
    tipo = models.CharField(max_length=5, choices=Tipo.choices, default=Tipo.FOTO)
    thumbnail = models.ImageField(
        upload_to='diario/thumbnails/',
        blank=True,
        null=True,
    )
    visibile_a_genitori = models.BooleanField(default=True)
    caricato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='media_caricati',
    )
    creato_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Media Diario'
        verbose_name_plural = 'Media Diario'
        ordering = ['creato_at']

    def __str__(self):
        return f'{self.tipo} — {self.registro}'
