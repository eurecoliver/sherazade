from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Fattura',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('anno', models.IntegerField()),
                ('mese', models.IntegerField()),
                ('importo', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('file', models.FileField(blank=True, null=True, upload_to='fatture/')),
                ('note', models.CharField(blank=True, max_length=255)),
                ('caricato_at', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_at', models.DateTimeField(auto_now=True)),
                ('caricato_da', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fatture_caricate', to=settings.AUTH_USER_MODEL)),
                ('genitore', models.ForeignKey(limit_choices_to={'role': 'genitore'}, on_delete=django.db.models.deletion.CASCADE, related_name='fatture', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-anno', '-mese'],
                'unique_together': {('genitore', 'anno', 'mese')},
            },
        ),
    ]
