from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('children', '0002_bambino_non_fotografabile'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AllergiaIntolleranza',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(
                    choices=[
                        ('allergia', 'Allergia'),
                        ('intolleranza', 'Intolleranza'),
                        ('preferenza_religiosa', 'Preferenza religiosa'),
                        ('altro', 'Altro'),
                    ],
                    max_length=20,
                )),
                ('descrizione', models.CharField(max_length=200)),
                ('gravita', models.CharField(
                    choices=[
                        ('lieve', 'Lieve'),
                        ('moderata', 'Moderata'),
                        ('grave', 'Grave'),
                        ('anafilassi', 'Anafilassi (rischio vita)'),
                    ],
                    default='lieve',
                    max_length=12,
                )),
                ('note_mediche', models.TextField(blank=True)),
                ('attivo', models.BooleanField(default=True)),
                ('creato_il', models.DateTimeField(auto_now_add=True)),
                ('bambino', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='allergie',
                    to='children.bambino',
                )),
            ],
            options={
                'verbose_name': 'Allergia / Intolleranza',
                'verbose_name_plural': 'Allergie / Intolleranze',
                'ordering': ['-gravita', 'tipo', 'descrizione'],
            },
        ),
        migrations.CreateModel(
            name='MenuGiornaliero',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.DateField()),
                ('sezione', models.CharField(blank=True, max_length=50)),
                ('primo', models.CharField(blank=True, max_length=200)),
                ('secondo', models.CharField(blank=True, max_length=200)),
                ('contorno', models.CharField(blank=True, max_length=200)),
                ('frutta', models.CharField(blank=True, max_length=200)),
                ('merenda', models.CharField(blank=True, max_length=200)),
                ('bibita', models.CharField(blank=True, max_length=200)),
                ('creato_il', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_il', models.DateTimeField(auto_now=True)),
                ('inserito_da', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='menu_inseriti',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Menu Giornaliero',
                'verbose_name_plural': 'Menu Giornalieri',
                'ordering': ['-data', 'sezione'],
            },
        ),
        migrations.AddConstraint(
            model_name='menugiornaliero',
            constraint=models.UniqueConstraint(
                fields=['data', 'sezione'],
                name='unique_menu_per_data_sezione',
            ),
        ),
        migrations.CreateModel(
            name='RegistroPasto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.DateField()),
                ('primo_quantita', models.CharField(
                    blank=True,
                    choices=[
                        ('tutto', 'Tutto 🍽️'),
                        ('meta', 'Metà 🍽️½'),
                        ('poco', 'Poco 🥄'),
                        ('nulla', 'Nulla ❌'),
                    ],
                    max_length=6,
                )),
                ('secondo_quantita', models.CharField(blank=True, choices=[('tutto', 'Tutto 🍽️'), ('meta', 'Metà 🍽️½'), ('poco', 'Poco 🥄'), ('nulla', 'Nulla ❌')], max_length=6)),
                ('contorno_quantita', models.CharField(blank=True, choices=[('tutto', 'Tutto 🍽️'), ('meta', 'Metà 🍽️½'), ('poco', 'Poco 🥄'), ('nulla', 'Nulla ❌')], max_length=6)),
                ('frutta_quantita', models.CharField(blank=True, choices=[('tutto', 'Tutto 🍽️'), ('meta', 'Metà 🍽️½'), ('poco', 'Poco 🥄'), ('nulla', 'Nulla ❌')], max_length=6)),
                ('merenda_quantita', models.CharField(blank=True, choices=[('tutto', 'Tutto 🍽️'), ('meta', 'Metà 🍽️½'), ('poco', 'Poco 🥄'), ('nulla', 'Nulla ❌')], max_length=6)),
                ('note_pasto', models.TextField(blank=True)),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_at', models.DateTimeField(auto_now=True)),
                ('bambino', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='registri_pasto',
                    to='children.bambino',
                )),
                ('compilato_da', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='pasti_compilati',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Registro Pasto',
                'verbose_name_plural': 'Registri Pasto',
                'ordering': ['-data', 'bambino__cognome', 'bambino__nome'],
            },
        ),
        migrations.AddConstraint(
            model_name='registropasto',
            constraint=models.UniqueConstraint(
                fields=['bambino', 'data'],
                name='unique_pasto_per_bambino_data',
            ),
        ),
    ]
