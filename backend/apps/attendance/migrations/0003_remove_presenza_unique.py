from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0002_presenza_ritardi'),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE attendance_presenza DROP CONSTRAINT IF EXISTS unique_presenza_per_bambino_data;',
            reverse_sql='ALTER TABLE attendance_presenza ADD CONSTRAINT unique_presenza_per_bambino_data UNIQUE (bambino_id, data);',
        ),
    ]