from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    ADMIN = 'admin', 'Admin'
    DIRETTRICE = 'direttrice', 'Direttrice'
    COORDINATRICE = 'coordinatrice', 'Coordinatrice'
    INSEGNANTE = 'insegnante', 'Insegnante'
    CUOCA = 'cuoca', 'Cuoca'
    GENITORE = 'genitore', 'Genitore'


STAFF_ROLES = {Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE, Role.CUOCA}


class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.GENITORE,
    )
    phone = models.CharField(max_length=20, blank=True)
    codice_fiscale = models.CharField(max_length=16, blank=True)
    indirizzo = models.TextField(blank=True)
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=32, blank=True)

    class Meta:
        verbose_name = 'Utente'
        verbose_name_plural = 'Utenti'

    def __str__(self):
        return f'{self.get_full_name()} ({self.role})'

    @property
    def is_staff_member(self):
        return self.role in STAFF_ROLES
