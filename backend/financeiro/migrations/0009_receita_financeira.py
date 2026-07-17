from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0008_padrao_seguro_conciliacao'),
    ]

    operations = [
        migrations.AlterField(
            model_name='receita',
            name='tipo',
            field=models.CharField(
                choices=[
                    ('ENTRADA_CONTRATO', 'Entrada de Contrato'),
                    ('MENSALIDADE', 'Mensalidade'),
                    ('CONSULTORIA', 'Consultoria Avulsa'),
                    ('RECEITA_FINANCEIRA', 'Receita Financeira'),
                    ('OUTRO', 'Outro'),
                ],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='padraoseguroconciliacao',
            name='natureza',
            field=models.CharField(
                choices=[
                    ('APORTE', 'Aporte (capital social)'),
                    ('RECEITA_FINANCEIRA', 'Receita Financeira (rendimento)'),
                ],
                default='APORTE',
                help_text=(
                    'Só relevante para tipo=ENTRADA — Aporte vira Patrimônio Líquido '
                    '(nunca entra no DRE); Receita Financeira entra no DRE como '
                    'rendimento, separado da receita operacional.'
                ),
                max_length=20,
            ),
        ),
    ]
