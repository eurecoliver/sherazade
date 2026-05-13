from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0007_alter_configurazionecheckin_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='presenza',
            name='via_qr',
            field=models.BooleanField(default=False, verbose_name='Registrata via QR'),
        ),
        migrations.AddField(
            model_name='presenzainsegnante',
            name='via_qr',
            field=models.BooleanField(default=False, verbose_name='Registrata via QR'),
        ),
    ]
