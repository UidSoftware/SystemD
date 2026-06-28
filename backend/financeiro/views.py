from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, F, Sum, Q
from rest_framework import status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend

from financeiro.mixins import AuditMixin, ReadCreateViewSet
from usuarios.permissions import IsAdmin, IsAdminOrFinanceiro, IsAdminOrOperacionalOrFinanceiro

from .models import Aporte, Categoria, Conta, Despesa, FormaPagamento, Fornecedor, LivroCaixa, Receita
from .serializers import (
    AporteSerializer, CategoriaSerializer, ContaSerializer, DespesaSerializer,
    FornecedorSerializer, LivroCaixaSerializer, ReceitaSerializer,
)


class CategoriaViewSet(ModelViewSet):
    queryset = Categoria.objects.filter(ativo=True).order_by('nome')
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdminOrFinanceiro]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['tipo']

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()


class ContaViewSet(AuditMixin, ModelViewSet):
    queryset = Conta.objects.filter(ativo=True).order_by('nome')
    serializer_class = ContaSerializer
    permission_classes = [IsAdminOrFinanceiro]
    filter_backends = [SearchFilter]
    search_fields = ['nome']

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

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
            conta_destino = Conta.objects.get(id=conta_destino_id, ativo=True)
        except Conta.DoesNotExist:
            return Response({'erro': 'Conta destino nao encontrada.'}, status=400)

        if conta_origem.id == conta_destino.id:
            return Response({'erro': 'Conta origem e destino devem ser diferentes.'}, status=400)

        try:
            data = date_cls.fromisoformat(data_str)
        except ValueError:
            return Response({'erro': 'Data invalida.'}, status=400)

        def ultimo_saldo(conta):
            ult = LivroCaixa.objects.select_for_update().filter(conta=conta).order_by('-data', '-criado_em').first()
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
                criado_por=request.user,
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
                criado_por=request.user,
            )

        return Response({'ok': True, 'mensagem': f'Transferencia de R$ {valor} realizada com sucesso.'})


class AporteViewSet(AuditMixin, ModelViewSet):
    queryset = Aporte.objects.filter(ativo=True).select_related('conta').order_by('-data')
    serializer_class = AporteSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['tipo', 'conta']
    ordering_fields = ['data', 'valor']

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save()


class ReceitaViewSet(AuditMixin, ModelViewSet):
    queryset = (
        Receita.objects.filter(ativo=True)
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
            campos_base['criado_por'] = self.request.user
            pagar_primeiro = campos_base.get('status') == 'RECEBIDO'

            for i in range(quantidade):
                campos_base['vencimento'] = proxima_data(vencimento_base, i, frequencia)
                if pagar_primeiro and i > 0:
                    Receita.objects.create(**{**campos_base, 'status': 'PENDENTE', 'recebimento': None})
                else:
                    Receita.objects.create(**campos_base)
        else:
            serializer.save(criado_por=self.request.user)

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


class DespesaViewSet(AuditMixin, ModelViewSet):
    queryset = (
        Despesa.objects.filter(ativo=True)
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
            campos_base['criado_por'] = self.request.user

            pagar_primeiro = campos_base.get('status') == 'PAGO'
            for i in range(quantidade):
                campos_base['vencimento'] = proxima_data(vencimento_base, i, frequencia)
                if pagar_primeiro and i > 0:
                    campos_iter = {**campos_base, 'status': 'PENDENTE', 'pagamento': None, 'forma_pagamento': ''}
                    Despesa.objects.create(**campos_iter)
                else:
                    Despesa.objects.create(**campos_base)
        else:
            serializer.save(criado_por=self.request.user)

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
                conta = Conta.objects.get(id=conta_id, ativo=True)
            except Conta.DoesNotExist:
                return Response({'conta': 'Conta não encontrada.'}, status=400)

        with transaction.atomic():
            ultimo = (
                LivroCaixa.objects.select_for_update()
                .filter(conta=conta)
                .order_by('-data', '-criado_em')
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
                criado_por=request.user,
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
    queryset = Fornecedor.objects.filter(ativo=True).order_by('forn_nome')
    serializer_class = FornecedorSerializer
    permission_classes = [IsAdminOrFinanceiro]
    filter_backends = [SearchFilter]
    search_fields = ['forn_nome', 'forn_cnpj']

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save()


class LivroCaixaViewSet(ReadCreateViewSet):
    queryset = (
        LivroCaixa.objects.select_related('conta')
        .order_by('-data', '-criado_em')
    )
    serializer_class = LivroCaixaSerializer
    permission_classes = [IsAdminOrFinanceiro]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['conta', 'tipo', 'origem', 'estornado']
    ordering_fields = ['data', 'valor']

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def estornar(self, request, pk=None):
        lancamento = self.get_object()
        if lancamento.estornado:
            return Response({'detail': 'Lançamento já estornado.'}, status=400)

        motivo = request.data.get('motivo', '')
        with transaction.atomic():
            ultimo = (
                LivroCaixa.objects.select_for_update()
                .filter(conta=lancamento.conta)
                .order_by('-data', '-criado_em')
                .first()
            )
            saldo_anterior = ultimo.saldo_atual if ultimo else lancamento.conta.saldo_inicial
            tipo_estorno = 'ENTRADA' if lancamento.tipo == 'SAIDA' else 'SAIDA'
            if tipo_estorno == 'ENTRADA':
                saldo_atual = saldo_anterior + lancamento.valor
            else:
                saldo_atual = saldo_anterior - lancamento.valor

            estorno = LivroCaixa.objects.create(
                conta=lancamento.conta,
                tipo=tipo_estorno,
                origem='MANUAL',
                descricao=f'Estorno: {lancamento.descricao}' + (f' — {motivo}' if motivo else ''),
                valor=lancamento.valor,
                data=date.today(),
                saldo_anterior=saldo_anterior,
                saldo_atual=saldo_atual,
                criado_por=request.user,
                estorno_de=lancamento,
            )
            lancamento.estornado = True
            lancamento.save(update_fields=['estornado'])

        return Response(LivroCaixaSerializer(estorno).data, status=201)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrFinanceiro])
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

        # Saldo real = último saldo_atual da cadeia por conta (inclui saldo_inicial)
        if conta_id:
            try:
                conta = Conta.objects.get(id=conta_id)
                ultimo = LivroCaixa.objects.filter(conta=conta).order_by('data', 'criado_em').last()
                saldo_atual = ultimo.saldo_atual if ultimo else conta.saldo_inicial
            except Conta.DoesNotExist:
                saldo_atual = total_entradas - total_saidas
        else:
            saldo_atual = Decimal('0')
            for conta in Conta.objects.filter(ativo=True):
                ultimo = LivroCaixa.objects.filter(conta=conta).order_by('data', 'criado_em').last()
                saldo_atual += (ultimo.saldo_atual if ultimo else conta.saldo_inicial)

        return Response({
            'total_entradas': total_entradas,
            'total_saidas':   total_saidas,
            'saldo_atual':    saldo_atual,
        })


# ─── Views calculadas ────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminOrFinanceiro])
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

    # Saldo real ao início do mês = último saldo_atual por conta antes do período
    import calendar as _cal
    primeiro_dia = date(ano, mes, 1)
    from django.db.models import Max
    if conta_id and conta:
        prev = LivroCaixa.objects.filter(conta=conta, data__lt=primeiro_dia, estornado=False).order_by('data', 'criado_em').last()
        saldo_inicial = prev.saldo_atual if prev else conta.saldo_inicial
    else:
        saldo_inicial = Decimal('0')
        for _c in Conta.objects.filter(ativo=True):
            _prev = LivroCaixa.objects.filter(conta=_c, data__lt=primeiro_dia, estornado=False).order_by('data', 'criado_em').last()
            saldo_inicial += (_prev.saldo_atual if _prev else _c.saldo_inicial)
    total_entradas = agg['total_entradas'] or Decimal('0')
    total_saidas   = agg['total_saidas']   or Decimal('0')
    saldo_final    = saldo_inicial + total_entradas - total_saidas

    lancamentos = LivroCaixaSerializer(qs.order_by('data', 'criado_em'), many=True).data

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
@permission_classes([IsAdminOrFinanceiro])
def dre(request):
    """GET /api/financeiro/dre/?ano=2026"""
    try:
        ano = int(request.query_params.get('ano', date.today().year))
    except ValueError:
        return Response({'detail': 'Ano inválido.'}, status=400)

    meses = []
    totais = {
        'receita_bruta': Decimal('0'), 'descontos': Decimal('0'),
        'receita_liquida': Decimal('0'), 'despesas_fixas': Decimal('0'),
        'despesas_variaveis': Decimal('0'), 'prolabore': Decimal('0'),
        'impostos': Decimal('0'), 'total_despesas': Decimal('0'),
        'resultado': Decimal('0'),
    }

    for mes in range(1, 13):
        rec_qs = Receita.objects.filter(
            recebimento__year=ano, recebimento__month=mes, status='RECEBIDO', ativo=True,
        )
        desp_qs = Despesa.objects.filter(
            pagamento__year=ano, pagamento__month=mes, status='PAGO', ativo=True, estornado=False,
        )

        receita_bruta  = rec_qs.aggregate(v=Sum('valor_bruto'))['v'] or Decimal('0')
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
@permission_classes([IsAdminOrFinanceiro])
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
            recebimento__year=ano, ativo=True,
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

        agg_mes = LivroCaixa.objects.filter(
            estornado=False, data__gte=primeiro_dia, data__lte=ultimo_dia,
        ).aggregate(
            rec=Sum('valor', filter=Q(tipo='ENTRADA')),
            des=Sum('valor', filter=Q(tipo='SAIDA')),
        )
        receita_mes = agg_mes['rec'] or Decimal('0')
        despesa_mes = agg_mes['des'] or Decimal('0')

        mrr = Receita.objects.filter(
            ativo=True, tipo='MENSALIDADE', status='RECEBIDO',
            recebimento__gte=primeiro_dia, recebimento__lte=ultimo_dia,
        ).aggregate(v=Sum('valor_liquido'))['v'] or Decimal('0')

        prox_30 = hoje + timedelta(days=30)
        receitas_vencer = []
        for r in (
            Receita.objects.filter(ativo=True, status='PENDENTE', vencimento__gte=hoje, vencimento__lte=prox_30)
            .select_related('cliente').order_by('vencimento')[:8]
        ):
            receitas_vencer.append({
                'id': r.id, 'descricao': r.descricao,
                'valor_liquido': r.valor_liquido, 'vencimento': str(r.vencimento),
                'cliente_nome': r.cliente.nome_empresa if r.cliente else None,
            })

        despesas_vencer = []
        for d in (
            Despesa.objects.filter(ativo=True, status='PENDENTE', vencimento__gte=hoje, vencimento__lte=prox_30)
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
            agg = LivroCaixa.objects.filter(estornado=False, data__gte=p, data__lte=u).aggregate(
                rec=Sum('valor', filter=Q(tipo='ENTRADA')),
                des=Sum('valor', filter=Q(tipo='SAIDA')),
            )
            rec = agg['rec'] or Decimal('0')
            des = agg['des'] or Decimal('0')
            grafico.append({'mes': f'{y}-{m:02d}', 'label': MESES_PT[m - 1], 'receita': rec, 'despesa': des, 'resultado': rec - des})

        raw_top = list(
            Receita.objects.filter(ativo=True, status='RECEBIDO', recebimento__year=hoje.year, cliente__isnull=False)
            .values('cliente__nome_empresa')
            .annotate(total=Sum('valor_liquido'))
            .order_by('-total')[:5]
        )
        top_clientes = [{'cliente_nome': r['cliente__nome_empresa'], 'total': r['total']} for r in raw_top]

        # Saldo total de todas as contas (último saldo_atual de cada conta)
        saldo_total = Decimal('0')
        for _c in Conta.objects.filter(ativo=True):
            _ult = LivroCaixa.objects.filter(conta=_c, estornado=False).order_by('data', 'criado_em').last()
            saldo_total += (_ult.saldo_atual if _ult else _c.saldo_inicial)

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
            'receitas_atrasadas': Receita.objects.filter(ativo=True, status='ATRASADO').count(),
            'despesas_atrasadas': Despesa.objects.filter(ativo=True, status='ATRASADO').count(),
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
