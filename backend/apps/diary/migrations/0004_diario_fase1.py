from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('diary', '0003_remove_registrodiario_unique'),
    ]

    operations = [
        # Tag: aggiunto campo colore
        migrations.AddField(
            model_name='tagcosaportare',
            name='colore',
            field=models.CharField(default='#0984E3', max_length=7, verbose_name='Colore (hex)'),
        ),
        # Sonno: rimozione 4 campi mattina/pomeriggio
        migrations.RemoveField(model_name='registrodiario', name='sonno_mattina_inizio'),
        migrations.RemoveField(model_name='registrodiario', name='sonno_mattina_fine'),
        migrations.RemoveField(model_name='registrodiario', name='sonno_pomeriggio_inizio'),
        migrations.RemoveField(model_name='registrodiario', name='sonno_pomeriggio_fine'),
        # Sonno: aggiunta 2 campi unificati
        migrations.AddField(
            model_name='registrodiario',
            name='sonno_inizio',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='registrodiario',
            name='sonno_fine',
            field=models.TimeField(blank=True, null=True),
        ),
    ]
