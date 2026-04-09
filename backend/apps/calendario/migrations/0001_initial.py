from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('config', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TipoEvento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=80, unique=True, verbose_name='Nome tipo evento')),
                ('colore', models.CharField(default='#6C5CE7', max_length=7, verbose_name='Colore hex')),
                ('icona', models.CharField(default='📅', max_length=10, verbose_name='Emoji icona')),
                ('attivo', models.BooleanField(default=True)),
                ('creato_da', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tipi_evento_creati', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Tipo evento',
                'verbose_name_plural': 'Tipi evento',
                'ordering': ['nome'],
            },
        ),
        migrations.CreateModel(
            name='EventoCalendario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titolo', models.CharField(max_length=200, verbose_name='Titolo')),
                ('descrizione', models.TextField(blank=True, default='', verbose_name='Descrizione')),
                ('data_inizio', models.DateField(db_index=True, verbose_name='Data inizio')),
                ('data_fine', models.DateField(blank=True, null=True, verbose_name='Data fine')),
                ('tutto_il_giorno', models.BooleanField(default=True, verbose_name='Tutto il giorno')),
                ('ora_inizio', models.TimeField(blank=True, null=True, verbose_name='Ora inizio')),
                ('ora_fine', models.TimeField(blank=True, null=True, verbose_name='Ora fine')),
                ('chiusura_scolastica', models.BooleanField(default=False, help_text='Se True, il nido è chiuso. Integrato con registro presenze.', verbose_name='Chiusura scolastica')),
                ('notifica_inviata', models.BooleanField(default=False, verbose_name='Email notifica inviata')),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_at', models.DateTimeField(auto_now=True)),
                ('creato_da', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='eventi_creati', to=settings.AUTH_USER_MODEL)),
                ('tipo', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='eventi', to='calendario.tipoevento', verbose_name='Tipo evento')),
                ('gruppi', models.ManyToManyField(blank=True, related_name='eventi_calendario', to='config.gruppo', verbose_name='Gruppi (vuoto = tutti)')),
            ],
            options={
                'verbose_name': 'Evento calendario',
                'verbose_name_plural': 'Eventi calendario',
                'ordering': ['data_inizio', 'ora_inizio'],
            },
        ),
        migrations.AddIndex(
            model_name='eventocalendario',
            index=models.Index(fields=['data_inizio'], name='calendario__data_in_idx'),
        ),
        migrations.AddIndex(
            model_name='eventocalendario',
            index=models.Index(fields=['data_inizio', 'data_fine'], name='calendario__data_range_idx'),
        ),
    ]
