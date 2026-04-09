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
            name='Circolare',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titolo', models.CharField(max_length=200, verbose_name='Titolo')),
                ('testo', models.TextField(verbose_name='Testo')),
                ('allegato', models.FileField(blank=True, null=True, upload_to='circolari/%Y/%m/', verbose_name='Allegato (PDF/immagine)')),
                ('pubblicata', models.BooleanField(default=False, help_text='Se False è una bozza, visibile solo ad admin/direttrice.', verbose_name='Pubblicata')),
                ('notifica_inviata', models.BooleanField(default=False, verbose_name='Email notifica inviata')),
                ('creato_at', models.DateTimeField(auto_now_add=True, verbose_name='Data creazione')),
                ('aggiornato_at', models.DateTimeField(auto_now=True)),
                ('autore', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='circolari_inviate', to=settings.AUTH_USER_MODEL, verbose_name='Autore')),
                ('gruppi', models.ManyToManyField(blank=True, related_name='circolari', to='config.gruppo', verbose_name='Gruppi destinatari (vuoto = tutti)')),
            ],
            options={
                'verbose_name': 'Circolare',
                'verbose_name_plural': 'Circolari',
                'ordering': ['-creato_at'],
            },
        ),
        migrations.CreateModel(
            name='LetturaCircolare',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('letto_at', models.DateTimeField(auto_now_add=True)),
                ('circolare', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='letture', to='messaggi.circolare')),
                ('utente', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='circolari_lette', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Lettura circolare',
                'verbose_name_plural': 'Letture circolari',
                'unique_together': {('circolare', 'utente')},
            },
        ),
        migrations.AddIndex(
            model_name='circolare',
            index=models.Index(fields=['-creato_at'], name='messaggi_ci_creato__idx'),
        ),
        migrations.AddIndex(
            model_name='circolare',
            index=models.Index(fields=['pubblicata'], name='messaggi_ci_pubblic_idx'),
        ),
    ]
