from django.conf import settings
from django.db import models


class ConfigurazioneIscrizioni(models.Model):
    """
    Configurazione singleton per le iscrizioni online.
    Esiste sempre un solo record (creato al primo accesso).
    """
    aperto = models.BooleanField(default=False, verbose_name='Iscrizioni aperte')
    anno_scolastico = models.CharField(max_length=20, default='', blank=True,
                                       verbose_name='Anno scolastico (es. 2026-2027)')
    data_apertura = models.DateField(null=True, blank=True)
    data_chiusura = models.DateField(null=True, blank=True)
    messaggio_benvenuto = models.TextField(blank=True,
        default='Compila il modulo per iscrivere tuo figlio al nido.')
    messaggio_chiuso = models.TextField(blank=True,
        default='Le iscrizioni sono attualmente chiuse. Riprova più tardi.')
    invia_email_conferma = models.BooleanField(default=True,
        verbose_name='Invia email di conferma al genitore')
    aggiornato_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configurazione Iscrizioni'

    def __str__(self):
        stato = 'Aperte' if self.aperto else 'Chiuse'
        return f'Iscrizioni {self.anno_scolastico} — {stato}'

    @classmethod
    def get_config(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class RichiestaIscrizione(models.Model):

    class Stato(models.TextChoices):
        IN_ATTESA   = 'in_attesa',   'In attesa'
        APPROVATA   = 'approvata',   'Approvata'
        RIFIUTATA   = 'rifiutata',   'Rifiutata'
        LISTA_ATTESA = 'lista_attesa', "Lista d'attesa"

    # ── Dati bambino ─────────────────────────────────────────────────────────
    bambino_nome = models.CharField(max_length=100)
    bambino_cognome = models.CharField(max_length=100)
    bambino_data_nascita = models.DateField()
    bambino_codice_fiscale = models.CharField(max_length=16, blank=True)
    bambino_note_mediche = models.TextField(blank=True)

    # ── Genitore 1 ───────────────────────────────────────────────────────────
    g1_nome = models.CharField(max_length=100)
    g1_cognome = models.CharField(max_length=100)
    g1_email = models.EmailField()
    g1_telefono = models.CharField(max_length=20)
    g1_codice_fiscale = models.CharField(max_length=16, blank=True)
    g1_indirizzo = models.TextField(blank=True)

    # ── Genitore 2 (opzionale) ───────────────────────────────────────────────
    g2_nome = models.CharField(max_length=100, blank=True)
    g2_cognome = models.CharField(max_length=100, blank=True)
    g2_email = models.EmailField(blank=True)
    g2_telefono = models.CharField(max_length=20, blank=True)

    # ── Gestione ─────────────────────────────────────────────────────────────
    anno_scolastico = models.CharField(max_length=20, blank=True)
    stato = models.CharField(max_length=12, choices=Stato.choices, default=Stato.IN_ATTESA)
    note_genitore = models.TextField(blank=True)
    note_admin = models.TextField(blank=True)
    assegnato_a = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='richieste_assegnate',
    )

    # ── Collegamento oggetti creati all'approvazione ──────────────────────────
    bambino = models.OneToOneField(
        'children.Bambino', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='richiesta_iscrizione',
    )

    # ── Metadata ─────────────────────────────────────────────────────────────
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    creato_at = models.DateTimeField(auto_now_add=True)
    aggiornato_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Richiesta di Iscrizione'
        verbose_name_plural = 'Richieste di Iscrizione'
        ordering = ['-creato_at']

    def __str__(self):
        return f'{self.bambino_nome} {self.bambino_cognome} — {self.get_stato_display()} ({self.anno_scolastico})'
