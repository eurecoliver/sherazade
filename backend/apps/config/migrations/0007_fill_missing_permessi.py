"""
Riempie i record PermessoRuolo mancanti per tutti i ruoli esistenti.

Problema: la migrazione 0003 è stata modificata dopo la prima applicazione,
quindi alcuni ruoli mancano dei record per 'presenze', 'pappe', 'utenti'
(e potenzialmente altri aggiunti in seguito).

Usa get_or_create su tutte le combinazioni ruolo × risorsa × azione così:
- Se il record esiste già → nessuna modifica (consentito preservato)
- Se manca → viene creato con il valore di default appropriato

Defaults per i ruoli di sistema (da 0003_seed_permessi):
  coordinatrice: presenze=True/True/True, pappe=True/True/True, utenti=False/False/False
  insegnante:    presenze=True/True/True, pappe=True/True/True, utenti=False/False/False
  cuoca:         presenze=True/False/False, pappe=True/True/True, utenti=False/False/False
  genitore:      presenze=True/True/False, pappe=True/False/False, utenti=False/False/False
  direttrice:    tutto True (accesso completo)
  Ruoli custom:  tutto False (opt-in)
"""
from django.db import migrations

# (ruolo, risorsa, leggi, scrivi, elimina)
# Solo i valori non-False per i ruoli di sistema con permessi specifici
SISTEMA_DEFAULTS = {
    ('direttrice',    'presenze'):   (True,  True,  True),
    ('direttrice',    'pappe'):      (True,  True,  True),
    ('direttrice',    'utenti'):     (True,  True,  True),
    ('coordinatrice', 'presenze'):   (True,  True,  True),
    ('coordinatrice', 'pappe'):      (True,  True,  True),
    ('coordinatrice', 'utenti'):     (False, False, False),
    ('insegnante',    'presenze'):   (True,  True,  True),
    ('insegnante',    'pappe'):      (True,  True,  True),
    ('insegnante',    'utenti'):     (False, False, False),
    ('cuoca',         'presenze'):   (True,  False, False),
    ('cuoca',         'pappe'):      (True,  True,  True),
    ('cuoca',         'utenti'):     (False, False, False),
    ('genitore',      'presenze'):   (True,  True,  False),
    ('genitore',      'pappe'):      (True,  False, False),
    ('genitore',      'utenti'):     (False, False, False),
}

RISORSE_CORRENTI = [
    'bambini', 'consensi', 'presenze', 'diario', 'pappe',
    'circolari', 'calendario', 'agenda', 'fatture', 'utenti',
]
AZIONI = ['leggi', 'scrivi', 'elimina']


def fill_missing(apps, schema_editor):
    PermessoRuolo = apps.get_model('config', 'PermessoRuolo')
    Ruolo = apps.get_model('config', 'Ruolo')

    for ruolo in Ruolo.objects.exclude(codice='admin'):
        for risorsa in RISORSE_CORRENTI:
            defaults = SISTEMA_DEFAULTS.get((ruolo.codice, risorsa))
            if defaults is None:
                # Ruolo custom o risorsa non in SISTEMA_DEFAULTS → False di default
                defaults = (False, False, False)
            leggi, scrivi, elimina = defaults
            for azione, consentito in [('leggi', leggi), ('scrivi', scrivi), ('elimina', elimina)]:
                PermessoRuolo.objects.get_or_create(
                    ruolo=ruolo.codice,
                    risorsa=risorsa,
                    azione=azione,
                    defaults={'consentito': consentito},
                )


def noop(apps, schema_editor):
    pass  # non reversibile (non vogliamo cancellare dati al rollback)


class Migration(migrations.Migration):

    dependencies = [
        ('config', '0006_add_fatture_risorsa'),
    ]

    operations = [
        migrations.RunPython(fill_missing, reverse_code=noop),
    ]
