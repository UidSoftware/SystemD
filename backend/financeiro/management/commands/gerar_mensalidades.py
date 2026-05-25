"""
Gera Receitas de mensalidade para OS ativas no mês seguinte.
Idempotente — não duplica se já existe Receita para a OS no mês.
"""
import calendar
from datetime import date

from django.core.management.base import BaseCommand


def _add_months(dt, months):
    m = dt.month - 1 + months
    year = dt.year + m // 12
    month = m % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)

from financeiro.models import Conta, Receita
from ordens.models import OS

MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
         'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']


class Command(BaseCommand):
    help = 'Gera Receitas de mensalidade para OS em CONTRATO ou MANUTENCAO no mês seguinte.'

    def add_arguments(self, parser):
        parser.add_argument('--mes',     type=int)
        parser.add_argument('--ano',     type=int)
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        hoje    = date.today()
        proximo = _add_months(hoje.replace(day=1), 1)
        mes     = options.get('mes') or proximo.month
        ano     = options.get('ano') or proximo.year
        dry_run = options.get('dry_run', False)

        alvo = date(ano, mes, 1)
        modo = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(f'{modo}Gerando mensalidades para {MESES[mes-1]}/{ano}...\n')

        conta_padrao = Conta.objects.filter(ativo=True).first()
        if not conta_padrao:
            self.stdout.write(self.style.ERROR('Nenhuma conta ativa encontrada.'))
            return

        os_ativas = OS.objects.filter(
            status__in=['CONTRATO', 'MANUTENCAO'],
            ativo=True,
            valor_mensal__isnull=False,
        ).select_related('cliente')

        criadas = ignoradas = 0
        for os in os_ativas:
            if not os.valor_mensal:
                ignoradas += 1
                continue
            ja_existe = Receita.objects.filter(
                os=os, tipo='MENSALIDADE',
                referencia_mes__year=ano,
                referencia_mes__month=mes,
            ).exists()
            if ja_existe:
                ignoradas += 1
                continue

            descricao = f"Mensalidade {MESES[mes-1]}/{ano} — {os.cliente.nome_empresa}"
            if not dry_run:
                Receita.objects.create(
                    tipo='MENSALIDADE',
                    descricao=descricao,
                    cliente=os.cliente,
                    os=os,
                    valor_bruto=os.valor_mensal,
                    desconto=0,
                    conta=conta_padrao,
                    vencimento=alvo,
                    referencia_mes=alvo,
                    status='PENDENTE',
                )
            criadas += 1
            self.stdout.write(f'  {descricao} — R$ {os.valor_mensal}')

        self.stdout.write(self.style.SUCCESS(
            f'\n{modo}Criadas: {criadas} | Ignoradas: {ignoradas}'
        ))
