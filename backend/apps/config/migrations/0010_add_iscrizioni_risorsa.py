"""
Aggiunge la risorsa 'iscrizioni' alla matrice permessi.
Admin: accesso totale (gestito via bypass).
Direttrice/Coordinatrice: leggi + scrivi.
Insegnante: nessun accesso.
Cuoca/Genitore: nessun accesso.
"""
from django.db import migrations


SISTEMA_DEFAULTS = {
    'direttrice':    (True,  True,  True),
    'coordinatrice': (True,  True,  False),
    'insegnante':    (False, False, False),
    'cuoca':         (False, False, False),
    'genitore':      (False, False, False),
}


def seed_iscrizioni(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    Ruolo = apps.get_model('config', 'Ruolo')

    for ruolo in Ruolo.objects.exclude(codice='admin'):
        leggi, scrivi, elimina = SISTEMA_DEFAULTS.get(ruolo.codice, (False, False, False))
        for azione, consentito in [('leggi', leggi), ('scrivi', scrivi), ('elimina', elimina)]:
            PermessoRuolo.objects.get_or_create(
                ruolo=ruolo.codice,
                risorsa='iscrizioni',
                azione=azione,
                defaults={'consentito': consentito},
            )


def remove_iscrizioni(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    PermessoRuolo.objects.filter(risorsa='iscrizioni').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('config', '0009_add_audit_risorsa'),
    ]

    operations = [
        migrations.RunPython(seed_iscrizioni, remove_iscrizioni),
    ]
