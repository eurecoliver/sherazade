from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('diary', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TagCosaPortare',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=100, unique=True)),
                ('attivo', models.BooleanField(default=True)),
                ('creato_at', models.DateTimeField(auto_now_add=True)),
                ('creato_da', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='tags_creati',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Tag Cosa Portare',
                'verbose_name_plural': 'Tag Cosa Portare',
                'ordering': ['nome'],
            },
        ),
        migrations.AddField(
            model_name='registrodiario',
            name='sonno_mattina_inizio',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='registrodiario',
            name='sonno_mattina_fine',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='registrodiario',
            name='sonno_pomeriggio_inizio',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='registrodiario',
            name='sonno_pomeriggio_fine',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='registrodiario',
            name='popo',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='registrodiario',
            name='tags_cosa_portare',
            field=models.ManyToManyField(
                blank=True,
                related_name='registri',
                to='diary.tagcosaportare',
            ),
        ),
    ]
