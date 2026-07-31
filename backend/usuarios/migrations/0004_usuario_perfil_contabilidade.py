from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0003_setor_usuario_perfil_setor'),
    ]

    operations = [
        migrations.AlterField(
            model_name='usuario',
            name='perfil',
            field=models.CharField(
                choices=[
                    ('ADMIN', 'Administrador'),
                    ('FINANCEIRO', 'Financeiro'),
                    ('OPERACIONAL', 'Operacional'),
                    ('CLIENTE', 'Cliente'),
                    ('CONTABILIDADE', 'Contabilidade'),
                ],
                default='OPERACIONAL',
                max_length=20,
            ),
        ),
    ]
