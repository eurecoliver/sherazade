"""
Aggiunge la risorsa 'portfolio' alla matrice permessi per tutti i ruoli esistenti.

Defaults per i ruoli di sistema:
  admin:         bypassa tutto (nessun record in PermessoRuolo)
  direttrice:    leggi/scrivi/elimina → True
  coordinatrice: leggi/scrivi/elimina → True
  insegnante:    leggi/scrivi/elimina → True
  cuoca:         leggi → True, scrivi/elimina → False
  genitore:      leggi → True, scrivi/elimina → False
  custom:        tutto → False (opt-in)
"""
from django.db import migrations

SISTEMA_DEFAULTS = {
    'direttrice':    (True,  True,  True),
    'coordinatrice': (True,  True,  True),
    'insegnante':    (True,  True,  True),
    'cuoca':         (True,  False, False),
    'genitore':      (True,  False, False),
}


def seed_portfolio(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    Ruolo = apps.get_model('config', 'Ruolo')

    for ruolo in Ruolo.objects.exclude(codice='admin'):
        leggi, scrivi, elimina = SISTEMA_DEFAULTS.get(ruolo.codice, (False, False, False))
        for azione, consentito in [('leggi', leggi), ('scrivi', scrivi), ('elimina', elimina)]:
            PermessoRuolo.objects.get_or_create(
                ruolo=ruolo.codice,
                risorsa='portfolio',
                azione=azione,
                defaults={'consentito': consentito},
            )


def remove_portfolio(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    PermessoRuolo.objects.filter(risorsa='portfolio').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('config', '0007_fill_missing_permessi'),
    ]

    operations = [
        migrations.RunPython(seed_portfolio, remove_portfolio),
    ]
