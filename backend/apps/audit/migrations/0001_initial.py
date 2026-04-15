import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='LogAccesso',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('timestamp', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('utente_email', models.EmailField(blank=True, max_length=254)),
                ('utente_ruolo', models.CharField(blank=True, max_length=50)),
                ('azione', models.CharField(
                    choices=[('leggi', 'Lettura'), ('crea', 'Creazione'), ('modifica', 'Modifica'), ('elimina', 'Eliminazione')],
                    db_index=True,
                    max_length=20,
                )),
                ('risorsa', models.CharField(db_index=True, max_length=100)),
                ('oggetto_id', models.CharField(blank=True, max_length=50)),
                ('dettagli', models.TextField(blank=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('utente', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='log_accessi',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Log Accesso',
                'verbose_name_plural': 'Log Accessi',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.AddIndex(
            model_name='logaccesso',
            index=models.Index(fields=['timestamp', 'risorsa'], name='audit_log_ts_risorsa_idx'),
        ),
        migrations.AddIndex(
            model_name='logaccesso',
            index=models.Index(fields=['utente', 'timestamp'], name='audit_log_utente_ts_idx'),
        ),
        migrations.AddIndex(
            model_name='logaccesso',
            index=models.Index(fields=['azione', 'timestamp'], name='audit_log_azione_ts_idx'),
        ),
    ]
