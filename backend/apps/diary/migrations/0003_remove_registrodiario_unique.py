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
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        DO $$ BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint
                                WHERE conname = 'diary_registrodiario_bambino_id_data_3748c1b5_uniq'
                            ) THEN
                                ALTER TABLE diary_registrodiario
                                ADD CONSTRAINT diary_registrodiario_bambino_id_data_3748c1b5_uniq
                                UNIQUE (bambino_id, data);
                            END IF;
                        END $$;
                    """,
                    reverse_sql='ALTER TABLE diary_registrodiario DROP CONSTRAINT IF EXISTS diary_registrodiario_bambino_id_data_3748c1b5_uniq;',
                ),
            ],
            state_operations=[
                migrations.AlterUniqueTogether(
                    name='registrodiario',
                    unique_together={('bambino', 'data')},
                ),
            ],
        ),
    ]