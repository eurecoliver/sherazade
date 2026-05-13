from django.db import models
from apps.users.models import User


class Fattura(models.Model):
    genitore = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='fatture',
        limit_choices_to={'role': 'genitore'},
    )
    bambino = models.ForeignKey(
        'children.Bambino', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='fatture',
    )
    anno = models.IntegerField()
    mese = models.IntegerField()  # 1-12
    importo = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    file = models.FileField(upload_to='fatture/', null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)
    caricato_da = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='fatture_caricate',
    )
    caricato_at = models.DateTimeField(auto_now_add=True)
    aggiornato_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # Famiglie con un solo bambino: al max una fattura per mese (bambino=null)
            models.UniqueConstraint(
                condition=models.Q(bambino__isnull=True),
                fields=['genitore', 'anno', 'mese'],
                name='unique_fattura_senza_bambino',
            ),
            # Famiglie multi-bambino: una fattura per mese per bambino
            models.UniqueConstraint(
                condition=models.Q(bambino__isnull=False),
                fields=['genitore', 'anno', 'mese', 'bambino'],
                name='unique_fattura_per_bambino',
            ),
        ]
        ordering = ['-anno', '-mese']

    def __str__(self):
        bambino_str = f' ({self.bambino})' if self.bambino else ''
        return f'Fattura {self.mese}/{self.anno} — {self.genitore}{bambino_str}'
