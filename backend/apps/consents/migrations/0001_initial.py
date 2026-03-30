import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('children', '0002_bambino_non_fotografabile'),
    ]

    operations = [
        migrations.CreateModel(
            name='ConsensoFotografico',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('finalita', models.CharField(
                    choices=[
                        ('uso_interno', 'Uso interno (solo staff)'),
                        ('genitori_diretti', 'Visibile ai genitori del bambino'),
                        ('newsletter_scolastica', 'Newsletter scolastica'),
                    ],
                    max_length=30,
                )),
                ('consenso_genitore1', models.BooleanField(default=False)),
                ('consenso_genitore2', models.BooleanField(blank=True, default=False, null=True)),
                ('data_consenso_genitore1', models.DateTimeField(blank=True, null=True)),
                ('data_consenso_genitore2', models.DateTimeField(blank=True, null=True)),
                ('revocato', models.BooleanField(default=False)),
                ('data_revoca', models.DateTimeField(blank=True, null=True)),
                ('note', models.TextField(blank=True)),
                ('creato_il', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_il', models.DateTimeField(auto_now=True)),
                ('bambino', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='consensi',
                    to='children.bambino',
                )),
            ],
            options={
                'verbose_name': 'Consenso Fotografico',
                'verbose_name_plural': 'Consensi Fotografici',
                'ordering': ['bambino__cognome', 'bambino__nome', 'finalita'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='consensofotografico',
            unique_together={('bambino', 'finalita')},
        ),
    ]
