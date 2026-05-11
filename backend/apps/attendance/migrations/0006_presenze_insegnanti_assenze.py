from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0005_presenze_insegnanti_qr'),
    ]

    operations = [
        migrations.AddField(
            model_name='presenzainsegnante',
            name='presente',
            field=models.BooleanField(default=True, verbose_name='Presente'),
        ),
        migrations.AddField(
            model_name='presenzainsegnante',
            name='motivo_assenza',
            field=models.CharField(
                blank=True,
                choices=[
                    ('malattia', 'Malattia'),
                    ('ferie', 'Ferie'),
                    ('permesso', 'Permesso'),
                    ('altro', 'Altro'),
                ],
                max_length=10,
                verbose_name='Motivo assenza',
            ),
        ),
    ]
