import os
import subprocess
import tempfile
import uuid
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import models


class AnnoScolastico(models.Model):
    nome = models.CharField(max_length=100, unique=True, verbose_name='Nome anno')
    data_inizio = models.DateField(verbose_name='Data inizio')
    data_fine = models.DateField(verbose_name='Data fine')
    attivo = models.BooleanField(default=False, verbose_name='Anno corrente')
    descrizione = models.TextField(blank=True, default='', verbose_name='Note (es. Campo solare)')
    creato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='anni_scolastici_creati',
    )
    creato_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Anno scolastico'
        verbose_name_plural = 'Anni scolastici'
        ordering = ['-data_inizio']

    def __str__(self):
        return self.nome


class Iscrizione(models.Model):
    """Traccia in quale gruppo era un bambino per ogni anno scolastico."""
    bambino = models.ForeignKey(
        'children.Bambino',
        on_delete=models.CASCADE,
        related_name='iscrizioni',
        verbose_name='Bambino',
    )
    anno = models.ForeignKey(
        AnnoScolastico,
        on_delete=models.CASCADE,
        related_name='iscrizioni',
        verbose_name='Anno scolastico',
    )
    gruppo = models.ForeignKey(
        'config.Gruppo',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='iscrizioni',
        verbose_name='Gruppo',
    )

    class Meta:
        verbose_name = 'Iscrizione'
        verbose_name_plural = 'Iscrizioni'
        unique_together = [('bambino', 'anno')]

    def __str__(self):
        return f'{self.bambino} — {self.anno}'


def _media_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    unique = uuid.uuid4().hex
    anno = instance.anno_id or 'x'
    gruppo = instance.gruppo_id or 'x'
    data = instance.data or 'x'
    return f'portfolio/{anno}/{gruppo}/{data}/{unique}{ext}'


def _thumb_upload_path(instance, filename):
    anno = instance.anno_id or 'x'
    gruppo = instance.gruppo_id or 'x'
    data = instance.data or 'x'
    return f'portfolio/{anno}/{gruppo}/{data}/thumb_{filename}'


class MediaPortfolio(models.Model):
    TIPO_FOTO = 'foto'
    TIPO_VIDEO = 'video'
    TIPO_CHOICES = [
        (TIPO_FOTO, 'Foto'),
        (TIPO_VIDEO, 'Video'),
    ]

    anno = models.ForeignKey(
        AnnoScolastico,
        on_delete=models.CASCADE,
        related_name='media',
        verbose_name='Anno scolastico',
    )
    gruppo = models.ForeignKey(
        'config.Gruppo',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='media_portfolio',
        verbose_name='Gruppo',
    )
    file = models.FileField(upload_to=_media_upload_path, verbose_name='File')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, verbose_name='Tipo')
    thumbnail = models.ImageField(
        upload_to=_thumb_upload_path,
        null=True, blank=True,
        verbose_name='Thumbnail',
    )
    data = models.DateField(db_index=True, verbose_name='Data')
    autore = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='media_portfolio_caricati',
        verbose_name='Caricato da',
    )
    descrizione = models.TextField(blank=True, default='', verbose_name='Descrizione')
    caricato_at = models.DateTimeField(auto_now_add=True)
    attivo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Media portfolio'
        verbose_name_plural = 'Media portfolio'
        ordering = ['data', 'caricato_at']
        indexes = [
            models.Index(fields=['anno', 'gruppo', 'data']),
            models.Index(fields=['data']),
        ]

    def __str__(self):
        return f'{self.tipo} — {self.data} — {self.gruppo}'

    def genera_thumbnail(self):
        """Genera thumbnail via Pillow (foto) o ffmpeg (video)."""
        if not self.file:
            return
        try:
            if self.tipo == self.TIPO_FOTO:
                self._thumb_da_foto()
            elif self.tipo == self.TIPO_VIDEO:
                self._thumb_da_video()
        except Exception:
            pass  # thumbnail opzionale

    def _thumb_da_foto(self):
        from PIL import Image
        self.file.open('rb')
        img = Image.open(self.file)
        img.thumbnail((600, 600), Image.LANCZOS)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        buf = BytesIO()
        img.save(buf, format='JPEG', quality=80)
        buf.seek(0)
        name = f'thumb_{uuid.uuid4().hex}.jpg'
        self.thumbnail.save(name, ContentFile(buf.read()), save=False)

    def _thumb_da_video(self):
        """Estrae il frame al secondo 1 con ffmpeg."""
        self.file.open('rb')
        video_data = self.file.read()

        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_in:
            tmp_in.write(video_data)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path + '_thumb.jpg'
        try:
            result = subprocess.run(
                [
                    'ffmpeg', '-y',
                    '-ss', '00:00:01',
                    '-i', tmp_in_path,
                    '-vframes', '1',
                    '-vf', 'scale=600:-1',
                    tmp_out_path,
                ],
                capture_output=True,
                timeout=30,
            )
            if result.returncode == 0 and os.path.exists(tmp_out_path):
                with open(tmp_out_path, 'rb') as f:
                    name = f'thumb_{uuid.uuid4().hex}.jpg'
                    self.thumbnail.save(name, ContentFile(f.read()), save=False)
        finally:
            for p in [tmp_in_path, tmp_out_path]:
                try:
                    os.unlink(p)
                except OSError:
                    pass
