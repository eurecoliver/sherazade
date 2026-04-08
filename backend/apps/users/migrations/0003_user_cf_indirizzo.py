from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_alter_user_groups_alter_user_is_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='codice_fiscale',
            field=models.CharField(blank=True, max_length=16),
        ),
        migrations.AddField(
            model_name='user',
            name='indirizzo',
            field=models.TextField(blank=True),
        ),
    ]
