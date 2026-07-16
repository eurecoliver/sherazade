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
    """Legacy: menu giornaliero inserito manualmente. Mantenuto per compatibilità storica."""
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
        verbose_name = 'Menu Giornaliero (legacy)'
        verbose_name_plural = 'Menu Giornalieri (legacy)'
        unique_together = [('data', 'sezione')]
        ordering = ['-data', 'sezione']

    def __str__(self):
        sezione_str = f' — Sez. {self.sezione}' if self.sezione else ''
        return f'Menu {self.data}{sezione_str}'


class PreferenzaMenuBambino(models.Model):
    """
    Preferenza menu permanente per un bambino.
    Indica che questo bambino riceve sempre un tipo di menu diverso dal gruppo
    (monopiatto invece di primo+secondo, oppure menu completamente differente).
    Può essere sovrascritta giornalmente tramite RegistroPasto.tipo_menu.
    """

    class Tipo(models.TextChoices):
        MONOPIATTO = 'monopiatto', 'Monopiatto'
        DIFFERENTE = 'differente', 'Menu differente'

    bambino = models.OneToOneField(
        'children.Bambino',
        on_delete=models.CASCADE,
        related_name='preferenza_menu',
    )
    tipo = models.CharField(max_length=12, choices=Tipo.choices)
    descrizione = models.CharField(
        max_length=200,
        blank=True,
        help_text='Es. "pastina al burro", "menu divezzi", "senza carne".',
    )
    attivo = models.BooleanField(default=True)
    creato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='preferenze_menu_create',
    )
    creato_il = models.DateTimeField(auto_now_add=True)
    aggiornato_il = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Preferenza Menu Bambino'
        verbose_name_plural = 'Preferenze Menu Bambini'

    def __str__(self):
        return f'{self.bambino} — {self.get_tipo_display()}'


class RegistroPasto(models.Model):

    class Quantita(models.TextChoices):
        TUTTO = 'tutto', 'Tutto'
        META = 'meta', 'Metà'
        POCO = 'poco', 'Poco'
        NULLA = 'nulla', 'Nulla'

    bambino = models.ForeignKey(
        'children.Bambino',
        on_delete=models.CASCADE,
        related_name='registri_pasto',
    )
    data = models.DateField()
    colazione_quantita = models.CharField(max_length=6, choices=Quantita.choices, blank=True)
    primo_quantita = models.CharField(max_length=6, choices=Quantita.choices, blank=True)
    secondo_quantita = models.CharField(max_length=6, choices=Quantita.choices, blank=True)
    monopiatto_quantita = models.CharField(max_length=6, choices=Quantita.choices, blank=True)
    contorno_quantita = models.CharField(max_length=6, choices=Quantita.choices, blank=True)
    pane_quantita = models.CharField(max_length=6, choices=Quantita.choices, blank=True)
    frutta_quantita = models.CharField(max_length=6, choices=Quantita.choices, blank=True)
    merenda_quantita = models.CharField(max_length=6, choices=Quantita.choices, blank=True)
    note_pasto = models.TextField(blank=True)
    tipo_menu = models.CharField(
        max_length=12,
        blank=True,
        default='',
        help_text='Override giornaliero del tipo menu. Vuoto = usa preferenza permanente del bambino.',
    )
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


# ── Menu ciclico v2 ──────────────────────────────────────────────────────────

class ConfigMenuCiclo(models.Model):
    """
    Configurazione del menu ciclico a 5 settimane.
    Deve esistere un solo record. La data_inizio_ciclo è il lunedì
    della prima settimana del ciclo: da lì si calcola automaticamente
    la settimana corrente (1-5) per qualsiasi data futura.
    """
    data_inizio_ciclo = models.DateField(
        help_text='Lunedì della settimana 1 del ciclo. Il sistema calcola settimana 1-5 da questa data.'
    )
    aggiornato_il = models.DateTimeField(auto_now=True)
    aggiornato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='+',
    )

    class Meta:
        verbose_name = 'Configurazione Menu Ciclico'

    def __str__(self):
        return f'Ciclo da {self.data_inizio_ciclo}'

    @classmethod
    def settimana_ciclo(cls, data):
        """Restituisce il numero di settimana (1-5) per la data indicata, o None."""
        try:
            cfg = cls.objects.get()
        except cls.DoesNotExist:
            return None
        delta = (data - cfg.data_inizio_ciclo).days
        if delta < 0:
            return None
        return (delta // 7) % 5 + 1


class Piatto(models.Model):

    class Tipo(models.TextChoices):
        COLAZIONE = 'colazione', 'Colazione'
        PRIMO = 'primo', 'Primo'
        SECONDO = 'secondo', 'Secondo'
        MONOPIATTO = 'monopiatto', 'Monopiatto'
        CONTORNO = 'contorno', 'Contorno'
        PANE = 'pane', 'Pane'
        FRUTTA = 'frutta', 'Frutta'
        MERENDA = 'merenda', 'Merenda'

    descrizione = models.CharField(max_length=200)
    tipo = models.CharField(max_length=12, choices=Tipo.choices)
    note = models.TextField(blank=True)
    attivo = models.BooleanField(default=True)
    data_inizio = models.DateField(
        null=True, blank=True,
        help_text='Dal (incluso). Vuoto = nessun limite. Es. 01/04 per menu estivo.',
    )
    data_fine = models.DateField(
        null=True, blank=True,
        help_text='Al (incluso). Vuoto = nessun limite. Es. 31/10 per menu estivo.',
    )
    creato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='piatti_creati',
    )
    creato_il = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Piatto'
        verbose_name_plural = 'Piatti'
        ordering = ['tipo', 'descrizione']

    def __str__(self):
        return f'{self.get_tipo_display()} — {self.descrizione}'


class PiattoAssegnazione(models.Model):
    """
    Assegna un piatto a un gruppo per specifiche settimane/giorni del ciclo.

    giorni_per_settimana: {"1": [0, 3], "2": [1, 4]}
        → settimana 1: lunedì (0) e giovedì (3)
        → settimana 2: martedì (1) e venerdì (4)
    Settimane non presenti nel dict = piatto non servito in quella settimana.

    Se sempre=True il campo giorni_per_settimana viene ignorato e il piatto
    è servito ogni giorno (utile per pane, acqua, frutta fissa, ecc.).
    """
    piatto = models.ForeignKey(
        Piatto,
        on_delete=models.CASCADE,
        related_name='assegnazioni',
    )
    gruppi = models.ManyToManyField(
        'config.Gruppo',
        related_name='piatti_assegnati',
        blank=True,
        help_text='Gruppi a cui è assegnato questo piatto nel ciclo.',
    )
    sempre = models.BooleanField(
        default=False,
        help_text='Se True, servito ogni giorno indipendentemente dal ciclo.',
    )
    giorni_per_settimana = models.JSONField(
        default=dict,
        blank=True,
        help_text='Es. {"1": [0, 3], "2": [1, 4]} — chiave=settimana, valore=lista giorni (0=lun, 4=ven).',
    )

    class Meta:
        verbose_name = 'Assegnazione Piatto'
        verbose_name_plural = 'Assegnazioni Piatti'

    def __str__(self):
        gruppi = ', '.join(g.nome for g in self.gruppi.all()) or 'nessun gruppo'
        return f'{self.piatto} → {gruppi}'


class SostituzionePiatto(models.Model):
    """
    Override temporaneo per una data specifica.
    Sostituisce tutti i piatti del tipo indicato per i gruppi selezionati in quella data.
    """
    gruppi = models.ManyToManyField(
        'config.Gruppo',
        related_name='sostituzioni_piatto',
        blank=True,
        help_text='Gruppi coinvolti dalla sostituzione. Se vuoto, vale per tutti i gruppi.',
    )
    data = models.DateField()
    tipo = models.CharField(max_length=12, choices=Piatto.Tipo.choices)
    descrizione = models.CharField(max_length=200)
    note = models.TextField(blank=True)
    inserito_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='sostituzioni_inserite',
    )
    creato_il = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Sostituzione Piatto'
        verbose_name_plural = 'Sostituzioni Piatti'
        ordering = ['data', 'tipo']

    def __str__(self):
        return f'{self.data} — {self.get_tipo_display()}: {self.descrizione}'
