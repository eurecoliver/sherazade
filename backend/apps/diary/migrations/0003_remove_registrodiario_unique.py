from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('children', '0002_bambino_non_fotografabile'),
        ('diary', '0002_diario_v2'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql='ALTER TABLE diary_registrodiario DROP CONSTRAINT IF EXISTS unique_registro_per_giorno;',
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.RemoveConstraint(
                    model_name='registrodiario',
                    name='unique_registro_per_giorno',
                ),
            ],
        ),
        migrations.AlterUniqueTogether(
            name='registrodiario',
            unique_together={('bambino', 'data')},
        ),
    ]