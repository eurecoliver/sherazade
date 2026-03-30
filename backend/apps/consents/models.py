from django.db import models


class ConsensoFotografico(models.Model):

    class Finalita(models.TextChoices):
        USO_INTERNO = 'uso_interno', 'Uso interno (solo staff)'
        GENITORI_DIRETTI = 'genitori_diretti', 'Visibile ai genitori del bambino'
        NEWSLETTER = 'newsletter_scolastica', 'Newsletter scolastica'

    bambino = models.ForeignKey(
        'children.Bambino',
        on_delete=models.CASCADE,
        related_name='consensi',
    )
    finalita = models.CharField(max_length=30, choices=Finalita.choices)

    consenso_genitore1 = models.BooleanField(default=False)
    consenso_genitore2 = models.BooleanField(default=False, null=True, blank=True)
    data_consenso_genitore1 = models.DateTimeField(null=True, blank=True)
    data_consenso_genitore2 = models.DateTimeField(null=True, blank=True)

    revocato = models.BooleanField(default=False)
    data_revoca = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)

    creato_il = models.DateTimeField(auto_now_add=True)
    aggiornato_il = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Consenso Fotografico'
        verbose_name_plural = 'Consensi Fotografici'
        unique_together = [('bambino', 'finalita')]
        ordering = ['bambino__cognome', 'bambino__nome', 'finalita']

    def __str__(self):
        return f'{self.bambino} — {self.get_finalita_display()}'

    def _has_genitore2(self):
        try:
            return self.bambino.famiglia.genitore2 is not None
        except Exception:
            return False

    @property
    def stato(self):
        if self.bambino.non_fotografabile:
            return 'non_fotografabile'
        if self.revocato:
            return 'revocato'
        has_g2 = self._has_genitore2()
        if has_g2:
            if self.consenso_genitore1 and self.consenso_genitore2:
                return 'completo'
            if self.consenso_genitore1 or self.consenso_genitore2:
                return 'parziale'
        else:
            if self.consenso_genitore1:
                return 'completo'
        return 'nessuno'
