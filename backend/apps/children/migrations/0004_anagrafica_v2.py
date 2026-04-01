from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('children', '0003_bambino_gruppo_orario_uscita'),
    ]

    operations = [
        migrations.AddField(
            model_name='bambino',
            name='alias_nome',
            field=models.CharField(blank=True, max_length=100, verbose_name='Nome alias/soprannome'),
        ),
        migrations.AddField(
            model_name='bambino',
            name='alias_attivo',
            field=models.BooleanField(default=False, verbose_name='Mostra alias ai genitori'),
        ),
        migrations.AddField(
            model_name='famiglia',
            name='genitore1_codice_fiscale',
            field=models.CharField(blank=True, max_length=16),
        ),
        migrations.AddField(
            model_name='famiglia',
            name='genitore1_indirizzo',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='famiglia',
            name='genitore2_codice_fiscale',
            field=models.CharField(blank=True, max_length=16),
        ),
        migrations.AddField(
            model_name='famiglia',
            name='genitore2_indirizzo',
            field=models.TextField(blank=True),
        ),
    ]
