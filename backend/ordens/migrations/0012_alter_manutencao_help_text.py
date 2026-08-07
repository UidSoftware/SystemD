# Gerada manualmente (sem rodar makemigrations na VPS, regra padrao) —
# a migration 0011 esqueceu de incluir help_text nos AddField, embora
# os models.py ja tivessem. Sem efeito nenhum no schema real (help_text
# nao vira coluna nem constraint no banco, e' so metadado do Django) —
# so fecha a divergencia que makemigrations --check --dry-run apontava.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens', '0011_manutencao_etapa'),
    ]

    operations = [
        migrations.AlterField(
            model_name='manutencao',
            name='bloqueio_motivo',
            field=models.TextField(
                blank=True,
                help_text='Preenchido quando etapa=BLOQUEADA (ex: "aguardando aprovação comercial").',
                verbose_name='Motivo do bloqueio',
            ),
        ),
        migrations.AlterField(
            model_name='manutencao',
            name='etapa',
            field=models.CharField(
                choices=[
                    ('PENDENTE', 'Pendente'),
                    ('ORDEM_CRIADA', 'Ordem criada (Planner)'),
                    ('ESPEC_CRIADA', 'Especificação criada (Analista)'),
                    ('BACKEND_PRONTO', 'Backend pronto (Forge)'),
                    ('FRONTEND_PRONTO', 'Frontend pronto (Loom)'),
                    ('SENTINEL_APROVADO', 'Aprovado pelo Sentinel'),
                    ('SENTINEL_REPROVADO', 'Reprovado pelo Sentinel'),
                    ('DEPLOYADO', 'Deployado (Pilot)'),
                    ('BLOQUEADA', 'Bloqueada — precisa de decisão humana'),
                ],
                default='PENDENTE',
                help_text='Coluna do Kanban — avançada pelos crons de disparar_etapa.py.',
                max_length=20,
                verbose_name='Etapa',
            ),
        ),
        migrations.AlterField(
            model_name='manutencao',
            name='etapa_atualizada_em',
            field=models.DateTimeField(
                auto_now=True,
                help_text='Sinal de silêncio prolongado — etapa parada há muito tempo sem avançar.',
                verbose_name='Etapa atualizada em',
            ),
        ),
        migrations.AlterField(
            model_name='manutencao',
            name='tentativas_etapa',
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text='Reseta a cada troca de etapa — retry de rate limit não conta como tentativa.',
                verbose_name='Tentativas na etapa atual',
            ),
        ),
    ]
