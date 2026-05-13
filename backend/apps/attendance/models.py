import secrets
from datetime import datetime, time, date

from django.conf import settings
from django.db import models


class ConfigurazioneCheckin(models.Model):
    """Singleton — un solo record (id=1) per gestire le impostazioni globali del check-in."""
    qr_abilitato = models.BooleanField(default=True, verbose_name='QR Check-in abilitato')
    qr_insegnanti_abilitato = models.BooleanField(default=True, verbose_name='QR Check-in insegnanti abilitato')

    class Meta:
        verbose_name = 'Configurazione Check-in'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)


class DailyQRCodeToken(models.Model):
    """Token giornaliero per il QR code check-in. Uno per data."""
    data = models.DateField(unique=True)
    token = models.CharField(max_length=64, unique=True)
    creato_at = models.DateTimeField(auto_now_add=True)
    creato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='qr_tokens_generati',
    )

    class Meta:
        verbose_name = 'Token QR Giornaliero'
        verbose_name_plural = 'Token QR Giornalieri'
        ordering = ['-data']

    def __str__(self):
        return f'Token QR {self.data}'

    @classmethod
    def get_or_create_today(cls, user=None):
        today = date.today()
        obj, created = cls.objects.get_or_create(
            data=today,
            defaults={
                'token': secrets.token_urlsafe(32),
                'creato_da': user,
            },
        )
        return obj, created

    @classmethod
    def rinnova_oggi(cls, user=None):
        """Forza la generazione di un nuovo token per oggi."""
        today = date.today()
        cls.objects.filter(data=today).delete()
        return cls.objects.create(
            data=today,
            token=secrets.token_urlsafe(32),
            creato_da=user,
        )

    @classmethod
    def valida(cls, token: str) -> bool:
        """True se il token esiste ed è di oggi."""
        return cls.objects.filter(token=token, data=date.today()).exists()


class DailyQRCodeTokenInsegnanti(models.Model):
    """Token giornaliero per il QR code check-in insegnanti. Uno per data."""
    data = models.DateField(unique=True)
    token = models.CharField(max_length=64, unique=True)
    creato_at = models.DateTimeField(auto_now_add=True)
    creato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='qr_tokens_insegnanti_generati',
    )

    class Meta:
        verbose_name = 'Token QR Giornaliero Insegnanti'
        verbose_name_plural = 'Token QR Giornalieri Insegnanti'
        ordering = ['-data']

    def __str__(self):
        return f'Token QR Insegnanti {self.data}'

    @classmethod
    def get_or_create_today(cls, user=None):
        today = date.today()
        obj, created = cls.objects.get_or_create(
            data=today,
            defaults={
                'token': secrets.token_urlsafe(32),
                'creato_da': user,
            },
        )
        return obj, created

    @classmethod
    def rinnova_oggi(cls, user=None):
        today = date.today()
        cls.objects.filter(data=today).delete()
        return cls.objects.create(
            data=today,
            token=secrets.token_urlsafe(32),
            creato_da=user,
        )

    @classmethod
    def valida(cls, token: str) -> bool:
        return cls.objects.filter(token=token, data=date.today()).exists()


class Presenza(models.Model):

    class MotivoAssenza(models.TextChoices):
        MALATTIA = 'malattia', 'Malattia'
        FAMIGLIA = 'famiglia', 'Motivi familiari'
        VACANZA = 'vacanza', 'Vacanza'
        ALTRO = 'altro', 'Altro'

    ORA_INGRESSO = time(9, 30)

    bambino = models.ForeignKey(
        'children.Bambino',
        on_delete=models.CASCADE,
        related_name='presenze',
    )
    data = models.DateField()
    presente = models.BooleanField()
    ora_arrivo = models.TimeField(null=True, blank=True)
    ora_uscita = models.TimeField(null=True, blank=True)
    minuti_ritardo_arrivo = models.IntegerField(
        null=True, blank=True,
        verbose_name='Minuti di ritardo arrivo',
    )
    minuti_ritardo_uscita = models.IntegerField(
        null=True, blank=True,
        verbose_name='Minuti di ritardo uscita',
    )
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
    via_qr = models.BooleanField(
        default=False,
        verbose_name='Registrata via QR',
    )
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

    def save(self, *args, **kwargs):
        self._calcola_ritardi()
        super().save(*args, **kwargs)

    @staticmethod
    def _to_time(value):
        if value is None:
            return None
        if isinstance(value, time):
            return value
        try:
            parts = str(value).split(':')
            return time(int(parts[0]), int(parts[1]))
        except Exception:
            return None

    def _calcola_ritardi(self):
        self.ora_arrivo = self._to_time(self.ora_arrivo)
        self.ora_uscita = self._to_time(self.ora_uscita)

        if self.ora_arrivo:
            if self.ora_arrivo > self.ORA_INGRESSO:
                dt_arrivo = datetime.combine(datetime.min, self.ora_arrivo)
                dt_ingresso = datetime.combine(datetime.min, self.ORA_INGRESSO)
                self.minuti_ritardo_arrivo = int((dt_arrivo - dt_ingresso).total_seconds() // 60)
            else:
                self.minuti_ritardo_arrivo = 0
        else:
            self.minuti_ritardo_arrivo = None

        if self.ora_uscita:
            orario_previsto = self._get_orario_uscita_previsto()
            if orario_previsto and self.ora_uscita > orario_previsto:
                dt_uscita = datetime.combine(datetime.min, self.ora_uscita)
                dt_previsto = datetime.combine(datetime.min, orario_previsto)
                self.minuti_ritardo_uscita = int((dt_uscita - dt_previsto).total_seconds() // 60)
            else:
                self.minuti_ritardo_uscita = 0
        else:
            self.minuti_ritardo_uscita = None

    def _get_orario_uscita_previsto(self):
        try:
            return self.bambino.orario_uscita.orario
        except Exception:
            return None


class PresenzaInsegnante(models.Model):

    class MotivoAssenza(models.TextChoices):
        MALATTIA = 'malattia', 'Malattia'
        FERIE = 'ferie', 'Ferie'
        PERMESSO = 'permesso', 'Permesso'
        ALTRO = 'altro', 'Altro'

    insegnante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='presenze_insegnante',
    )
    data = models.DateField()
    presente = models.BooleanField(
        default=True,
        verbose_name='Presente',
    )
    motivo_assenza = models.CharField(
        max_length=10,
        choices=MotivoAssenza.choices,
        blank=True,
        verbose_name='Motivo assenza',
    )
    ora_entrata = models.TimeField(null=True, blank=True)
    ora_uscita = models.TimeField(null=True, blank=True)
    via_qr = models.BooleanField(
        default=False,
        verbose_name='Registrata via QR',
    )
    registrato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='presenze_insegnanti_registrate',
    )
    creato_at = models.DateTimeField(auto_now_add=True)
    aggiornato_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Presenza insegnante'
        verbose_name_plural = 'Presenze insegnanti'
        ordering = ['-data', 'insegnante__last_name', 'insegnante__first_name']
        constraints = [
            models.UniqueConstraint(fields=['insegnante', 'data'], name='uniq_presenza_insegnante_data'),
        ]

    def __str__(self):
        full_name = self.insegnante.get_full_name() or self.insegnante.email
        stato = 'Presente' if self.presente else f'Assente ({self.motivo_assenza or "non specificato"})'
        return f'{full_name} — {self.data} ({stato})'
