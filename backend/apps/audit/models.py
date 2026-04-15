from django.conf import settings
from django.db import models
from django.utils import timezone


class LogAccesso(models.Model):
    """
    Registro GDPR degli accessi ai dati personali dei minori.
    Retention minima: 6 mesi (configurabile via LOG_ACCESSI_RETENTION_MONTHS).
    """

    class Azione(models.TextChoices):
        LEGGI = 'leggi', 'Lettura'
        CREA = 'crea', 'Creazione'
        MODIFICA = 'modifica', 'Modifica'
        ELIMINA = 'elimina', 'Eliminazione'

    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    utente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='log_accessi',
    )
    # Snapshot: conservati anche se l'utente viene eliminato
    utente_email = models.EmailField(blank=True)
    utente_ruolo = models.CharField(max_length=50, blank=True)

    azione = models.CharField(max_length=20, choices=Azione.choices, db_index=True)
    risorsa = models.CharField(max_length=100, db_index=True)   # es. 'bambino', 'media_diario'
    oggetto_id = models.CharField(max_length=50, blank=True)    # PK dell'oggetto acceduto
    dettagli = models.TextField(blank=True)                     # info aggiuntive leggibili

    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Log Accesso'
        verbose_name_plural = 'Log Accessi'
        indexes = [
            models.Index(fields=['timestamp', 'risorsa']),
            models.Index(fields=['utente', 'timestamp']),
            models.Index(fields=['azione', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.timestamp:%d/%m/%Y %H:%M} | {self.utente_email} | {self.azione} {self.risorsa}"
