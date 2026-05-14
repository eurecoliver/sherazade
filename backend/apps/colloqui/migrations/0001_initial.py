from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('children', '0004_anagrafica_v2'),
        ('config', '0009_add_audit_risorsa'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SessioneColloqui',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titolo', models.CharField(max_length=200)),
                ('descrizione', models.TextField(blank=True, default='')),
                ('data', models.DateField()),
                ('ora_inizio', models.TimeField()),
                ('ora_fine', models.TimeField()),
                ('durata_slot', models.IntegerField(default=20, help_text='Durata in minuti')),
                ('aperto', models.BooleanField(default=True, help_text='Se True, i genitori possono prenotare')),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('creato_da', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sessioni_create', to=settings.AUTH_USER_MODEL)),
                ('gruppi', models.ManyToManyField(blank=True, help_text='Se vuoto, visibile a tutti i gruppi', related_name='sessioni_colloqui', to='config.gruppo')),
            ],
            options={
                'verbose_name': 'Sessione colloqui',
                'verbose_name_plural': 'Sessioni colloqui',
                'ordering': ['data', 'ora_inizio'],
            },
        ),
        migrations.CreateModel(
            name='PrenotazioneColloquio',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slot_index', models.IntegerField()),
                ('note_genitore', models.TextField(blank=True, default='')),
                ('disdetta', models.BooleanField(default=False)),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('sessione', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prenotazioni', to='colloqui.sessionecolloqui')),
                ('genitore', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='prenotazioni_colloquio', to=settings.AUTH_USER_MODEL)),
                ('bambino', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='prenotazioni_colloquio', to='children.bambino')),
            ],
            options={
                'verbose_name': 'Prenotazione colloquio',
                'verbose_name_plural': 'Prenotazioni colloquio',
                'ordering': ['slot_index'],
            },
        ),
        migrations.AddConstraint(
            model_name='prenotazionecolloquio',
            constraint=models.UniqueConstraint(
                condition=models.Q(disdetta=False),
                fields=['sessione', 'slot_index'],
                name='unique_slot_attivo',
            ),
        ),
    ]
