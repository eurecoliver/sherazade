from django.db import migrations

RUOLI_SISTEMA = [
    # (codice, nome, sistema, ordine)
    ('admin',         'Admin',         True,  0),
    ('direttrice',    'Direttrice',    False, 1),
    ('coordinatrice', 'Coordinatrice', False, 2),
    ('insegnante',    'Insegnante',    False, 3),
    ('cuoca',         'Cuoca',         False, 4),
    ('genitore',      'Genitore',      False, 5),
]

# Direttrice: tutti i permessi True (backward compat — aveva accesso come admin)
RISORSE = ['bambini', 'consensi', 'presenze', 'diario', 'pappe', 'circolari', 'calendario', 'agenda', 'utenti']
AZIONI  = ['leggi', 'scrivi', 'elimina']


def seed_ruoli(apps, schema_editor):
    Ruolo = apps.get_model('config', 'Ruolo')
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')

    for codice, nome, sistema, ordine in RUOLI_SISTEMA:
        Ruolo.objects.get_or_create(codice=codice, defaults={'nome': nome, 'sistema': sistema, 'ordine': ordine})

    # Crea i 27 permessi per Direttrice (tutti True — aveva accesso completo come admin)
    records = []
    for risorsa in RISORSE:
        for azione in AZIONI:
            exists = PermessoRuolo.objects.filter(ruolo='direttrice', risorsa=risorsa, azione=azione).exists()
            if not exists:
                records.append(PermessoRuolo(ruolo='direttrice', risorsa=risorsa, azione=azione, consentito=True))
    if records:
        PermessoRuolo.objects.bulk_create(records)


def unseed_ruoli(apps, schema_editor):
    apps.get_model('config', 'Ruolo').objects.all().delete()
    apps.get_model('config', 'PermessoRuolo').objects.filter(ruolo='direttrice').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('config', '0004_ruolo'),
    ]

    operations = [
        migrations.RunPython(seed_ruoli, reverse_code=unseed_ruoli),
    ]
