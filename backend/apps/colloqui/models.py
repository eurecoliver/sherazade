from django.db import models
from django.conf import settings
from datetime import datetime, timedelta


class SessioneColloqui(models.Model):
    titolo = models.CharField(max_length=200)
    descrizione = models.TextField(blank=True, default='')
    data = models.DateField()
    ora_inizio = models.TimeField()
    ora_fine = models.TimeField()
    durata_slot = models.IntegerField(default=20, help_text='Durata in minuti')
    aperto = models.BooleanField(default=True, help_text='Se True, i genitori possono prenotare')
    gruppi = models.ManyToManyField(
        'config.Gruppo',
        blank=True,
        help_text='Se vuoto, visibile a tutti i gruppi',
        related_name='sessioni_colloqui',
    )
    creato_da = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name='sessioni_create',
    )
    creato_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['data', 'ora_inizio']
        verbose_name = 'Sessione colloqui'
        verbose_name_plural = 'Sessioni colloqui'

    def __str__(self):
        return f'{self.titolo} — {self.data}'

    def get_num_slots(self):
        start = datetime.combine(self.data, self.ora_inizio)
        end = datetime.combine(self.data, self.ora_fine)
        duration = timedelta(minutes=self.durata_slot)
        if duration.total_seconds() <= 0:
            return 0
        total = int((end - start).total_seconds() // duration.total_seconds())
        return max(0, total)

    def get_slots(self):
        start = datetime.combine(self.data, self.ora_inizio)
        duration = timedelta(minutes=self.durata_slot)
        slots = []
        for i in range(self.get_num_slots()):
            slot_start = start + duration * i
            slot_end = slot_start + duration
            slots.append({
                'index': i,
                'ora_inizio': slot_start.strftime('%H:%M'),
                'ora_fine': slot_end.strftime('%H:%M'),
            })
        return slots


class PrenotazioneColloquio(models.Model):
    sessione = models.ForeignKey(
        SessioneColloqui,
        on_delete=models.CASCADE,
        related_name='prenotazioni',
    )
    genitore = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='prenotazioni_colloquio',
    )
    bambino = models.ForeignKey(
        'children.Bambino',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='prenotazioni_colloquio',
    )
    slot_index = models.IntegerField()
    note_genitore = models.TextField(blank=True, default='')
    disdetta = models.BooleanField(default=False)
    creato_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['sessione', 'slot_index'],
                condition=models.Q(disdetta=False),
                name='unique_slot_attivo',
            ),
        ]
        ordering = ['slot_index']
        verbose_name = 'Prenotazione colloquio'
        verbose_name_plural = 'Prenotazioni colloquio'

    def __str__(self):
        return f'{self.sessione} — slot {self.slot_index} — {self.genitore}'
