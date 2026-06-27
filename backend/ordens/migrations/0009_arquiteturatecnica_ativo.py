from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens', '0008_os_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='arquiteturatecnica',
            name='ativo',
            field=models.BooleanField(default=True),
        ),
    ]
