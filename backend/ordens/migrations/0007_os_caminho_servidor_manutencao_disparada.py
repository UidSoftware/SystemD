from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens', '0006_manutencao'),
    ]

    operations = [
        migrations.AddField(
            model_name='os',
            name='caminho_servidor',
            field=models.CharField(
                blank=True,
                help_text='Caminho do projeto no servidor VPS. Ex: /root/SystemD',
                max_length=500,
                verbose_name='Caminho no servidor',
            ),
        ),
        migrations.AddField(
            model_name='manutencao',
            name='disparada_em',
            field=models.DateTimeField(
                blank=True,
                help_text='Preenchido automaticamente pelo disparar_hotfix quando a task é criada no Empire.',
                null=True,
                verbose_name='Disparada em',
            ),
        ),
    ]
