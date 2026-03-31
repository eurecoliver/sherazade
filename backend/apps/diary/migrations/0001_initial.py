from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import apps.diary.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('children', '0002_bambino_non_fotografabile'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RegistroDiario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.DateField()),
                ('umore', models.CharField(
                    blank=True,
                    choices=[
                        ('felice', 'Felice 😊'),
                        ('sereno', 'Sereno 🙂'),
                        ('stanco', 'Stanco 😴'),
                        ('agitato', 'Agitato 😤'),
                        ('triste', 'Triste 😢'),
                    ],
                    max_length=10,
                )),
                ('attivita_descrizione', models.TextField(blank=True)),
                ('note_giornata', models.TextField(blank=True)),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_at', models.DateTimeField(auto_now=True)),
                ('bambino', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='registri_diario',
                    to='children.bambino',
                )),
                ('autore', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='registri_compilati',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Registro Diario',
                'verbose_name_plural': 'Registri Diario',
                'ordering': ['-data', 'bambino__cognome', 'bambino__nome'],
            },
        ),
        migrations.CreateModel(
            name='MediaDiario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to=apps.diary.models._media_upload_path)),
                ('tipo', models.CharField(
                    choices=[('foto', 'Foto'), ('video', 'Video')],
                    default='foto',
                    max_length=5,
                )),
                ('thumbnail', models.ImageField(blank=True, null=True, upload_to='diario/thumbnails/')),
                ('visibile_a_genitori', models.BooleanField(default=True)),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('registro', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='media',
                    to='diary.registrodiario',
                )),
                ('caricato_da', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='media_caricati',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Media Diario',
                'verbose_name_plural': 'Media Diario',
                'ordering': ['creato_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='registrodiario',
            constraint=models.UniqueConstraint(
                fields=['bambino', 'data'],
                name='unique_registro_per_giorno',
            ),
        ),
    ]
