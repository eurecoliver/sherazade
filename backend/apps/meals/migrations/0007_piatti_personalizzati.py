from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('meals', '0006_preferenza_menu_bambino'),
    ]

    operations = [
        migrations.AlterField(
            model_name='preferenzamenubambino',
            name='descrizione',
            field=models.CharField(
                blank=True,
                help_text='Nota aggiuntiva facoltativa. Es. "senza sale", "attenzione soffocamento".',
                max_length=200,
            ),
        ),
        migrations.AddField(
            model_name='preferenzamenubambino',
            name='piatti_alternativi',
            field=models.ManyToManyField(
                blank=True,
                help_text='Piatti alternativi tra cui il personale sceglie quale è stato servito, giorno per giorno.',
                related_name='preferenze_bambini',
                to='meals.piatto',
            ),
        ),
        migrations.AddField(
            model_name='registropasto',
            name='piatti_serviti',
            field=models.ManyToManyField(
                blank=True,
                help_text='Piatti alternativi effettivamente serviti oggi (menu personalizzato), scelti tra quelli del bambino.',
                related_name='registri_serviti',
                to='meals.piatto',
            ),
        ),
    ]
