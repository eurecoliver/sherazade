from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='presenza',
            name='minuti_ritardo_arrivo',
            field=models.IntegerField(blank=True, null=True, verbose_name='Minuti di ritardo arrivo'),
        ),
        migrations.AddField(
            model_name='presenza',
            name='minuti_ritardo_uscita',
            field=models.IntegerField(blank=True, null=True, verbose_name='Minuti di ritardo uscita'),
        ),
    ]
