from django.db import migrations

# (ruolo, risorsa, leggi, scrivi, elimina)
DEFAULTS = [
    ('coordinatrice', 'bambini',    True,  True,  False),
    ('coordinatrice', 'consensi',   True,  False, False),
    ('coordinatrice', 'presenze',   True,  True,  True),
    ('coordinatrice', 'diario',     True,  True,  True),
    ('coordinatrice', 'pappe',      True,  True,  True),
    ('coordinatrice', 'circolari',  True,  False, False),
    ('coordinatrice', 'calendario', True,  True,  True),
    ('coordinatrice', 'agenda',     True,  True,  True),
    ('coordinatrice', 'utenti',     False, False, False),
    ('insegnante',    'bambini',    True,  True,  False),
    ('insegnante',    'consensi',   True,  False, False),
    ('insegnante',    'presenze',   True,  True,  True),
    ('insegnante',    'diario',     True,  True,  True),
    ('insegnante',    'pappe',      True,  True,  True),
    ('insegnante',    'circolari',  True,  False, False),
    ('insegnante',    'calendario', True,  True,  True),
    ('insegnante',    'agenda',     True,  True,  True),
    ('insegnante',    'utenti',     False, False, False),
    ('cuoca',         'bambini',    True,  False, False),
    ('cuoca',         'consensi',   False, False, False),
    ('cuoca',         'presenze',   True,  False, False),
    ('cuoca',         'diario',     False, False, False),
    ('cuoca',         'pappe',      True,  True,  True),
    ('cuoca',         'circolari',  False, False, False),
    ('cuoca',         'calendario', True,  False, False),
    ('cuoca',         'agenda',     False, False, False),
    ('cuoca',         'utenti',     False, False, False),
    ('genitore',      'bambini',    True,  False, False),
    ('genitore',      'consensi',   True,  True,  False),
    ('genitore',      'presenze',   True,  True,  False),
    ('genitore',      'diario',     True,  False, False),
    ('genitore',      'pappe',      True,  False, False),
    ('genitore',      'circolari',  True,  False, False),
    ('genitore',      'calendario', True,  False, False),
    ('genitore',      'agenda',     False, False, False),
    ('genitore',      'utenti',     False, False, False),
]


def seed_permessi(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    records = []
    for ruolo, risorsa, leggi, scrivi, elimina in DEFAULTS:
        for azione, consentito in [('leggi', leggi), ('scrivi', scrivi), ('elimina', elimina)]:
            records.append(PermessoRuolo(
                ruolo=ruolo,
                risorsa=risorsa,
                azione=azione,
                consentito=consentito,
            ))
    PermessoRuolo.objects.bulk_create(records)


def unseed_permessi(apps, schema_editor):
    apps.get_model('config', 'PermessoRuolo').objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('config', '0002_permessoruolo'),
    ]

    operations = [
        migrations.RunPython(seed_permessi, reverse_code=unseed_permessi),
    ]
