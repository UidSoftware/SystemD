# Gerada manualmente (sem rodar makemigrations na VPS, regra padrao) —
# adiciona os campos da esteira em fila (Kanban) em Manutencao. Ver
# plano_execucao.md na raiz do repo pra contexto completo.
#
# Todos os campos sao aditivos com default seguro (nenhum NOT NULL sem
# default, nenhuma alteracao/remocao de campo existente) -- disparada_em
# e feito continuam existindo e funcionando exatamente como antes.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens', '0010_os_api_key_criada_em_os_api_key_hash_and_more'),
    ]

    operations = [
        migrations.AddField(
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
                max_length=20,
                verbose_name='Etapa',
            ),
        ),
        migrations.AddField(
            model_name='manutencao',
            name='etapa_atualizada_em',
            field=models.DateTimeField(auto_now=True, verbose_name='Etapa atualizada em'),
        ),
        migrations.AddField(
            model_name='manutencao',
            name='bloqueio_motivo',
            field=models.TextField(blank=True, verbose_name='Motivo do bloqueio'),
        ),
        migrations.AddField(
            model_name='manutencao',
            name='bloqueada_em',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Bloqueada em'),
        ),
        migrations.AddField(
            model_name='manutencao',
            name='tentativas_etapa',
            field=models.PositiveSmallIntegerField(default=0, verbose_name='Tentativas na etapa atual'),
        ),
    ]
