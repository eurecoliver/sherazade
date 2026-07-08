from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('meals', '0004_assegnazione_m2m'),
    ]

    operations = [
        migrations.AddField(
            model_name='piatto',
            name='data_inizio',
            field=models.DateField(
                blank=True,
                null=True,
                help_text='Dal (incluso). Vuoto = nessun limite. Es. 01/04 per menu estivo.',
            ),
        ),
        migrations.AddField(
            model_name='piatto',
            name='data_fine',
            field=models.DateField(
                blank=True,
                null=True,
                help_text='Al (incluso). Vuoto = nessun limite. Es. 31/10 per menu estivo.',
            ),
        ),
    ]
