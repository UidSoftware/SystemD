# Gerada manualmente (sem rodar makemigrations na VPS, regra padrao) —
# adiciona o tipo 'ordem' (Ordem do Planner) ao TIPO de Artefato, pra
# suportar a esteira em fila (ver plano_execucao.md).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('artefatos', '0002_alter_artefato_tipo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='artefato',
            name='tipo',
            field=models.CharField(choices=[('ordem', 'Ordem (Planner)'), ('levantamento_requisitos', 'Levantamento de Requisitos'), ('uml_usecase', 'UML — Casos de Uso'), ('uml_classes', 'UML — Classes'), ('uml_activity', 'UML — Atividades'), ('uml_sequencia', 'UML — Sequência'), ('uml_estado', 'UML — Estado'), ('uml_componentes', 'UML — Componentes'), ('uml_implantacao', 'UML — Implantação'), ('dicionario_dados', 'Dicionário de Dados'), ('regras_negocio', 'Regras de Negócio'), ('design_system', 'Design System'), ('adr', 'ADR'), ('contrato_servico', 'Contrato de Serviço (documento)'), ('especificacao_hotfix', 'Especificação de Hotfix'), ('especificacao_ui_hotfix', 'Especificação de UI (Hotfix)'), ('relatorio_qa', 'Relatório de QA'), ('deploy_info', 'Informações de Deploy'), ('outro', 'Outro')], max_length=30),
        ),
    ]
