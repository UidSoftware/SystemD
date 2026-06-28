from django.core.management.base import BaseCommand
from django.db import transaction

from financeiro.models import Conta, LivroCaixa


class Command(BaseCommand):
    help = 'Reconstrói saldo_anterior/saldo_atual do LivroCaixa em ordem cronológica por conta'

    def handle(self, *args, **options):
        contas = Conta.objects.all()
        for conta in contas:
            self.stdout.write(f'Reconstruindo conta: {conta.nome}')
            with transaction.atomic():
                lancamentos = list(
                    LivroCaixa.objects.filter(conta=conta)
                    .order_by('data', 'criado_em')
                    .select_for_update()
                )
                if not lancamentos:
                    self.stdout.write(f'  Sem lançamentos — ignorando')
                    continue

                saldo = conta.saldo_inicial
                for lc in lancamentos:
                    lc.saldo_anterior = saldo
                    if lc.tipo == 'ENTRADA':
                        saldo += lc.valor
                    else:
                        saldo -= lc.valor
                    lc.saldo_atual = saldo

                LivroCaixa.objects.bulk_update(lancamentos, ['saldo_anterior', 'saldo_atual'])
                self.stdout.write(self.style.SUCCESS(
                    f'  {len(lancamentos)} lançamentos corrigidos — saldo final: R${saldo}'
                ))

        self.stdout.write(self.style.SUCCESS('Concluído.'))
