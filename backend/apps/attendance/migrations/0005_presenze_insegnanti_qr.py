from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0004_qr_checkin'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='configurazionecheckin',
            name='qr_insegnanti_abilitato',
            field=models.BooleanField(default=True, verbose_name='QR Check-in insegnanti abilitato'),
        ),
        migrations.CreateModel(
            name='DailyQRCodeTokenInsegnanti',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.DateField(unique=True)),
                ('token', models.CharField(max_length=64, unique=True)),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('creato_da', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='qr_tokens_insegnanti_generati',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Token QR Giornaliero Insegnanti',
                'verbose_name_plural': 'Token QR Giornalieri Insegnanti',
                'ordering': ['-data'],
            },
        ),
        migrations.CreateModel(
            name='PresenzaInsegnante',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.DateField()),
                ('ora_entrata', models.TimeField(blank=True, null=True)),
                ('ora_uscita', models.TimeField(blank=True, null=True)),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_at', models.DateTimeField(auto_now=True)),
                ('insegnante', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='presenze_insegnante', to=settings.AUTH_USER_MODEL)),
                ('registrato_da', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='presenze_insegnanti_registrate', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Presenza insegnante',
                'verbose_name_plural': 'Presenze insegnanti',
                'ordering': ['-data', 'insegnante__last_name', 'insegnante__first_name'],
                'constraints': [models.UniqueConstraint(fields=('insegnante', 'data'), name='uniq_presenza_insegnante_data')],
            },
        ),
    ]
