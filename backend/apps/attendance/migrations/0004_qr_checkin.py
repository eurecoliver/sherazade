from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0003_remove_presenza_unique'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ConfigurazioneCheckin',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('qr_abilitato', models.BooleanField(default=True, verbose_name='QR Check-in abilitato')),
            ],
            options={
                'verbose_name': 'Configurazione Check-in',
            },
        ),
        migrations.CreateModel(
            name='DailyQRCodeToken',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.DateField(unique=True)),
                ('token', models.CharField(max_length=64, unique=True)),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('creato_da', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='qr_tokens_generati',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Token QR Giornaliero',
                'verbose_name_plural': 'Token QR Giornalieri',
                'ordering': ['-data'],
            },
        ),
    ]
