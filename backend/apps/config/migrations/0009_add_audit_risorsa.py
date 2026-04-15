"""
Aggiunge la risorsa 'audit' (Log Accessi GDPR) alla matrice permessi.

Solo Admin e Direttrice possono visualizzare i log.
Tutti gli altri ruoli: tutto False (nessun accesso).
"""
from django.db import migrations


SISTEMA_DEFAULTS = {
    'direttrice':    (True,  False, False),   # può leggere i log
    'coordinatrice': (False, False, False),
    'insegnante':    (False, False, False),
    'cuoca':         (False, False, False),
    'genitore':      (False, False, False),
}


def seed_audit(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    Ruolo = apps.get_model('config', 'Ruolo')

    for ruolo in Ruolo.objects.exclude(codice='admin'):
        leggi, scrivi, elimina = SISTEMA_DEFAULTS.get(ruolo.codice, (False, False, False))
        for azione, consentito in [('leggi', leggi), ('scrivi', scrivi), ('elimina', elimina)]:
            PermessoRuolo.objects.get_or_create(
                ruolo=ruolo.codice,
                risorsa='audit',
                azione=azione,
                defaults={'consentito': consentito},
            )


def remove_audit(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    PermessoRuolo.objects.filter(risorsa='audit').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('config', '0008_add_portfolio_risorsa'),
    ]

    operations = [
        migrations.RunPython(seed_audit, remove_audit),
    ]
