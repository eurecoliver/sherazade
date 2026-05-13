from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0001_initial'),
        ('children', '0004_anagrafica_v2'),
    ]

    operations = [
        # Rimuove il vecchio unique_together (genitore, anno, mese)
        migrations.AlterUniqueTogether(
            name='fattura',
            unique_together=set(),
        ),
        # Aggiunge FK bambino (nullable per backward-compat)
        migrations.AddField(
            model_name='fattura',
            name='bambino',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='fatture',
                to='children.bambino',
            ),
        ),
        # Nuovo constraint: famiglie mono-bambino (bambino=null) → 1 fattura per mese
        migrations.AddConstraint(
            model_name='fattura',
            constraint=models.UniqueConstraint(
                condition=models.Q(bambino__isnull=True),
                fields=['genitore', 'anno', 'mese'],
                name='unique_fattura_senza_bambino',
            ),
        ),
        # Nuovo constraint: famiglie multi-bambino → 1 fattura per bambino per mese
        migrations.AddConstraint(
            model_name='fattura',
            constraint=models.UniqueConstraint(
                condition=models.Q(bambino__isnull=False),
                fields=['genitore', 'anno', 'mese', 'bambino'],
                name='unique_fattura_per_bambino',
            ),
        ),
    ]
