from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('config', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PermessoRuolo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ruolo', models.CharField(choices=[('coordinatrice', 'Coordinatrice'), ('insegnante', 'Insegnante'), ('cuoca', 'Cuoca'), ('genitore', 'Genitore')], max_length=30)),
                ('risorsa', models.CharField(choices=[('bambini', 'Anagrafica bambini'), ('consensi', 'Consensi fotografici'), ('presenze', 'Presenze'), ('diario', 'Diario'), ('pappe', 'Pappe e menu'), ('circolari', 'Circolari'), ('calendario', 'Calendario'), ('agenda', 'Agenda note'), ('utenti', 'Gestione utenti')], max_length=30)),
                ('azione', models.CharField(choices=[('leggi', 'Visualizza'), ('scrivi', 'Crea e modifica'), ('elimina', 'Elimina')], max_length=10)),
                ('consentito', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name': 'Permesso ruolo',
                'verbose_name_plural': 'Permessi ruoli',
                'ordering': ['ruolo', 'risorsa', 'azione'],
                'unique_together': {('ruolo', 'risorsa', 'azione')},
            },
        ),
    ]
