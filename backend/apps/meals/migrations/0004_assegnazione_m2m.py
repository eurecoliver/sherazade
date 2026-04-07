from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('meals', '0003_pappe_v2'),
        ('config', '0001_initial'),
    ]

    operations = [
        # 1. Rimuovi unique_together (piatto, gruppo)
        migrations.AlterUniqueTogether(
            name='piattoassegnazione',
            unique_together=set(),
        ),
        # 2. Aggiungi M2M gruppi
        migrations.AddField(
            model_name='piattoassegnazione',
            name='gruppi',
            field=models.ManyToManyField(
                blank=True,
                help_text='Gruppi a cui è assegnato questo piatto nel ciclo.',
                related_name='piatti_assegnati',
                to='config.gruppo',
            ),
        ),
        # 3. Rimuovi FK gruppo
        migrations.RemoveField(
            model_name='piattoassegnazione',
            name='gruppo',
        ),
    ]
