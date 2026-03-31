from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('children', '0002_bambino_non_fotografabile'),
        ('config', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='bambino',
            name='sezione',
        ),
        migrations.AddField(
            model_name='bambino',
            name='gruppo',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='bambini',
                to='config.gruppo',
            ),
        ),
        migrations.AddField(
            model_name='bambino',
            name='orario_uscita',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='bambini',
                to='config.orariouscita',
            ),
        ),
    ]
