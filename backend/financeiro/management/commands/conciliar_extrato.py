"""Management command: conciliar_extrato."""
import re
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from financeiro.models import (
    Aporte, Categoria, Conta, ConciliacaoExtrato, Despesa, ItemConciliacao,
    LivroCaixa, TipoLancamento,
)
from financeiro.parsers import extrair_texto_pdf, inferir_categoria_descricao, parse_btg, parse_c6


class Command(BaseCommand):
    help = 'Concilia extrato bancário PDF com o LivroCaixa do SystemD.'

    def add_arguments(self, parser):
        parser.add_argument('--arquivo', required=True, help='Caminho para o PDF do extrato')
        parser.add_argument('--conta',   required=True, help='Nome da conta (C6 ou BTG)')
        parser.add_argument('--mes',     default=None,  help='Período YYYY-MM (inferido do nome do arquivo se omitido)')
        parser.add_argument('--criar',   action='store_true', help='Criar lançamentos faltantes no sistema')
        parser.add_argument('--senha',   default='609393', help='Senha do PDF (padrão: 609393)')

    def handle(self, *args, **options):
        arquivo  = options['arquivo']
        nome_conta = options['conta'].upper()
        mes_str  = options['mes']
        criar    = options['criar']
        senha    = options['senha']

        # Resolve conta
        try:
            conta = Conta.objects.get(nome__iexact=nome_conta, ativo=True)
        except Conta.DoesNotExist:
            raise CommandError(f'Conta "{nome_conta}" não encontrada.')

        # Infere período
        if mes_str:
            try:
                periodo = datetime.strptime(mes_str + '-01', '%Y-%m-%d').date()
            except ValueError:
                raise CommandError(f'Formato inválido para --mes: use YYYY-MM')
        else:
            m = re.search(r'(\d{4})-(\d{2})', Path(arquivo).name)
            if m:
                periodo = date(int(m.group(1)), int(m.group(2)), 1)
            else:
                raise CommandError('Não foi possível inferir o mês. Use --mes YYYY-MM.')

        self.stdout.write(f'\n📄 Processando: {Path(arquivo).name}')
        self.stdout.write(f'   Conta : {conta.nome}')
        self.stdout.write(f'   Período: {periodo.strftime("%m/%Y")}\n')

        # Extrai texto do PDF
        try:
            texto = extrair_texto_pdf(arquivo, senha=senha)
        except Exception as e:
            raise CommandError(f'Erro ao ler PDF: {e}')

        # Parseia de acordo com o banco
        ano = periodo.year
        if 'C6' in nome_conta:
            transacoes_banco = parse_c6(texto, ano=ano)
        else:
            transacoes_banco = parse_btg(texto, ano=ano)

        # Filtra só o mês do período
        transacoes_banco = [
            t for t in transacoes_banco
            if t['data'].year == periodo.year and t['data'].month == periodo.month
        ]

        self.stdout.write(f'   Transações no extrato: {len(transacoes_banco)}')

        # Busca lançamentos no sistema para o período
        primeiro_dia = periodo
        if periodo.month == 12:
            ultimo_dia = date(periodo.year + 1, 1, 1)
        else:
            ultimo_dia = date(periodo.year, periodo.month + 1, 1)

        lancamentos_sistema = list(
            LivroCaixa.objects.filter(
                conta=conta,
                data__gte=primeiro_dia,
                data__lt=ultimo_dia,
                estornado=False,
            ).order_by('data', 'criado_em')
        )

        self.stdout.write(f'   Lançamentos no sistema: {len(lancamentos_sistema)}\n')

        # Matching por data + valor + tipo (tolerância ±1 dia)
        usados_sistema = set()
        itens = []

        for t in transacoes_banco:
            match = None
            for i, lc in enumerate(lancamentos_sistema):
                if i in usados_sistema:
                    continue
                diff_dias = abs((lc.data - t['data']).days)
                if diff_dias <= 1 and lc.valor == t['valor'] and lc.tipo == t['tipo']:
                    match = lc
                    usados_sistema.add(i)
                    break

            if match:
                itens.append({
                    'data_banco': t['data'],
                    'descricao_banco': t['descricao'],
                    'valor': t['valor'],
                    'tipo': t['tipo'],
                    'status': 'CONCILIADO',
                    'lancamento_lc': match,
                })
            else:
                itens.append({
                    'data_banco': t['data'],
                    'descricao_banco': t['descricao'],
                    'valor': t['valor'],
                    'tipo': t['tipo'],
                    'status': 'FALTANDO_SISTEMA',
                    'lancamento_lc': None,
                })

        # Lançamentos no sistema sem match no banco
        for i, lc in enumerate(lancamentos_sistema):
            if i not in usados_sistema:
                itens.append({
                    'data_banco': lc.data,
                    'descricao_banco': lc.descricao,
                    'valor': lc.valor,
                    'tipo': lc.tipo,
                    'status': 'FALTANDO_BANCO',
                    'lancamento_lc': lc,
                })

        conciliados      = [x for x in itens if x['status'] == 'CONCILIADO']
        faltando_sistema = [x for x in itens if x['status'] == 'FALTANDO_SISTEMA']
        faltando_banco   = [x for x in itens if x['status'] == 'FALTANDO_BANCO']

        # Totais
        total_banco   = sum(t['valor'] for t in transacoes_banco if t['tipo'] == 'ENTRADA') - \
                        sum(t['valor'] for t in transacoes_banco if t['tipo'] == 'SAIDA')
        total_sistema = sum(lc.valor for lc in lancamentos_sistema if lc.tipo == 'ENTRADA') - \
                        sum(lc.valor for lc in lancamentos_sistema if lc.tipo == 'SAIDA')

        # Salva no banco
        with transaction.atomic():
            conc = ConciliacaoExtrato.objects.create(
                conta=conta,
                arquivo=arquivo,
                periodo=periodo,
                status='COM_DIVERGENCIAS' if (faltando_sistema or faltando_banco) else 'PROCESSADO',
                total_banco=total_banco,
                total_sistema=total_sistema,
                divergencias=len(faltando_sistema) + len(faltando_banco),
            )

            for item in itens:
                ItemConciliacao.objects.create(
                    conciliacao=conc,
                    data_banco=item['data_banco'],
                    descricao_banco=item['descricao_banco'],
                    valor=item['valor'],
                    tipo=item['tipo'],
                    status=item['status'],
                    lancamento_lc=item['lancamento_lc'],
                )

            if criar:
                self._criar_lancamentos(faltando_sistema, conta, conc)

        # Relatório
        self.stdout.write(f'✅ Conciliados      : {len(conciliados)}')
        self.stdout.write(f'❌ Faltando sistema : {len(faltando_sistema)}')
        self.stdout.write(f'⚠️  Faltando banco   : {len(faltando_banco)}\n')
        self.stdout.write(f'   Total banco    : R$ {total_banco:,.2f}')
        self.stdout.write(f'   Total sistema  : R$ {total_sistema:,.2f}')
        self.stdout.write(f'   Diferença      : R$ {(total_banco - total_sistema):,.2f}\n')

        if faltando_sistema:
            self.stdout.write('--- Faltando no sistema ---')
            for item in faltando_sistema:
                sinal = '+' if item['tipo'] == 'ENTRADA' else '-'
                self.stdout.write(f"  {item['data_banco'].strftime('%d/%m')}  {sinal}R${item['valor']:,.2f}  {item['descricao_banco'][:60]}")

        if faltando_banco:
            self.stdout.write('--- Faltando no banco ---')
            for item in faltando_banco:
                sinal = '+' if item['tipo'] == 'ENTRADA' else '-'
                self.stdout.write(f"  {item['data_banco'].strftime('%d/%m')}  {sinal}R${item['valor']:,.2f}  {item['descricao_banco'][:60]}")

        self.stdout.write(f'\n🆔 Conciliação ID: {conc.id}\n')

    def _criar_lancamentos(self, faltando, conta, conc):
        for item in faltando:
            try:
                if item['tipo'] == 'ENTRADA':
                    Aporte.objects.create(
                        conta=conta,
                        descricao=item['descricao_banco'][:255],
                        valor=item['valor'],
                        data=item['data_banco'],
                    )
                else:
                    # Tenta inferir categoria
                    cat_nome = inferir_categoria_descricao(item['descricao_banco'])
                    categoria = None
                    if cat_nome:
                        categoria = Categoria.objects.filter(nome__icontains=cat_nome).first()

                    Despesa.objects.create(
                        conta=conta,
                        descricao=item['descricao_banco'][:255],
                        valor_bruto=item['valor'],
                        vencimento=item['data_banco'],
                        pagamento=item['data_banco'],
                        status='PAGO',
                        tipo='VARIAVEL',
                        forma_pagamento='PIX',
                        categoria=categoria,
                    )

                # Marca item como confirmado
                ItemConciliacao.objects.filter(
                    conciliacao=conc,
                    data_banco=item['data_banco'],
                    valor=item['valor'],
                    tipo=item['tipo'],
                ).update(confirmado=True)

                self.stdout.write(f"  ✅ Criado: {item['descricao_banco'][:50]}")
            except Exception as e:
                self.stdout.write(f"  ❌ Erro ao criar {item['descricao_banco'][:40]}: {e}")
