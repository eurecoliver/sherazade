from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('meals', '0005_piatto_date_stagionali'),
        ('children', '0004_anagrafica_v2'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Aggiunge tipo_menu a RegistroPasto
        migrations.AddField(
            model_name='registropasto',
            name='tipo_menu',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Override giornaliero del tipo menu. Vuoto = usa preferenza permanente del bambino.',
                max_length=12,
            ),
        ),
        # Crea il modello PreferenzaMenuBambino
        migrations.CreateModel(
            name='PreferenzaMenuBambino',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(
                    choices=[('monopiatto', 'Monopiatto'), ('differente', 'Menu differente')],
                    max_length=12,
                )),
                ('descrizione', models.CharField(
                    blank=True,
                    help_text='Es. "pastina al burro", "menu divezzi", "senza carne".',
                    max_length=200,
                )),
                ('attivo', models.BooleanField(default=True)),
                ('creato_il', models.DateTimeField(auto_now_add=True)),
                ('aggiornato_il', models.DateTimeField(auto_now=True)),
                ('bambino', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='preferenza_menu',
                    to='children.bambino',
                )),
                ('creato_da', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='preferenze_menu_create',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Preferenza Menu Bambino',
                'verbose_name_plural': 'Preferenze Menu Bambini',
            },
        ),
    ]
