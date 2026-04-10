"""
Aggiunge la risorsa 'fatture' alla matrice permessi per tutti i ruoli esistenti.
Admin è sempre hardcoded (non ha record in PermessoRuolo).
Per i ruoli di sistema (direttrice) fatture=leggi/scrivi/elimina → True.
Per tutti gli altri ruoli esistenti fatture=* → False (opt-in).
"""
from django.db import migrations


def seed_fatture(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    Ruolo = apps.get_model('config', 'Ruolo')

    azioni = ['leggi', 'scrivi', 'elimina']
    ruoli_full = {'direttrice'}  # ruoli di sistema che devono avere accesso completo

    for ruolo in Ruolo.objects.exclude(codice='admin'):
        consentito = ruolo.codice in ruoli_full
        for azione in azioni:
            PermessoRuolo.objects.get_or_create(
                ruolo=ruolo.codice,
                risorsa='fatture',
                azione=azione,
                defaults={'consentito': consentito},
            )


def remove_fatture(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    PermessoRuolo.objects.filter(risorsa='fatture').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('config', '0005_seed_ruoli'),
    ]

    operations = [
        migrations.RunPython(seed_fatture, remove_fatture),
    ]
