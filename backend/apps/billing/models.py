from django.db import models
from apps.users.models import User


class Fattura(models.Model):
    genitore = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='fatture',
        limit_choices_to={'role': 'genitore'},
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
        unique_together = [('genitore', 'anno', 'mese')]
        ordering = ['-anno', '-mese']

    def __str__(self):
        return f'Fattura {self.mese}/{self.anno} — {self.genitore}'
