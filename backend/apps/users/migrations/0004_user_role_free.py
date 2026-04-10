from django.db import migrations, models


class Migration(migrations.Migration):
    """Rimuove il vincolo choices da User.role e aumenta max_length a 50."""

    dependencies = [
        ('users', '0003_user_cf_indirizzo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                default='genitore',
                max_length=50,
                help_text="Codice del ruolo. Admin è l'unico ruolo hardcoded; tutti gli altri sono configurabili.",
            ),
        ),
    ]
