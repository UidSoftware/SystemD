from datetime import date, timedelta
from decimal import Decimal

from django.db import connection, transaction
from django.db.models import Count, F, Sum, Q
from rest_framework import status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend

from financeiro.mixins import AuditMixin, ReadCreateViewSet
from usuarios.permissions import IsAdmin, IsAdminOrFinanceiro, IsAdminOrFinanceiroOrContabilidade, IsAdminOrOperacionalOrFinanceiro

from .signals import _reconstruir_cadeia
from .relatorios import _saldo_total_contas, calcular_balanco, calcular_fluxo_projetado, calcular_indicadores_cfo
from .models import Aporte, Categoria, ConciliacaoExtrato, Conta, Despesa, FormaPagamento, Fornecedor, ItemConciliacao, LivroCaixa, PadraoSeguroConciliacao, Receita, SubCategoria
from .serializers import (
    AporteSerializer, CategoriaSerializer, ConciliacaoExtratoSerializer, ConciliacaoListSerializer, ContaSerializer, DespesaSerializer,
    FornecedorSerializer, ItemConciliacaoSerializer, LivroCaixaSerializer, PadraoSeguroConciliacaoSerializer, ReceitaSerializer, SubCategoriaSerializer,
)


class CategoriaViewSet(ModelViewSet):
    queryset = Categoria.objects.filter(is_active=True).order_by('nome')
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdminOrFinanceiro]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['tipo']

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()


class SubCategoriaViewSet(ModelViewSet):
    queryset = SubCategoria.objects.filter(is_active=True).select_related('categoria').order_by('categoria__nome', 'nome')
    serializer_class = SubCategoriaSerializer
    permission_classes = [IsAdminOrFinanceiro]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['categoria']

    def perform_create(self, serializer):
        serializer.save()


class ContaViewSet(AuditMixin, ModelViewSet):
    queryset = Conta.objects.filter(is_active=True).order_by('nome')
    serializer_class = ContaSerializer
    permission_classes = [IsAdminOrFinanceiro]
    filter_backends = [SearchFilter]
    search_fields = ['nome']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'], url_path='transferir', permission_classes=[IsAdminOrFinanceiro])
    def transferir(self, request, pk=None):
        from datetime import date as date_cls
        conta_origem = self.get_object()
        conta_destino_id = request.data.get('conta_destino')
        valor_str        = request.data.get('valor')
        descricao        = request.data.get('descricao') or 'Transferencia entre contas'
        data_str         = request.data.get('data') or date_cls.today().isoformat()

        if not conta_destino_id or not valor_str:
            return Response({'erro': 'conta_destino e valor sao obrigatorios.'}, status=400)

        try:
            valor = Decimal(str(valor_str))
        except Exception:
            return Response({'erro': 'Valor invalido.'}, status=400)

        if valor <= 0:
            return Response({'erro': 'Valor deve ser maior que zero.'}, status=400)

        try:
            conta_destino = Conta.objects.get(id=conta_destino_id, is_active=True)
        except Conta.DoesNotExist:
            return Response({'erro': 'Conta destino nao encontrada.'}, status=400)

        if conta_origem.id == conta_destino.id:
            return Response({'erro': 'Conta origem e destino devem ser diferentes.'}, status=400)

        try:
            data = date_cls.fromisoformat(data_str)
        except ValueError:
            return Response({'erro': 'Data invalida.'}, status=400)

        def ultimo_saldo(conta):
            ult = LivroCaixa.objects.select_for_update().filter(conta=conta).order_by('-data', '-created_at').first()
            return ult.saldo_atual if ult else conta.saldo_inicial

        with transaction.atomic():
            saldo_ant_origem = ultimo_saldo(conta_origem)
            LivroCaixa.objects.create(
                conta=conta_origem,
                tipo='SAIDA',
                origem='TRANSFER',
                descricao=f'Transferencia para {conta_destino.nome}: {descricao}',
                valor=valor,
                data=data,
                saldo_anterior=saldo_ant_origem,
                saldo_atual=saldo_ant_origem - valor,
                created_by=request.user,
            )
            saldo_ant_destino = ultimo_saldo(conta_destino)
            LivroCaixa.objects.create(
                conta=conta_destino,
                tipo='ENTRADA',
                origem='TRANSFER',
                descricao=f'Transferencia de {conta_origem.nome}: {descricao}',
                valor=valor,
                data=data,
                saldo_anterior=saldo_ant_destino,
                saldo_atual=saldo_ant_destino + valor,
                created_by=request.user,
            )

        return Response({'ok': True, 'mensagem': f'Transferencia de R$ {valor} realizada com sucesso.'})


class AporteViewSet(AuditMixin, ModelViewSet):
    queryset = Aporte.objects.filter(is_active=True).select_related('conta').order_by('-data')
    serializer_class = AporteSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['tipo', 'conta']
    ordering_fields = ['data', 'valor']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save()


class ReceitaViewSet(AuditMixin, ModelViewSet):
    queryset = (
        Receita.objects.filter(is_active=True)
        .select_related('cliente', 'os', 'conta')
        .order_by('vencimento')
    )
    serializer_class = ReceitaSerializer
    permission_classes = [IsAdminOrFinanceiro]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo', 'status', 'cliente', 'os', 'conta']
    search_fields = ['descricao']
    ordering_fields = ['vencimento', 'valor_liquido', 'status']

    def perform_create(self, serializer):
        recorrente = self.request.data.get('recorrente', False)
        frequencia = self.request.data.get('frequencia', '')
        quantidade = int(self.request.data.get('quantidade', 1) or 1)

        if recorrente and quantidade > 1 and frequencia:
            from financeiro.models import Receita
            import calendar as cal
            vencimento_base = serializer.validated_data.get('vencimento')

            def proxima_data(base, n, freq):
                if freq == 'MENSAL':
                    mes = base.month - 1 + n
                    ano = base.year + mes // 12
                    mes = mes % 12 + 1
                    ultimo_dia = cal.monthrange(ano, mes)[1]
                    return base.replace(year=ano, month=mes, day=min(base.day, ultimo_dia))
                elif freq == 'SEMANAL':
                    return base + timedelta(weeks=n)
                elif freq == 'QUINZENAL':
                    return base + timedelta(days=15 * n)
                elif freq == 'ANUAL':
                    return base.replace(year=base.year + n)
                return base

            campos_base = {k: v for k, v in serializer.validated_data.items()}
            campos_base['created_by'] = self.request.user
            pagar_primeiro = campos_base.get('status') == 'RECEBIDO'

            for i in range(quantidade):
                campos_base['vencimento'] = proxima_data(vencimento_base, i, frequencia)
                # Mesmo motivo do DespesaViewSet.perform_create -- competência
                # acompanha o vencimento de cada parcela, nunca fica travada
                # no valor da 1ª parcela.
                campos_base['referencia_mes'] = campos_base['vencimento'].replace(day=1)
                if pagar_primeiro and i > 0:
                    Receita.objects.create(**{**campos_base, 'status': 'PENDENTE', 'recebimento': None})
                else:
                    Receita.objects.create(**campos_base)
        else:
            serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=['patch'], url_path='receber', permission_classes=[IsAdminOrFinanceiro])
    def marcar_recebido(self, request, pk=None):
        receita = self.get_object()
        recebimento = request.data.get('recebimento') or date.today().isoformat()
        conta_id    = request.data.get('conta')
        if conta_id:
            try:
                receita.conta = Conta.objects.get(id=conta_id)
            except Conta.DoesNotExist:
                return Response({'conta': 'Conta não encontrada.'}, status=400)
        receita.recebimento = recebimento
        receita.status = 'RECEBIDO'
        receita.save()
        return Response(ReceitaSerializer(receita).data)

    @action(detail=True, methods=['get'], url_path='recibo', permission_classes=[IsAdminOrFinanceiro])
    def recibo(self, request, pk=None):
        """GET /api/financeiro/receitas/{id}/recibo/ — gera PDF do recibo de pagamento"""
        receita = self.get_object()
        if receita.status != 'RECEBIDO':
            return Response(
                {'detail': 'Recibo disponível apenas para receitas com status RECEBIDO.'},
                status=400,
            )
        from .recibo_pdf import gerar_recibo_pdf
        return gerar_recibo_pdf(receita)


class DespesaViewSet(AuditMixin, ModelViewSet):
    queryset = (
        Despesa.objects.filter(is_active=True)
        .select_related('conta')
        .order_by('vencimento')
    )
    serializer_class = DespesaSerializer
    permission_classes = [IsAdminOrFinanceiro]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo', 'status', 'conta', 'estornado']
    search_fields = ['descricao', 'fornecedor']
    ordering_fields = ['vencimento', 'valor_liquido', 'status']

    def perform_create(self, serializer):
        dados = serializer.validated_data
        recorrente = dados.get('recorrente', False)
        frequencia = dados.get('frequencia', '')
        quantidade = dados.get('quantidade', 1)

        if recorrente and quantidade > 1 and frequencia:
            # Cria N lançamentos com datas de vencimento calculadas
            from financeiro.models import Despesa
            vencimento_base = dados.get('vencimento')

            def proxima_data(base, n, freq):
                if freq == 'MENSAL':
                    # _add_months sem dateutil (padrão CLAUDE.md)
                    mes = base.month - 1 + n
                    ano = base.year + mes // 12
                    mes = mes % 12 + 1
                    import calendar
                    ultimo_dia = calendar.monthrange(ano, mes)[1]
                    dia = min(base.day, ultimo_dia)
                    return base.replace(year=ano, month=mes, day=dia)
                elif freq == 'SEMANAL':
                    return base + timedelta(weeks=n)
                elif freq == 'QUINZENAL':
                    return base + timedelta(days=15 * n)
                elif freq == 'ANUAL':
                    return base.replace(year=base.year + n)
                return base

            campos_base = {k: v for k, v in dados.items()}
            campos_base['created_by'] = self.request.user

            pagar_primeiro = campos_base.get('status') == 'PAGO'
            for i in range(quantidade):
                campos_base['vencimento'] = proxima_data(vencimento_base, i, frequencia)
                # Competência acompanha o vencimento de CADA parcela -- sem
                # isso, um referencia_mes explícito no payload (1ª parcela)
                # ficava colado em todas as N parcelas (achado real 03/08/2026:
                # aluguel recorrente set-dez/2026 todas com referencia_mes=09).
                campos_base['referencia_mes'] = campos_base['vencimento'].replace(day=1)
                if pagar_primeiro and i > 0:
                    campos_iter = {**campos_base, 'status': 'PENDENTE', 'pagamento': None, 'forma_pagamento': ''}
                    Despesa.objects.create(**campos_iter)
                else:
                    Despesa.objects.create(**campos_base)
        else:
            serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=['patch'], url_path='pagar', permission_classes=[IsAdminOrFinanceiro])
    def marcar_pago(self, request, pk=None):
        despesa = self.get_object()
        pagamento = request.data.get('pagamento') or date.today().isoformat()
        conta_id  = request.data.get('conta')
        forma_pagamento = request.data.get('forma_pagamento', '')
        if conta_id:
            try:
                despesa.conta = Conta.objects.get(id=conta_id)
            except Conta.DoesNotExist:
                return Response({'conta': 'Conta não encontrada.'}, status=400)
        if forma_pagamento and forma_pagamento not in FormaPagamento.values:
            return Response({'forma_pagamento': 'Forma de pagamento inválida.'}, status=400)
        despesa.pagamento = pagamento
        despesa.forma_pagamento = forma_pagamento
        despesa.status = 'PAGO'
        despesa.save()
        return Response(DespesaSerializer(despesa).data)

    @action(detail=False, methods=['get'], url_path='fornecedores', permission_classes=[IsAdminOrFinanceiro])
    def fornecedores(self, request):
        """Retorna lista de nomes dos fornecedores ativos cadastrados."""
        qs = Fornecedor.objects.filter(forn_ativo=True).values_list('forn_nome', flat=True)
        return Response(list(qs))

    @action(detail=True, methods=['post'], url_path='estornar', permission_classes=[IsAdmin])
    def estornar_despesa(self, request, pk=None):
        """POST /api/financeiro/despesas/{id}/estornar/ — cria LivroCaixa ENTRADA origem=ESTORNO"""
        despesa = self.get_object()

        if despesa.status != 'PAGO':
            return Response({'detail': 'Somente despesas com status PAGO podem ser estornadas.'}, status=400)

        if despesa.estornado:
            return Response({'detail': 'Despesa já foi estornada.'}, status=400)

        data_estorno_str = request.data.get('data_estorno') or date.today().isoformat()
        conta_id         = request.data.get('conta')
        motivo           = request.data.get('motivo', '')
        observacoes      = request.data.get('observacoes', '')

        if not motivo.strip():
            return Response({'motivo': 'Motivo do estorno é obrigatório.'}, status=400)

        try:
            data_estorno = date.fromisoformat(data_estorno_str)
        except ValueError:
            return Response({'data_estorno': 'Data inválida.'}, status=400)

        conta = despesa.conta
        if conta_id:
            try:
                conta = Conta.objects.get(id=conta_id, is_active=True)
            except Conta.DoesNotExist:
                return Response({'conta': 'Conta não encontrada.'}, status=400)

        with transaction.atomic():
            ultimo = (
                LivroCaixa.objects.select_for_update()
                .filter(conta=conta)
                .order_by('-data', '-created_at')
                .first()
            )
            saldo_anterior = ultimo.saldo_atual if ultimo else conta.saldo_inicial
            saldo_atual    = saldo_anterior + despesa.valor_liquido

            lancamento_original = (
                LivroCaixa.objects.select_for_update()
                .filter(origem='DESPESA', origem_id=despesa.id, estornado=False)
                .first()
            )

            lancamento = LivroCaixa.objects.create(
                conta=conta,
                tipo='ENTRADA',
                origem='ESTORNO',
                origem_id=despesa.id,
                descricao=f'Estorno despesa: {despesa.descricao}' + (f' — {motivo}' if motivo else ''),
                valor=despesa.valor_liquido,
                data=data_estorno,
                saldo_anterior=saldo_anterior,
                saldo_atual=saldo_atual,
                created_by=request.user,
                estorno_de=lancamento_original,
                estornado=True,
            )

            if lancamento_original:
                lancamento_original.estornado = True
                lancamento_original.save(update_fields=['estornado'])

            despesa.estornado      = True
            despesa.data_estorno   = data_estorno
            despesa.motivo_estorno = motivo + (' | ' + observacoes if observacoes else '')
            despesa.save(update_fields=['estornado', 'data_estorno', 'motivo_estorno'])

        return Response(LivroCaixaSerializer(lancamento).data, status=201)


class FornecedorViewSet(AuditMixin, ModelViewSet):
    queryset = Fornecedor.objects.filter(is_active=True).order_by('forn_nome')
    serializer_class = FornecedorSerializer
    permission_classes = [IsAdminOrFinanceiro]
    filter_backends = [SearchFilter]
    search_fields = ['forn_nome', 'forn_cnpj']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save()


class LivroCaixaViewSet(ReadCreateViewSet):
    queryset = (
        LivroCaixa.objects.select_related('conta')
        .order_by('-data', '-created_at')
    )
    serializer_class = LivroCaixaSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['conta', 'tipo', 'origem', 'estornado']
    ordering_fields = ['data', 'valor']

    def get_permissions(self):
        # list/retrieve (leitura) libera pra Contabilidade tambem; create
        # (lancamento manual) continua exclusivo de ADMIN/FINANCEIRO -- ver
        # IsAdminOrFinanceiroOrContabilidade, nunca usar em action de escrita.
        if self.action in ('list', 'retrieve'):
            return [IsAdminOrFinanceiroOrContabilidade()]
        return [IsAdminOrFinanceiro()]
    # Sem paginacao (mesmo padrao de DespesaViewSet/ReceitaViewSet) — o
    # frontend (LivroCaixaPage, FluxoCaixaPage) busca tudo de uma vez e
    # filtra/agrupa por mes no cliente. Com paginacao padrao (20 por
    # pagina, mais recente primeiro), qualquer conta com mais de 20
    # lancamentos historicos ficava com meses antigos invisiveis — so a
    # primeira pagina (mes mais recente) chegava no frontend.
    pagination_class = None

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def estornar(self, request, pk=None):
        lancamento = self.get_object()
        if lancamento.estornado:
            return Response({'detail': 'Lançamento já estornado.'}, status=400)

        motivo = request.data.get('motivo', '')
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_advisory_xact_lock(%s)', [lancamento.conta_id])

            tipo_estorno = 'ENTRADA' if lancamento.tipo == 'SAIDA' else 'SAIDA'

            estorno = LivroCaixa.objects.create(
                conta=lancamento.conta,
                tipo=tipo_estorno,
                origem='MANUAL',
                descricao=f'Estorno: {lancamento.descricao}' + (f' — {motivo}' if motivo else ''),
                valor=lancamento.valor,
                data=date.today(),
                saldo_anterior=Decimal('0'),
                saldo_atual=Decimal('0'),
                created_by=request.user,
                estorno_de=lancamento,
                estornado=True,
            )
            lancamento.estornado = True
            lancamento.save(update_fields=['estornado'])

            # saldo_anterior/saldo_atual acima são placeholders — a cadeia inteira
            # da conta é recalculada aqui, igual ao que _gerar_lancamento() já faz,
            # pra nunca deixar saldo_atual dessincronizado da soma real da conta.
            _reconstruir_cadeia(lancamento.conta)
            estorno.refresh_from_db()

        return Response(LivroCaixaSerializer(estorno).data, status=201)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrFinanceiroOrContabilidade])
    def totais(self, request):
        from .models import Conta
        conta_id = request.query_params.get('conta')
        qs = LivroCaixa.objects.filter(estornado=False)
        if conta_id:
            qs = qs.filter(conta_id=conta_id)
        agg = qs.aggregate(
            total_entradas=Sum('valor', filter=Q(tipo='ENTRADA')),
            total_saidas=Sum('valor', filter=Q(tipo='SAIDA')),
        )
        total_entradas = agg['total_entradas'] or Decimal('0')
        total_saidas   = agg['total_saidas']   or Decimal('0')

        # Saldo real = saldo_inicial + soma de entradas - soma de saídas dos
        # lançamentos não estornados. NUNCA ler ultimo.saldo_atual: o "último
        # lançamento por data" não é garantidamente o último elo da cadeia
        # quando há estornos/correções retroativas com data diferente da
        # data de criação — usar a soma evita saldo corrompido nesses casos.
        if conta_id:
            try:
                conta = Conta.objects.get(id=conta_id)
                saldo_atual = conta.saldo_inicial + total_entradas - total_saidas
            except Conta.DoesNotExist:
                saldo_atual = total_entradas - total_saidas
        else:
            saldo_inicial_total = Conta.objects.filter(is_active=True).aggregate(
                v=Sum('saldo_inicial')
            )['v'] or Decimal('0')
            saldo_atual = saldo_inicial_total + total_entradas - total_saidas

        return Response({
            'total_entradas': total_entradas,
            'total_saidas':   total_saidas,
            'saldo_atual':    saldo_atual,
        })


# ─── Views calculadas ────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminOrFinanceiroOrContabilidade])
def fluxo_caixa(request):
    """GET /api/financeiro/fluxo-caixa/?mes=2026-05&conta=1"""
    mes_str  = request.query_params.get('mes')
    conta_id = request.query_params.get('conta')

    try:
        if mes_str:
            ano, mes = int(mes_str[:4]), int(mes_str[5:7])
        else:
            hoje = date.today()
            ano, mes = hoje.year, hoje.month
    except (ValueError, IndexError):
        return Response({'detail': 'Formato inválido. Use mes=YYYY-MM.'}, status=400)

    qs = LivroCaixa.objects.filter(
        data__year=ano, data__month=mes, estornado=False,
    )
    conta = None
    if conta_id:
        try:
            conta = Conta.objects.get(id=conta_id)
            qs = qs.filter(conta=conta)
        except Conta.DoesNotExist:
            pass

    agg = qs.aggregate(
        total_entradas=Sum('valor', filter=Q(tipo='ENTRADA')),
        total_saidas=Sum('valor', filter=Q(tipo='SAIDA')),
    )

    # Saldo real ao início do mês = saldo_inicial da conta + soma de entradas -
    # soma de saídas dos lançamentos não estornados anteriores ao período.
    # NUNCA ler ultimo.saldo_atual por data — não é garantidamente o último elo
    # da cadeia quando há estornos/correções retroativas.
    primeiro_dia = date(ano, mes, 1)

    def _saldo_antes(conta_obj):
        agg_prev = LivroCaixa.objects.filter(
            conta=conta_obj, data__lt=primeiro_dia, estornado=False,
        ).aggregate(
            e=Sum('valor', filter=Q(tipo='ENTRADA')),
            s=Sum('valor', filter=Q(tipo='SAIDA')),
        )
        return conta_obj.saldo_inicial + (agg_prev['e'] or Decimal('0')) - (agg_prev['s'] or Decimal('0'))

    if conta_id and conta:
        saldo_inicial = _saldo_antes(conta)
    else:
        saldo_inicial = Decimal('0')
        for _c in Conta.objects.filter(is_active=True):
            saldo_inicial += _saldo_antes(_c)
    total_entradas = agg['total_entradas'] or Decimal('0')
    total_saidas   = agg['total_saidas']   or Decimal('0')
    saldo_final    = saldo_inicial + total_entradas - total_saidas

    lancamentos = LivroCaixaSerializer(qs.order_by('data', 'created_at'), many=True).data

    return Response({
        'periodo':         f'{mes:02d}/{ano}',
        'conta':           conta.nome if conta else 'Todas',
        'saldo_inicial':   saldo_inicial,
        'total_entradas':  total_entradas,
        'total_saidas':    total_saidas,
        'saldo_final':     saldo_final,
        'lancamentos':     lancamentos,
    })


@api_view(['GET'])
@permission_classes([IsAdminOrFinanceiroOrContabilidade])
def dre(request):
    """GET /api/financeiro/dre/?ano=2026"""
    try:
        ano = int(request.query_params.get('ano', date.today().year))
    except ValueError:
        return Response({'detail': 'Ano inválido.'}, status=400)

    meses = []
    totais = {
        'receita_operacional': Decimal('0'), 'receita_financeira': Decimal('0'),
        'receita_bruta': Decimal('0'), 'descontos': Decimal('0'),
        'receita_liquida': Decimal('0'), 'despesas_fixas': Decimal('0'),
        'despesas_variaveis': Decimal('0'), 'prolabore': Decimal('0'),
        'impostos': Decimal('0'), 'total_despesas': Decimal('0'),
        'resultado': Decimal('0'),
    }

    for mes in range(1, 13):
        # DRE é competência (referencia_mes), não caixa — resolve casos como
        # aluguel antecipado (2x pago no mesmo mês, 0 no seguinte) e imposto
        # anual concentrado num mês só. Fluxo de Caixa/Conciliação continuam
        # em recebimento/pagamento (data real do dinheiro), propositalmente
        # não tocados aqui (achado + decisão 02-03/08/2026).
        rec_qs = Receita.objects.filter(
            referencia_mes__year=ano, referencia_mes__month=mes, status='RECEBIDO', is_active=True,
        )
        desp_qs = Despesa.objects.filter(
            referencia_mes__year=ano, referencia_mes__month=mes, status='PAGO', is_active=True, estornado=False,
        )

        # Receita financeira (rendimento de aplicação/conta remunerada) é
        # separada da receita operacional — não é o negócio vendendo pro
        # cliente, é juro que o banco pagou. Misturar as duas infla a
        # "Receita Bruta" e distorce o tamanho real da operação.
        receita_operacional = rec_qs.exclude(tipo='RECEITA_FINANCEIRA').aggregate(v=Sum('valor_bruto'))['v'] or Decimal('0')
        receita_financeira  = rec_qs.filter(tipo='RECEITA_FINANCEIRA').aggregate(v=Sum('valor_bruto'))['v'] or Decimal('0')
        receita_bruta  = receita_operacional + receita_financeira
        descontos      = rec_qs.aggregate(v=Sum('desconto'))['v'] or Decimal('0')
        receita_liq    = receita_bruta - descontos

        fixas     = desp_qs.filter(tipo='FIXA').aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')
        variaveis = desp_qs.filter(tipo='VARIAVEL').aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')
        prolabore = desp_qs.filter(tipo='PROLABORE').aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')
        impostos  = desp_qs.filter(tipo='IMPOSTO').aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')
        outros    = desp_qs.filter(tipo='OUTRO').aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')
        total_desp = fixas + variaveis + prolabore + impostos + outros
        resultado  = receita_liq - total_desp

        dados_mes = {
            'mes': f'{mes:02d}/{ano}',
            'receita_operacional': receita_operacional,
            'receita_financeira': receita_financeira,
            'receita_bruta':    receita_bruta,
            'descontos':        descontos,
            'receita_liquida':  receita_liq,
            'despesas_fixas':   fixas,
            'despesas_variaveis': variaveis,
            'prolabore':        prolabore,
            'impostos':         impostos,
            'outros':           outros,
            'total_despesas':   total_desp,
            'resultado':        resultado,
        }
        meses.append(dados_mes)

        for k in totais:
            totais[k] += dados_mes.get(k, Decimal('0'))

    return Response({'ano': ano, 'meses': meses, 'totais_ano': totais})


@api_view(['GET'])
@permission_classes([IsAdminOrFinanceiroOrContabilidade])
def receita_por_cliente(request):
    """GET /api/financeiro/receita-por-cliente/?ano=2026"""
    try:
        ano = int(request.query_params.get('ano', date.today().year))
    except ValueError:
        return Response({'detail': 'Ano inválido.'}, status=400)

    from clientes.models import Cliente
    clientes = Cliente.objects.filter(ativo=True).order_by('nome_empresa')
    resultado = []
    for cliente in clientes:
        qs = Receita.objects.filter(
            cliente=cliente, status='RECEBIDO',
            recebimento__year=ano, is_active=True,
        )
        total_bruto   = qs.aggregate(v=Sum('valor_bruto'))['v'] or Decimal('0')
        total_desc    = qs.aggregate(v=Sum('desconto'))['v'] or Decimal('0')
        total_liq     = qs.aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')
        mensalidades  = qs.filter(tipo='MENSALIDADE').count()
        entradas      = qs.filter(tipo='ENTRADA_CONTRATO').count()
        if total_bruto > 0:
            resultado.append({
                'cliente':           cliente.nome_empresa,
                'cliente_id':        cliente.id,
                'total_bruto':       total_bruto,
                'total_descontos':   total_desc,
                'total_liquido':     total_liq,
                'mensalidades':      mensalidades,
                'entradas_contrato': entradas,
            })

    resultado.sort(key=lambda x: x['total_liquido'], reverse=True)
    return Response(resultado)


@api_view(['GET'])
@permission_classes([IsAdminOrFinanceiroOrContabilidade])
def balanco_patrimonial(request):
    """GET /api/financeiro/balanco/?data=2026-07-31 -- backport UidCore (SystemD 2.0.0)"""
    data_str = request.query_params.get('data')
    data_ref = None
    if data_str:
        try:
            data_ref = date.fromisoformat(data_str)
        except ValueError:
            return Response({'detail': 'Data inválida. Use YYYY-MM-DD.'}, status=400)
    return Response(calcular_balanco(data_ref))


@api_view(['GET'])
@permission_classes([IsAdminOrFinanceiroOrContabilidade])
def fluxo_projetado(request):
    """GET /api/financeiro/fluxo-projetado/ -- backport UidCore (SystemD 2.0.0)"""
    return Response(calcular_fluxo_projetado())


@api_view(['GET'])
@permission_classes([IsAdminOrFinanceiroOrContabilidade])
def indicadores_cfo(request):
    """GET /api/financeiro/indicadores/ -- backport UidCore (SystemD 2.0.0)"""
    return Response(calcular_indicadores_cfo())


@api_view(['GET'])
@permission_classes([IsAdminOrOperacionalOrFinanceiro])
def dashboard(request):
    """GET /api/financeiro/dashboard/ — dados agregados para o painel principal"""
    perfil = request.user.perfil
    is_fin = perfil in ('ADMIN', 'FINANCEIRO')
    is_ops = perfil in ('ADMIN', 'OPERACIONAL')
    hoje = date.today()
    data = {}

    if is_fin:
        primeiro_dia = hoje.replace(day=1)
        ultimo_dia = (
            date(hoje.year + 1, 1, 1) - timedelta(days=1)
            if hoje.month == 12
            else date(hoje.year, hoje.month + 1, 1) - timedelta(days=1)
        )

        # Receita/despesa do mes = resultado operacional (DRE), NUNCA soma
        # direta de LivroCaixa — LivroCaixa inclui transferencias entre
        # contas proprias (origem=TRANSFER) e lancamentos ativo=False
        # (ex: aplicacao/resgate CDB, transferencia entre bolsos), que sao
        # movimentacao de caixa real mas nao devem contar como resultado.
        # Mesmo padrao ja usado em dre() abaixo -- e, desde 03/08/2026,
        # tambem competencia (referencia_mes) igual ao dre(), nao caixa.
        receita_mes = Receita.objects.filter(
            is_active=True, status='RECEBIDO',
            referencia_mes__gte=primeiro_dia, referencia_mes__lte=ultimo_dia,
        ).aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')
        despesa_mes = Despesa.objects.filter(
            is_active=True, estornado=False, status='PAGO',
            referencia_mes__gte=primeiro_dia, referencia_mes__lte=ultimo_dia,
        ).aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')

        mrr = Receita.objects.filter(
            is_active=True, tipo='MENSALIDADE', status='RECEBIDO',
            referencia_mes__gte=primeiro_dia, referencia_mes__lte=ultimo_dia,
        ).aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')

        prox_30 = hoje + timedelta(days=30)
        receitas_vencer = []
        for r in (
            Receita.objects.filter(is_active=True, status='PENDENTE', vencimento__gte=hoje, vencimento__lte=prox_30)
            .select_related('cliente').order_by('vencimento')[:8]
        ):
            receitas_vencer.append({
                'id': r.id, 'descricao': r.descricao,
                'valor_liquido': r.valor_liquido, 'vencimento': str(r.vencimento),
                'cliente_nome': r.cliente.nome_empresa if r.cliente else None,
            })

        despesas_vencer = []
        for d in (
            Despesa.objects.filter(is_active=True, status='PENDENTE', vencimento__gte=hoje, vencimento__lte=prox_30)
            .order_by('vencimento')[:8]
        ):
            despesas_vencer.append({
                'id': d.id, 'descricao': d.descricao,
                'valor_liquido': d.valor_liquido, 'vencimento': str(d.vencimento),
                'fornecedor': d.fornecedor or None,
            })

        MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
        grafico = []
        for i in range(5, -1, -1):
            m = hoje.month - i
            y = hoje.year
            if m <= 0:
                m += 12
                y -= 1
            p = date(y, m, 1)
            u = date(y + 1, 1, 1) - timedelta(days=1) if m == 12 else date(y, m + 1, 1) - timedelta(days=1)
            # Mesmo motivo do bloco receita_mes/despesa_mes acima — resultado
            # operacional por competência, nao soma direta de LivroCaixa.
            rec = Receita.objects.filter(
                is_active=True, status='RECEBIDO', referencia_mes__gte=p, referencia_mes__lte=u,
            ).aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')
            des = Despesa.objects.filter(
                is_active=True, estornado=False, status='PAGO', referencia_mes__gte=p, referencia_mes__lte=u,
            ).aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')
            grafico.append({'mes': f'{y}-{m:02d}', 'label': MESES_PT[m - 1], 'receita': rec, 'despesa': des, 'resultado': rec - des})

        raw_top = list(
            Receita.objects.filter(is_active=True, status='RECEBIDO', recebimento__year=hoje.year, cliente__isnull=False)
            .values('cliente__nome_empresa')
            .annotate(total=Sum('valor_liquido'))
            .order_by('-total')[:5]
        )
        top_clientes = [{'cliente_nome': r['cliente__nome_empresa'], 'total': r['total']} for r in raw_top]

        # Caixa e equivalentes -- reaproveita o mesmo helper do Balanço/CFO
        # (relatorios._saldo_total_contas), que já exclui contas CARTEIRA
        # (cartão de crédito): saldo negativo de fatura em aberto é dívida
        # (Passivo Circulante), não redução de caixa disponível. Antes este
        # bloco duplicava a soma sem essa exclusão -- divergia do Balanço/CFO
        # em exatamente o valor da fatura aberta (achado real 03/08/2026).
        saldo_total = _saldo_total_contas()

        data.update({
            'receita_mes': receita_mes,
            'despesa_mes': despesa_mes,
            'resultado_mes': receita_mes - despesa_mes,
            'saldo_total_contas': saldo_total,
            'mrr': mrr,
            'receitas_vencer': receitas_vencer,
            'despesas_vencer': despesas_vencer,
            'grafico_6_meses': grafico,
            'top_clientes': top_clientes,
            'receitas_atrasadas': Receita.objects.filter(is_active=True, status='ATRASADO').count(),
            'despesas_atrasadas': Despesa.objects.filter(is_active=True, status='ATRASADO').count(),
        })

    if is_ops:
        from ordens.models import OS, Chamado
        from vitrine.models import Lead
        from clientes.models import Cliente as ClienteModel

        OS_STAGES = ['LEAD', 'REUNIAO', 'LEVANTAMENTO', 'PROPOSTA', 'CONTRATO', 'DEV', 'ENTREGA', 'MANUTENCAO']
        OS_LABELS = {
            'LEAD': 'Lead', 'REUNIAO': 'Reunião', 'LEVANTAMENTO': 'Levant.',
            'PROPOSTA': 'Proposta', 'CONTRATO': 'Contrato', 'DEV': 'Dev',
            'ENTREGA': 'Entrega', 'MANUTENCAO': 'Manutenção',
        }
        pipeline_agg = {
            p['status']: p
            for p in OS.objects.filter(ativo=True).exclude(status='CANCELADA')
            .values('status').annotate(count=Count('id'), valor=Sum('valor_total'))
        }
        pipeline_os = [
            {
                'status': s, 'label': OS_LABELS[s],
                'count': pipeline_agg.get(s, {}).get('count', 0),
                'valor': pipeline_agg.get(s, {}).get('valor') or Decimal('0'),
            }
            for s in OS_STAGES
        ]

        ultimas_os = []
        for os in OS.objects.filter(ativo=True).select_related('cliente').order_by('-criado_em')[:5]:
            ultimas_os.append({
                'id': os.id, 'titulo': os.titulo, 'status': os.status,
                'valor_total': os.valor_total,
                'data_entrega': str(os.data_entrega) if os.data_entrega else None,
                'cliente_nome': os.cliente.nome_empresa if os.cliente else None,
            })

        leads_qs = Lead.objects.all()
        data.update({
            'pipeline_os': pipeline_os,
            'leads_total': leads_qs.count(),
            'leads_nao_lidos': leads_qs.filter(lido=False, convertido=False).count(),
            'leads_convertidos': leads_qs.filter(convertido=True).count(),
            'clientes_ativos': ClienteModel.objects.filter(ativo=True).count(),
            'ultimas_os': ultimas_os,
            'chamados_abertos': Chamado.objects.filter(ativo=True, status='ABERTO').count(),
        })

    return Response(data)


class ConciliacaoViewSet(ModelViewSet):
    permission_classes = [IsAdminOrFinanceiro]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['conta', 'status']

    def get_queryset(self):
        return ConciliacaoExtrato.objects.filter(is_active=True).order_by('-processado_em')

    def get_serializer_class(self):
        if self.action == 'list':
            return ConciliacaoListSerializer
        return ConciliacaoExtratoSerializer

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdmin()]
        return super().get_permissions()

    def destroy(self, request, *args, **kwargs):
        """Soft delete — nunca objeto.delete() (regra global do CLAUDE.md)."""
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='processar')
    def processar(self, request):
        arquivo  = request.data.get('arquivo')
        nome_conta = request.data.get('conta', '').upper()
        mes_str  = request.data.get('mes')
        senha    = request.data.get('senha', '609393')

        if not arquivo or not nome_conta:
            return Response({'erro': 'arquivo e conta são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

        return self._processar_arquivo(arquivo, nome_conta, mes_str, senha)

    @action(detail=False, methods=['post'], url_path='upload', parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        """
        POST /api/financeiro/conciliacoes/upload/ (multipart/form-data)
        Recebe o PDF do extrato direto do navegador — segunda forma de
        entrada além do PDF cair na pasta do Dropbox monitorada pelo
        watchdog. Salva no volume de uploads da VPS e processa na hora,
        reaproveitando o mesmo fluxo do 'processar'.
        """
        arquivo_upload = request.FILES.get('arquivo')
        nome_conta = request.data.get('conta', '').upper()
        mes_str  = request.data.get('mes')
        senha    = request.data.get('senha', '609393')

        if not arquivo_upload or not nome_conta:
            return Response({'erro': 'arquivo e conta são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

        nome_original = arquivo_upload.name or ''
        if not nome_original.lower().endswith('.pdf'):
            return Response({'erro': 'Apenas arquivos PDF são aceitos.'}, status=status.HTTP_400_BAD_REQUEST)

        limite_bytes = 20 * 1024 * 1024
        if arquivo_upload.size > limite_bytes:
            return Response({'erro': 'Arquivo excede o limite de 20MB.'}, status=status.HTTP_400_BAD_REQUEST)

        from pathlib import Path
        from django.conf import settings as django_settings
        from django.utils import timezone

        pasta_upload = Path(django_settings.MEDIA_ROOT) / 'extratos_upload'
        pasta_upload.mkdir(parents=True, exist_ok=True)

        # basename() descarta qualquer path embutido no nome enviado (evita path traversal)
        nome_seguro = Path(nome_original).name
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        destino = pasta_upload / f'{nome_conta}-{timestamp}-{nome_seguro}'

        with open(destino, 'wb') as f_destino:
            for chunk in arquivo_upload.chunks():
                f_destino.write(chunk)

        return self._processar_arquivo(str(destino), nome_conta, mes_str, senha)

    def _processar_arquivo(self, arquivo, nome_conta, mes_str, senha):
        try:
            conta = Conta.objects.get(nome__iexact=nome_conta, is_active=True)
        except Conta.DoesNotExist:
            return Response({'erro': f'Conta "{nome_conta}" não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        import re
        from datetime import datetime
        from pathlib import Path
        from financeiro.parsers import extrair_texto_pdf, parse_c6, parse_btg

        # Infere período
        if mes_str:
            try:
                periodo = datetime.strptime(mes_str + '-01', '%Y-%m-%d').date()
            except ValueError:
                return Response({'erro': 'Formato de mes inválido. Use YYYY-MM.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            m = re.search(r'(\d{4})-(\d{2})', Path(arquivo).name)
            if m:
                from datetime import date as date_type
                periodo = date_type(int(m.group(1)), int(m.group(2)), 1)
            else:
                return Response({'erro': 'Não foi possível inferir o mês. Informe o campo mes.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            texto = extrair_texto_pdf(arquivo, senha=senha)
        except Exception as e:
            return Response({'erro': f'Erro ao ler PDF: {e}'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        ano = periodo.year
        if 'C6' in nome_conta:
            transacoes_banco = parse_c6(texto, ano=ano)
        else:
            transacoes_banco = parse_btg(texto, ano=ano)

        transacoes_banco = [
            t for t in transacoes_banco
            if t['data'].year == periodo.year and t['data'].month == periodo.month
        ]

        from datetime import date as date_type
        primeiro_dia = periodo
        if periodo.month == 12:
            ultimo_dia = date_type(periodo.year + 1, 1, 1)
        else:
            ultimo_dia = date_type(periodo.year, periodo.month + 1, 1)

        lancamentos_sistema = list(
            LivroCaixa.objects.filter(
                conta=conta,
                data__gte=primeiro_dia,
                data__lt=ultimo_dia,
                estornado=False,
            ).order_by('data', 'created_at')
        )

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

            itens.append({
                'data_banco': t['data'],
                'descricao_banco': t['descricao'],
                'valor': t['valor'],
                'tipo': t['tipo'],
                'status': 'CONCILIADO' if match else 'FALTANDO_SISTEMA',
                'lancamento_lc': match,
            })

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

        faltando_sistema = [x for x in itens if x['status'] == 'FALTANDO_SISTEMA']
        faltando_banco   = [x for x in itens if x['status'] == 'FALTANDO_BANCO']

        from decimal import Decimal as D
        total_banco   = sum(t['valor'] for t in transacoes_banco if t['tipo'] == 'ENTRADA') - \
                        sum(t['valor'] for t in transacoes_banco if t['tipo'] == 'SAIDA')
        total_sistema = sum(lc.valor for lc in lancamentos_sistema if lc.tipo == 'ENTRADA') - \
                        sum(lc.valor for lc in lancamentos_sistema if lc.tipo == 'SAIDA')

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

        return Response(ConciliacaoExtratoSerializer(conc).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='pendentes')
    def pendentes(self, request):
        """
        GET /api/financeiro/conciliacoes/pendentes/
        Lista itens FALTANDO_SISTEMA não confirmados, agrupados por descricao_banco exata.
        """
        qs = ItemConciliacao.objects.filter(
            status='FALTANDO_SISTEMA',
            confirmado=False,
        ).order_by('descricao_banco', 'data_banco')

        grupos = {}
        for item in qs:
            chave = (item.descricao_banco, item.tipo)
            if chave not in grupos:
                grupos[chave] = {
                    'descricao': item.descricao_banco,
                    'tipo': item.tipo,
                    'total_ocorrencias': 0,
                    'valor_total': Decimal('0'),
                    'itens': [],
                }
            grupos[chave]['total_ocorrencias'] += 1
            grupos[chave]['valor_total'] += item.valor
            grupos[chave]['itens'].append(ItemConciliacaoSerializer(item).data)

        resultado = sorted(grupos.values(), key=lambda g: g['descricao'])
        return Response(resultado)

    @action(detail=True, methods=['post'], url_path='confirmar')
    def confirmar(self, request, pk=None):
        conc = self.get_object()
        ids_confirmar = request.data.get('itens', [])

        if ids_confirmar:
            itens_qs = conc.itens.filter(id__in=ids_confirmar, status='FALTANDO_SISTEMA', confirmado=False)
        else:
            itens_qs = conc.itens.filter(status='FALTANDO_SISTEMA', confirmado=False)

        from financeiro.parsers import inferir_categoria_descricao
        criados = 0
        erros   = []

        for item in itens_qs:
            try:
                with transaction.atomic():
                    if item.tipo == 'ENTRADA':
                        Aporte.objects.create(
                            conta=conc.conta,
                            descricao=item.descricao_banco[:255],
                            valor=item.valor,
                            data=item.data_banco,
                        )
                    else:
                        cat_nome  = inferir_categoria_descricao(item.descricao_banco)
                        categoria = None
                        if cat_nome:
                            categoria = Categoria.objects.filter(nome__icontains=cat_nome).first()

                        Despesa.objects.create(
                            conta=conc.conta,
                            descricao=item.descricao_banco[:255],
                            valor_bruto=item.valor,
                            vencimento=item.data_banco,
                            pagamento=item.data_banco,
                            status='PAGO',
                            tipo='VARIAVEL',
                            forma_pagamento='PIX',
                            categoria=categoria,
                        )

                    item.confirmado = True
                    item.save(update_fields=['confirmado'])
                    criados += 1
            except Exception as e:
                erros.append(f'{item.descricao_banco[:40]}: {e}')

        # Atualiza status da conciliação se não há mais divergências
        restantes = conc.itens.filter(status='FALTANDO_SISTEMA', confirmado=False).count()
        if restantes == 0:
            faltando_banco = conc.itens.filter(status='FALTANDO_BANCO').count()
            conc.status = 'COM_DIVERGENCIAS' if faltando_banco else 'PROCESSADO'
            conc.divergencias = faltando_banco
            conc.save(update_fields=['status', 'divergencias'])

        return Response({
            'criados': criados,
            'erros':   erros,
            'conciliacao': ConciliacaoExtratoSerializer(conc).data,
        })


class PadraoSeguroConciliacaoViewSet(ModelViewSet):
    """
    ViewSet para gerenciar padrões seguros de conciliação automática.
    Transações cujas descrições não batem com nenhum padrão ativo ficam
    como FALTANDO_SISTEMA aguardando revisão humana explícita.
    """
    serializer_class   = PadraoSeguroConciliacaoSerializer
    permission_classes = [IsAdminOrFinanceiro]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['tipo', 'is_active']

    def get_queryset(self):
        return PadraoSeguroConciliacao.objects.filter(is_active=True).order_by('tipo', 'descricao_padrao')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Soft delete — seta is_active=False em vez de deletar do banco."""
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)
