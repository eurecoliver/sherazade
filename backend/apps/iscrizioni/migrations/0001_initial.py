from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('children', '0004_anagrafica_v2'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ConfigurazioneIscrizioni',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('aperto', models.BooleanField(default=False, verbose_name='Iscrizioni aperte')),
                ('anno_scolastico', models.CharField(blank=True, default='', max_length=20, verbose_name='Anno scolastico (es. 2026-2027)')),
                ('data_apertura', models.DateField(blank=True, null=True)),
                ('data_chiusura', models.DateField(blank=True, null=True)),
                ('messaggio_benvenuto', models.TextField(blank=True, default='Compila il modulo per iscrivere tuo figlio al nido.')),
                ('messaggio_chiuso', models.TextField(blank=True, default='Le iscrizioni sono attualmente chiuse. Riprova più tardi.')),
                ('invia_email_conferma', models.BooleanField(default=True, verbose_name='Invia email di conferma al genitore')),
                ('aggiornato_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Configurazione Iscrizioni',
            },
        ),
        migrations.CreateModel(
            name='RichiestaIscrizione',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bambino_nome', models.CharField(max_length=100)),
                ('bambino_cognome', models.CharField(max_length=100)),
                ('bambino_data_nascita', models.DateField()),
                ('bambino_codice_fiscale', models.CharField(blank=True, max_length=16)),
                ('bambino_note_mediche', models.TextField(blank=True)),
                ('g1_nome', models.CharField(max_length=100)),
                ('g1_cognome', models.CharField(max_length=100)),
                ('g1_email', models.EmailField(max_length=254)),
                ('g1_telefono', models.CharField(max_length=20)),
                ('g1_codice_fiscale', models.CharField(blank=True, max_length=16)),
                ('g1_indirizzo', models.TextField(blank=True)),
                ('g2_nome', models.CharField(blank=True, max_length=100)),
                ('g2_cognome', models.CharField(blank=True, max_length=100)),
                ('g2_email', models.EmailField(blank=True, max_length=254)),
                ('g2_telefono', models.CharField(blank=True, max_length=20)),
                ('anno_scolastico', models.CharField(blank=True, max_length=20)),
                ('stato', models.CharField(choices=[('in_attesa', 'In attesa'), ('approvata', 'Approvata'), ('rifiutata', 'Rifiutata'), ('lista_attesa', "Lista d'attesa")], default='in_attesa', max_length=12)),
                ('note_genitore', models.TextField(blank=True)),
                ('note_admin', models.TextField(blank=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_at', models.DateTimeField(auto_now=True)),
                ('assegnato_a', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='richieste_assegnate', to=settings.AUTH_USER_MODEL)),
                ('bambino', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='richiesta_iscrizione', to='children.bambino')),
            ],
            options={
                'verbose_name': 'Richiesta di Iscrizione',
                'verbose_name_plural': 'Richieste di Iscrizione',
                'ordering': ['-creato_at'],
            },
        ),
    ]
