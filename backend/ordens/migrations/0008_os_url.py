from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens', '0007_os_caminho_servidor_manutencao_disparada'),
    ]

    operations = [
        migrations.AddField(
            model_name='os',
            name='url',
            field=models.URLField(
                blank=True,
                verbose_name='URL do sistema',
                help_text='Ex: https://uidsoftware.com.br',
            ),
        ),
    ]
