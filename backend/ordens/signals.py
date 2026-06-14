import calendar
from datetime import date

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import OS, FaseOS, ArquiteturaTecnica


def _add_months(dt, months):
    m = dt.month - 1 + months
    year = dt.year + m // 12
    month = m % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


@receiver(post_save, sender=OS)
def registrar_fase_ao_salvar(sender, instance, created, **kwargs):
    if created:
        FaseOS.objects.create(
            os=instance,
            fase=instance.status,
            responsavel=instance.responsavel,
            descricao='OS criada.',
        )


@receiver(post_save, sender=OS)
def os_gera_receitas(sender, instance, **kwargs):
    if instance.status != 'CONTRATO':
        return

    from financeiro.models import Conta, Receita

    if Receita.objects.filter(os=instance).exists():
        return

    conta_padrao = Conta.objects.filter(ativo=True).first()
    if not conta_padrao:
        return

    hoje = date.today()

    if instance.valor_entrada:
        Receita.objects.create(
            tipo='ENTRADA_CONTRATO',
            descricao=f'Entrada contrato — {instance.cliente.nome_empresa}',
            cliente=instance.cliente,
            os=instance,
            valor_bruto=instance.valor_entrada,
            desconto=0,
            conta=conta_padrao,
            vencimento=hoje,
            status='PENDENTE',
        )

    if instance.valor_mensal:
        for i in range(1, 4):
            venc = _add_months(hoje.replace(day=1), i)
            Receita.objects.create(
                tipo='MENSALIDADE',
                descricao=f"Mensalidade {venc.strftime('%m/%Y')} — {instance.cliente.nome_empresa}",
                cliente=instance.cliente,
                os=instance,
                valor_bruto=instance.valor_mensal,
                desconto=0,
                conta=conta_padrao,
                vencimento=venc,
                referencia_mes=venc,
                status='PENDENTE',
            )


# Campos de stack que possuem um valor padrão Uid definido no model.
# Se algum vier diferente do default, é uma decisão de stack fora do
# padrão e precisa de ADR — vira notificação para o responsável decidir.
CAMPOS_STACK = {
    'linguagem':     'Linguagem (backend)',
    'framework':     'Framework (backend)',
    'banco':         'Banco de dados',
    'autenticacao':  'Autenticação',
    'padrao_api':    'Padrão de API',
    'frontend_fw':   'Framework (frontend)',
    'build_tool':    'Build tool',
    'estilizacao':   'Estilização',
    'estado_global': 'Estado global',
    'server_state':  'Server state',
}


@receiver(post_save, sender=ArquiteturaTecnica)
def arquitetura_verifica_stack_padrao(sender, instance, **kwargs):
    from notificacoes.models import Notificacao, PrioridadeNotificacao, TipoNotificacao

    divergencias = []
    for campo, label in CAMPOS_STACK.items():
        valor_atual = getattr(instance, campo)
        valor_padrao = ArquiteturaTecnica._meta.get_field(campo).default
        if valor_atual != valor_padrao:
            divergencias.append(f'{label}: "{valor_atual}" (padrão Uid: "{valor_padrao}")')

    referencia = f'arquitetura_tecnica:{instance.id}'

    with transaction.atomic():
        existente = (
            Notificacao.objects
            .filter(referencia=referencia, tipo=TipoNotificacao.STACK_FORA_PADRAO)
            .select_for_update()
            .first()
        )

        if not divergencias:
            if existente and not existente.resolvida:
                existente.resolvida = True
                existente.resolvida_em = timezone.now()
                existente.save()
            return

        responsavel = instance.entrevista.prospecto.responsavel
        descricao = (
            f'Projeto "{instance.projeto}" (Entrevista: {instance.entrevista.sistema}) '
            'está com stack divergente do padrão Uid:\n'
            + '\n'.join(f'- {d}' for d in divergencias)
            + '\n\nDocumentar a decisão em ADR antes de acionar Forge/Loom.'
        )
        dados = dict(
            titulo=f'Stack fora do padrão — {instance.projeto}',
            descricao=descricao,
            link='/sistema/office/novo-projeto/arquitetura-tecnica',
            prioridade=PrioridadeNotificacao.ALTA,
            perfil_destino='ADMIN',
            atribuido_a=responsavel,
            resolvida=False,
            resolvida_por=None,
            resolvida_em=None,
        )

        if existente:
            for campo, valor in dados.items():
                setattr(existente, campo, valor)
            existente.save()
        else:
            Notificacao.objects.create(
                tipo=TipoNotificacao.STACK_FORA_PADRAO,
                referencia=referencia,
                **dados,
            )


@receiver(post_save, sender=ArquiteturaTecnica)
def arquitetura_dispara_planner(sender, instance, **kwargs):
    from notificacoes.models import Notificacao, PrioridadeNotificacao, TipoNotificacao

    referencia_stack = f'arquitetura_tecnica:{instance.id}'
    referencia_planner = f'arquitetura_tecnica:{instance.id}:planner'

    with transaction.atomic():
        divergencia_pendente = (
            Notificacao.objects
            .filter(referencia=referencia_stack, tipo=TipoNotificacao.STACK_FORA_PADRAO, resolvida=False)
            .select_for_update()
            .exists()
        )
        if divergencia_pendente:
            return

        ja_disparado = (
            Notificacao.objects
            .filter(referencia=referencia_planner, tipo=TipoNotificacao.PRONTO_PARA_PLANNER)
            .select_for_update()
            .exists()
        )
        if ja_disparado:
            return

        descricao = (
            f'Arquitetura Técnica #{instance.id} do projeto "{instance.projeto}" '
            f'(Entrevista: {instance.entrevista.sistema}) está pronta, sem '
            'divergência pendente do padrão Uid. Pode acionar o Planner para '
            'iniciar o Fluxo 1.'
        )
        Notificacao.objects.create(
            tipo=TipoNotificacao.PRONTO_PARA_PLANNER,
            referencia=referencia_planner,
            titulo=f'Pronto para Planner — {instance.projeto}',
            descricao=descricao,
            link='/sistema/office/novo-projeto/arquitetura-tecnica',
            prioridade=PrioridadeNotificacao.ALTA,
            perfil_destino='ADMIN',
            atribuido_a=instance.entrevista.prospecto.responsavel,
            resolvida=False,
        )
