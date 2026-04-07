import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('meals', '0002_remove_menugiornaliero_unique_menu_per_data_sezione_and_more'),
        ('config', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # RegistroPasto: aggiungi colazione, monopiatto, pane
        migrations.AddField(
            model_name='registropasto',
            name='colazione_quantita',
            field=models.CharField(blank=True, choices=[('tutto', 'Tutto'), ('meta', 'Metà'), ('poco', 'Poco'), ('nulla', 'Nulla')], max_length=6),
        ),
        migrations.AddField(
            model_name='registropasto',
            name='monopiatto_quantita',
            field=models.CharField(blank=True, choices=[('tutto', 'Tutto'), ('meta', 'Metà'), ('poco', 'Poco'), ('nulla', 'Nulla')], max_length=6),
        ),
        migrations.AddField(
            model_name='registropasto',
            name='pane_quantita',
            field=models.CharField(blank=True, choices=[('tutto', 'Tutto'), ('meta', 'Metà'), ('poco', 'Poco'), ('nulla', 'Nulla')], max_length=6),
        ),

        # ConfigMenuCiclo
        migrations.CreateModel(
            name='ConfigMenuCiclo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data_inizio_ciclo', models.DateField(help_text='Lunedì della settimana 1 del ciclo.')),
                ('aggiornato_il', models.DateTimeField(auto_now=True)),
                ('aggiornato_da', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'verbose_name': 'Configurazione Menu Ciclico'},
        ),

        # Piatto
        migrations.CreateModel(
            name='Piatto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('descrizione', models.CharField(max_length=200)),
                ('tipo', models.CharField(
                    max_length=12,
                    choices=[
                        ('colazione', 'Colazione'), ('primo', 'Primo'), ('secondo', 'Secondo'),
                        ('monopiatto', 'Monopiatto'), ('contorno', 'Contorno'),
                        ('pane', 'Pane'), ('frutta', 'Frutta'), ('merenda', 'Merenda'),
                    ],
                )),
                ('note', models.TextField(blank=True)),
                ('attivo', models.BooleanField(default=True)),
                ('creato_il', models.DateTimeField(auto_now_add=True)),
                ('creato_da', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='piatti_creati',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'verbose_name': 'Piatto', 'verbose_name_plural': 'Piatti', 'ordering': ['tipo', 'descrizione']},
        ),

        # PiattoAssegnazione
        migrations.CreateModel(
            name='PiattoAssegnazione',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sempre', models.BooleanField(default=False)),
                ('giorni_per_settimana', models.JSONField(blank=True, default=dict)),
                ('piatto', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='assegnazioni',
                    to='meals.piatto',
                )),
                ('gruppo', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='piatti_assegnati',
                    to='config.gruppo',
                )),
            ],
            options={
                'verbose_name': 'Assegnazione Piatto',
                'verbose_name_plural': 'Assegnazioni Piatti',
                'unique_together': {('piatto', 'gruppo')},
            },
        ),

        # SostituzionePiatto
        migrations.CreateModel(
            name='SostituzionePiatto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.DateField()),
                ('tipo', models.CharField(
                    max_length=12,
                    choices=[
                        ('colazione', 'Colazione'), ('primo', 'Primo'), ('secondo', 'Secondo'),
                        ('monopiatto', 'Monopiatto'), ('contorno', 'Contorno'),
                        ('pane', 'Pane'), ('frutta', 'Frutta'), ('merenda', 'Merenda'),
                    ],
                )),
                ('descrizione', models.CharField(max_length=200)),
                ('note', models.TextField(blank=True)),
                ('creato_il', models.DateTimeField(auto_now_add=True)),
                ('inserito_da', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='sostituzioni_inserite',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('gruppi', models.ManyToManyField(
                    blank=True,
                    related_name='sostituzioni_piatto',
                    to='config.gruppo',
                )),
            ],
            options={
                'verbose_name': 'Sostituzione Piatto',
                'verbose_name_plural': 'Sostituzioni Piatti',
                'ordering': ['data', 'tipo'],
            },
        ),
    ]
