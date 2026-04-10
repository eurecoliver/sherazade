from django.db import migrations, models


class Migration(migrations.Migration):
    """Aggiunge il modello Ruolo e libera PermessoRuolo.ruolo dai choices."""

    dependencies = [
        ('config', '0003_seed_permessi'),
    ]

    operations = [
        migrations.CreateModel(
            name='Ruolo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codice', models.SlugField(max_length=50, unique=True, help_text='Usato come User.role')),
                ('nome', models.CharField(max_length=100)),
                ('sistema', models.BooleanField(default=False, help_text='Se True non può essere eliminato')),
                ('ordine', models.PositiveSmallIntegerField(default=0)),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Ruolo',
                'verbose_name_plural': 'Ruoli',
                'ordering': ['ordine', 'nome'],
            },
        ),
        migrations.AlterField(
            model_name='permessoruolo',
            name='ruolo',
            field=models.CharField(
                max_length=50,
                help_text='Codice del Ruolo (es. direttrice, insegnante, custom_xyz)',
            ),
        ),
    ]
