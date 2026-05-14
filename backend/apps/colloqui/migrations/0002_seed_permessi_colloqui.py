"""
Aggiunge la risorsa 'colloqui' alla matrice permessi per tutti i ruoli esistenti.

Defaults:
  admin:         bypass hardcoded (nessun record)
  direttrice:    leggi/scrivi/elimina → True
  coordinatrice: leggi/scrivi/elimina → True
  insegnante:    leggi → True, scrivi/elimina → False
  cuoca:         tutto → False
  genitore:      leggi → True (solo sessioni aperte), scrivi → True (per prenotare), elimina → False
  custom:        tutto → False (opt-in)
"""
from django.db import migrations

SISTEMA_DEFAULTS = {
    'direttrice':    (True,  True,  True),
    'coordinatrice': (True,  True,  True),
    'insegnante':    (True,  False, False),
    'cuoca':         (False, False, False),
    'genitore':      (True,  True,  False),
}


def seed_colloqui(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    Ruolo = apps.get_model('config', 'Ruolo')

    for ruolo in Ruolo.objects.exclude(codice='admin'):
        leggi, scrivi, elimina = SISTEMA_DEFAULTS.get(ruolo.codice, (False, False, False))
        for azione, consentito in [('leggi', leggi), ('scrivi', scrivi), ('elimina', elimina)]:
            PermessoRuolo.objects.get_or_create(
                ruolo=ruolo.codice,
                risorsa='colloqui',
                azione=azione,
                defaults={'consentito': consentito},
            )


def remove_colloqui(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    PermessoRuolo.objects.filter(risorsa='colloqui').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('colloqui', '0001_initial'),
        ('config', '0009_add_audit_risorsa'),
    ]

    operations = [
        migrations.RunPython(seed_colloqui, remove_colloqui),
    ]
