from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vitrine', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='lead',
            name='convertido',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='lead',
            name='observacoes_internas',
            field=models.TextField(blank=True),
        ),
    ]
