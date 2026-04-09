from datetime import date

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('config', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='NotaGiornata',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('testo', models.TextField(verbose_name='Testo nota')),
                ('data', models.DateField(db_index=True, default=date.today, verbose_name='Data')),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_at', models.DateTimeField(auto_now=True)),
                ('attivo', models.BooleanField(default=True, verbose_name='Attivo (soft-delete)')),
                ('autore', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='note_giornata',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Autore',
                )),
                ('gruppo', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='note_giornata',
                    to='config.gruppo',
                    verbose_name='Gruppo (null = tutti)',
                )),
            ],
            options={
                'verbose_name': 'Nota giornata',
                'verbose_name_plural': 'Note giornata',
                'ordering': ['-creato_at'],
                'indexes': [
                    models.Index(fields=['data', 'attivo'], name='notes_nota_data_attivo_idx'),
                ],
            },
        ),
    ]
