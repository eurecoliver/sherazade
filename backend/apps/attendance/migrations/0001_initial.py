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
            name='Presenza',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.DateField()),
                ('presente', models.BooleanField()),
                ('ora_arrivo', models.TimeField(blank=True, null=True)),
                ('ora_uscita', models.TimeField(blank=True, null=True)),
                ('assenza_comunicata', models.BooleanField(
                    default=False,
                    verbose_name='Assenza comunicata dal genitore',
                )),
                ('motivo_assenza', models.CharField(
                    blank=True,
                    choices=[
                        ('malattia', 'Malattia'),
                        ('famiglia', 'Motivi familiari'),
                        ('vacanza', 'Vacanza'),
                        ('altro', 'Altro'),
                    ],
                    max_length=10,
                )),
                ('note', models.TextField(blank=True)),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_at', models.DateTimeField(auto_now=True)),
                ('bambino', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='presenze',
                    to='children.bambino',
                )),
                ('registrato_da', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='presenze_registrate',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Presenza',
                'verbose_name_plural': 'Presenze',
                'ordering': ['-data', 'bambino__cognome', 'bambino__nome'],
            },
        ),
        migrations.AddConstraint(
            model_name='presenza',
            constraint=models.UniqueConstraint(
                fields=['bambino', 'data'],
                name='unique_presenza_per_bambino_data',
            ),
        ),
    ]
