from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Gruppo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=100, unique=True)),
                ('colore', models.CharField(default='#6B7280', max_length=7)),
                ('ordine', models.PositiveSmallIntegerField(default=0)),
                ('attivo', models.BooleanField(default=True)),
                ('creato_il', models.DateTimeField(auto_now_add=True)),
                ('creato_da', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='gruppi_creati',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Gruppo',
                'verbose_name_plural': 'Gruppi',
                'ordering': ['ordine', 'nome'],
            },
        ),
        migrations.CreateModel(
            name='OrarioUscita',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('etichetta', models.CharField(max_length=100, unique=True)),
                ('orario', models.TimeField()),
                ('attivo', models.BooleanField(default=True)),
                ('ordine', models.PositiveSmallIntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Orario di uscita',
                'verbose_name_plural': 'Orari di uscita',
                'ordering': ['ordine', 'orario'],
            },
        ),
    ]
