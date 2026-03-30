import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Bambino',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=100)),
                ('cognome', models.CharField(max_length=100)),
                ('data_nascita', models.DateField()),
                ('codice_fiscale', models.CharField(blank=True, max_length=16, unique=True)),
                ('foto_profilo', models.ImageField(blank=True, null=True, upload_to='bambini/foto/')),
                ('sezione', models.CharField(blank=True, max_length=50)),
                ('data_iscrizione', models.DateField()),
                ('data_fine_iscrizione', models.DateField(blank=True, null=True)),
                ('note_mediche', models.TextField(blank=True)),
                ('attivo', models.BooleanField(default=True)),
                ('creato_il', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_il', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Bambino',
                'verbose_name_plural': 'Bambini',
                'ordering': ['cognome', 'nome'],
            },
        ),
        migrations.CreateModel(
            name='Famiglia',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('indirizzo', models.TextField(blank=True)),
                ('telefono_emergenza', models.CharField(max_length=20)),
                ('medico_base', models.CharField(blank=True, max_length=200)),
                ('bambino', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='famiglia',
                    to='children.bambino',
                )),
                ('genitore1', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='figli_genitore1',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('genitore2', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='figli_genitore2',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Famiglia',
                'verbose_name_plural': 'Famiglie',
            },
        ),
        migrations.CreateModel(
            name='DelegaRitiro',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome_delegato', models.CharField(max_length=100)),
                ('cognome_delegato', models.CharField(max_length=100)),
                ('documento_identita', models.CharField(max_length=50)),
                ('rapporto_familiare', models.CharField(max_length=100)),
                ('attivo', models.BooleanField(default=True)),
                ('creato_il', models.DateTimeField(auto_now_add=True)),
                ('bambino', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='deleghe_ritiro',
                    to='children.bambino',
                )),
            ],
            options={
                'verbose_name': 'Delega Ritiro',
                'verbose_name_plural': 'Deleghe Ritiro',
                'ordering': ['cognome_delegato', 'nome_delegato'],
            },
        ),
    ]
