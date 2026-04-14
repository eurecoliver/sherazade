from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import apps.portfolio.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('config', '0001_initial'),
        ('children', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AnnoScolastico',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=100, unique=True, verbose_name='Nome anno')),
                ('data_inizio', models.DateField(verbose_name='Data inizio')),
                ('data_fine', models.DateField(verbose_name='Data fine')),
                ('attivo', models.BooleanField(default=False, verbose_name='Anno corrente')),
                ('descrizione', models.TextField(blank=True, default='', verbose_name='Note (es. Campo solare)')),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('creato_da', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='anni_scolastici_creati',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Anno scolastico',
                'verbose_name_plural': 'Anni scolastici',
                'ordering': ['-data_inizio'],
            },
        ),
        migrations.CreateModel(
            name='Iscrizione',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('anno', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='iscrizioni',
                    to='portfolio.annoscolastico',
                    verbose_name='Anno scolastico',
                )),
                ('bambino', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='iscrizioni',
                    to='children.bambino',
                    verbose_name='Bambino',
                )),
                ('gruppo', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='iscrizioni',
                    to='config.gruppo',
                    verbose_name='Gruppo',
                )),
            ],
            options={
                'verbose_name': 'Iscrizione',
                'verbose_name_plural': 'Iscrizioni',
                'unique_together': {('bambino', 'anno')},
            },
        ),
        migrations.CreateModel(
            name='MediaPortfolio',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to=apps.portfolio.models._media_upload_path, verbose_name='File')),
                ('tipo', models.CharField(
                    choices=[('foto', 'Foto'), ('video', 'Video')],
                    max_length=10,
                    verbose_name='Tipo',
                )),
                ('thumbnail', models.ImageField(
                    blank=True, null=True,
                    upload_to=apps.portfolio.models._thumb_upload_path,
                    verbose_name='Thumbnail',
                )),
                ('data', models.DateField(db_index=True, verbose_name='Data')),
                ('descrizione', models.TextField(blank=True, default='', verbose_name='Descrizione')),
                ('caricato_at', models.DateTimeField(auto_now_add=True)),
                ('attivo', models.BooleanField(default=True)),
                ('anno', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='media',
                    to='portfolio.annoscolastico',
                    verbose_name='Anno scolastico',
                )),
                ('autore', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='media_portfolio_caricati',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Caricato da',
                )),
                ('gruppo', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='media_portfolio',
                    to='config.gruppo',
                    verbose_name='Gruppo',
                )),
            ],
            options={
                'verbose_name': 'Media portfolio',
                'verbose_name_plural': 'Media portfolio',
                'ordering': ['data', 'caricato_at'],
            },
        ),
        migrations.AddIndex(
            model_name='mediaportfolio',
            index=models.Index(fields=['anno', 'gruppo', 'data'], name='portfolio_anno_gruppo_data_idx'),
        ),
        migrations.AddIndex(
            model_name='mediaportfolio',
            index=models.Index(fields=['data'], name='portfolio_data_idx'),
        ),
    ]
