import calendar
from datetime import date

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import OS, FaseOS


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
