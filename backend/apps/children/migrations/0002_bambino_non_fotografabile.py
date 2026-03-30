from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('children', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='bambino',
            name='non_fotografabile',
            field=models.BooleanField(default=False, verbose_name='Non fotografabile'),
        ),
    ]
