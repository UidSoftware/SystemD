"""Management command: conciliar_extrato."""
import re
from datetime import datetime, date, timedelta
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from financeiro.models import (
    Aporte, Categoria, Conta, ConciliacaoExtrato, Despesa, ItemConciliacao,
    LivroCaixa, PadraoSeguroConciliacao, Receita, TipoLancamento,
)
from financeiro.parsers import extrair_texto_pdf, inferir_categoria_descricao, parse_btg, parse_c6


class Command(BaseCommand):
    help = 'Concilia extrato bancário PDF com o LivroCaixa do SystemD.'

    def add_arguments(self, parser):
        parser.add_argument('--arquivo', required=True, help='Caminho para o PDF do extrato')
        parser.add_argument('--conta',   required=True, help='Nome da conta (C6 ou BTG)')
        parser.add_argument('--mes',     default=None,  help='Período YYYY-MM (inferido do nome do arquivo se omitido)')
        parser.add_argument('--criar',   action='store_true', help='Criar lançamentos faltantes no sistema (modo manual — use com cuidado)')
        parser.add_argument('--auto',    action='store_true', help='Modo seguro: assenta pendentes e cria só por padrão aprovado')
        parser.add_argument('--senha',   default='609393', help='Senha do PDF (padrão: 609393)')

    def handle(self, *args, **options):
        arquivo    = options['arquivo']
        nome_conta = options['conta'].upper()
        mes_str    = options['mes']
        criar      = options['criar']
        auto       = options['auto']
        senha      = options['senha']

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

            if auto:
                self._auto_processar(faltando_sistema, conta, conc)

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

    def _padrao_entrada_financeira(self, descricao):
        """
        True se a descrição bater com um PadraoSeguroConciliacao de ENTRADA
        marcado como natureza=RECEITA_FINANCEIRA (ex: rendimento de conta
        remunerada) — nesse caso o lançamento deve virar Receita, não Aporte.
        Aporte é capital (Patrimônio Líquido); rendimento é receita financeira
        (entra no DRE). Confundir os dois distorce o resultado do negócio.
        """
        desc_lower = descricao.lower()
        padroes_financeiros = PadraoSeguroConciliacao.objects.filter(
            tipo='ENTRADA', natureza='RECEITA_FINANCEIRA', ativo=True,
        ).values_list('descricao_padrao', flat=True)
        return any(p.lower() in desc_lower for p in padroes_financeiros)

    def _criar_lancamentos(self, faltando, conta, conc):
        """Modo --criar: cria lançamentos para TUDO faltando. Use com cuidado."""
        categoria_investimento = Categoria.objects.filter(nome__iexact='Investimento', tipo='ENTRADA').first()
        for item in faltando:
            try:
                if item['tipo'] == 'ENTRADA' and self._padrao_entrada_financeira(item['descricao_banco']):
                    Receita.objects.create(
                        conta=conta,
                        descricao=item['descricao_banco'][:255],
                        tipo='RECEITA_FINANCEIRA',
                        categoria=categoria_investimento,
                        valor_bruto=item['valor'],
                        vencimento=item['data_banco'],
                        recebimento=item['data_banco'],
                        status='RECEBIDO',
                    )
                elif item['tipo'] == 'ENTRADA':
                    Aporte.objects.create(
                        conta=conta,
                        descricao=item['descricao_banco'][:255],
                        valor=item['valor'],
                        data=item['data_banco'],
                        tipo='CAPITAL_SOCIAL',
                        responsavel='Conciliação manual',
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

    def _auto_processar(self, faltando, conta, conc):
        """
        Modo --auto: processamento seguro em dois passos.

        Passo 1 - ASSENTAR PENDENTES:
            Para cada transação FALTANDO_SISTEMA, busca Receita/Despesa com
            status PENDENTE ou ATRASADO, valor_liquido igual e vencimento
            em ±3 dias da data da transação. Se encontrar, marca como recebido/pago.
            O signal do Django cria o LivroCaixa automaticamente.

        Passo 2 - CRIAR POR PADRÃO SEGURO:
            Para os que ainda sobrarem após o passo 1, verifica se a descrição
            bate com algum PadraoSeguroConciliacao ativo. Se sim, cria o
            lançamento. Se não, mantém como FALTANDO_SISTEMA para revisão humana.
        """
        pendentes_restantes = list(faltando)  # cópia para tracking
        assentados = 0
        criados_padrao = 0
        aguardando_revisao = 0

        # ── Passo 1: Assentar pendentes existentes ──────────────────────────

        for item in list(pendentes_restantes):
            data_banco = item['data_banco']
            valor      = item['valor']
            tipo       = item['tipo']

            data_min = data_banco - timedelta(days=3)
            data_max = data_banco + timedelta(days=3)

            if tipo == 'ENTRADA':
                # Busca Receita pendente com valor e vencimento compatíveis
                receita_qs = Receita.objects.filter(
                    conta=conta,
                    status__in=['PENDENTE', 'ATRASADO'],
                    valor_liquido=valor,
                    vencimento__range=(data_min, data_max),
                    ativo=True,
                ).order_by('vencimento')

                receita = receita_qs.first()
                if receita:
                    receita.status     = 'RECEBIDO'
                    receita.recebimento = data_banco
                    receita.save()  # signal cria LivroCaixa ENTRADA origem=RECEITA

                    # Recupera o LivroCaixa criado pelo signal para vincular ao item
                    lc = LivroCaixa.objects.filter(
                        conta=conta, origem='RECEITA', origem_id=receita.id,
                    ).order_by('-criado_em').first()

                    ItemConciliacao.objects.filter(
                        conciliacao=conc,
                        data_banco=data_banco,
                        valor=valor,
                        tipo=tipo,
                        confirmado=False,
                    ).update(
                        confirmado=True,
                        status='CONCILIADO',
                        lancamento_lc=lc,
                    )

                    self.stdout.write(
                        f"  [AUTO-P1] Receita assentada: {receita.descricao[:50]} "
                        f"(R${valor:,.2f} em {data_banco})"
                    )
                    pendentes_restantes.remove(item)
                    assentados += 1

            elif tipo == 'SAIDA':
                # Busca Despesa pendente com valor e vencimento compatíveis
                despesa_qs = Despesa.objects.filter(
                    conta=conta,
                    status__in=['PENDENTE', 'ATRASADO'],
                    valor_liquido=valor,
                    vencimento__range=(data_min, data_max),
                    ativo=True,
                    estornado=False,
                ).order_by('vencimento')

                despesa = despesa_qs.first()
                if despesa:
                    despesa.status   = 'PAGO'
                    despesa.pagamento = data_banco
                    despesa.save()  # signal cria LivroCaixa SAIDA origem=DESPESA

                    lc = LivroCaixa.objects.filter(
                        conta=conta, origem='DESPESA', origem_id=despesa.id,
                    ).order_by('-criado_em').first()

                    ItemConciliacao.objects.filter(
                        conciliacao=conc,
                        data_banco=data_banco,
                        valor=valor,
                        tipo=tipo,
                        confirmado=False,
                    ).update(
                        confirmado=True,
                        status='CONCILIADO',
                        lancamento_lc=lc,
                    )

                    self.stdout.write(
                        f"  [AUTO-P1] Despesa assentada: {despesa.descricao[:50]} "
                        f"(R${valor:,.2f} em {data_banco})"
                    )
                    pendentes_restantes.remove(item)
                    assentados += 1

        # ── Passo 2: Criar por padrão seguro ────────────────────────────────

        padroes_entrada = list(
            PadraoSeguroConciliacao.objects.filter(tipo='ENTRADA', ativo=True)
            .values_list('descricao_padrao', 'natureza')
        )
        padroes_saida = list(
            PadraoSeguroConciliacao.objects.filter(tipo='SAIDA', ativo=True)
            .values_list('descricao_padrao', flat=True)
        )
        categoria_investimento = Categoria.objects.filter(nome__iexact='Investimento', tipo='ENTRADA').first()

        for item in pendentes_restantes:
            descricao_lower = item['descricao_banco'].lower()
            tipo = item['tipo']

            natureza_match = None
            if tipo == 'ENTRADA':
                match = next(
                    ((desc, nat) for desc, nat in padroes_entrada if desc.lower() in descricao_lower),
                    None,
                )
                padrao_match = match[0] if match else None
                natureza_match = match[1] if match else None
            else:
                padrao_match = next(
                    (p for p in padroes_saida if p.lower() in descricao_lower),
                    None,
                )

            if padrao_match:
                try:
                    if tipo == 'ENTRADA' and natureza_match == 'RECEITA_FINANCEIRA':
                        lancamento_obj = Receita.objects.create(
                            conta=conta,
                            descricao=item['descricao_banco'][:255],
                            tipo='RECEITA_FINANCEIRA',
                            categoria=categoria_investimento,
                            valor_bruto=item['valor'],
                            vencimento=item['data_banco'],
                            recebimento=item['data_banco'],
                            status='RECEBIDO',
                        )
                    elif tipo == 'ENTRADA':
                        lancamento_obj = Aporte.objects.create(
                            conta=conta,
                            descricao=item['descricao_banco'][:255],
                            valor=item['valor'],
                            data=item['data_banco'],
                            tipo='CAPITAL_SOCIAL',
                            responsavel='Conciliação automática',
                        )
                    else:
                        cat_nome  = inferir_categoria_descricao(item['descricao_banco'])
                        categoria = None
                        if cat_nome:
                            categoria = Categoria.objects.filter(nome__icontains=cat_nome).first()

                        lancamento_obj = Despesa.objects.create(
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

                    ItemConciliacao.objects.filter(
                        conciliacao=conc,
                        data_banco=item['data_banco'],
                        valor=item['valor'],
                        tipo=tipo,
                        confirmado=False,
                    ).update(confirmado=True)

                    self.stdout.write(
                        f"  [AUTO-P2] Criado por padrão '{padrao_match[:30]}': "
                        f"{item['descricao_banco'][:40]} (R${item['valor']:,.2f})"
                    )
                    criados_padrao += 1
                except Exception as e:
                    self.stdout.write(
                        f"  [AUTO-P2] Erro ao criar {item['descricao_banco'][:40]}: {e}"
                    )
                    aguardando_revisao += 1
            else:
                self.stdout.write(
                    f"  [AUTO-P2] Sem padrão — aguarda revisão humana: "
                    f"{item['descricao_banco'][:50]} (R${item['valor']:,.2f})"
                )
                aguardando_revisao += 1

        # Atualiza status da conciliação
        restantes_nao_confirmados = conc.itens.filter(
            status='FALTANDO_SISTEMA', confirmado=False,
        ).count()
        faltando_banco_count = conc.itens.filter(status='FALTANDO_BANCO').count()

        if restantes_nao_confirmados == 0 and faltando_banco_count == 0:
            conc.status = 'PROCESSADO'
        else:
            conc.status = 'COM_DIVERGENCIAS'
        conc.divergencias = restantes_nao_confirmados + faltando_banco_count
        conc.save(update_fields=['status', 'divergencias'])

        self.stdout.write(f'\n--- Resultado --auto ---')
        self.stdout.write(f'  Pendentes assentados : {assentados}')
        self.stdout.write(f'  Criados por padrão   : {criados_padrao}')
        self.stdout.write(f'  Aguardando revisão   : {aguardando_revisao}')
