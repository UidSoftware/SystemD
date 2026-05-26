from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum, Q
from rest_framework import status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend

from financeiro.mixins import AuditMixin, ReadCreateViewSet
from usuarios.permissions import IsAdmin, IsAdminOrFinanceiro

from .models import Aporte, Conta, Despesa, LivroCaixa, Receita
from .serializers import (
    AporteSerializer, ContaSerializer, DespesaSerializer,
    LivroCaixaSerializer, ReceitaSerializer,
)


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
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo', 'status', 'cliente', 'os', 'conta']
    search_fields = ['descricao']
    ordering_fields = ['vencimento', 'valor_liquido', 'status']

    def perform_create(self, serializer):
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
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo', 'status', 'conta']
    search_fields = ['descricao', 'fornecedor']
    ordering_fields = ['vencimento', 'valor_liquido', 'status']

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=['patch'], url_path='pagar', permission_classes=[IsAdminOrFinanceiro])
    def marcar_pago(self, request, pk=None):
        despesa = self.get_object()
        pagamento = request.data.get('pagamento') or date.today().isoformat()
        conta_id  = request.data.get('conta')
        if conta_id:
            try:
                despesa.conta = Conta.objects.get(id=conta_id)
            except Conta.DoesNotExist:
                return Response({'conta': 'Conta não encontrada.'}, status=400)
        despesa.pagamento = pagamento
        despesa.status = 'PAGO'
        despesa.save()
        return Response(DespesaSerializer(despesa).data)


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
        conta_id = request.query_params.get('conta')
        qs = LivroCaixa.objects.filter(estornado=False)
        if conta_id:
            qs = qs.filter(conta_id=conta_id)
        agg = qs.aggregate(
            total_entradas=Sum('valor', filter=Q(tipo='ENTRADA')),
            total_saidas=Sum('valor', filter=Q(tipo='SAIDA')),
        )
        ultimo = qs.order_by('-data', '-criado_em').first()
        return Response({
            'total_entradas': agg['total_entradas'] or Decimal('0'),
            'total_saidas':   agg['total_saidas'] or Decimal('0'),
            'saldo_atual':    ultimo.saldo_atual if ultimo else Decimal('0'),
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

    primeiro_lancamento = qs.order_by('data', 'criado_em').first()
    saldo_inicial = primeiro_lancamento.saldo_anterior if primeiro_lancamento else Decimal('0')
    ultimo = qs.order_by('-data', '-criado_em').first()
    saldo_final = ultimo.saldo_atual if ultimo else saldo_inicial

    lancamentos = LivroCaixaSerializer(qs.order_by('data', 'criado_em'), many=True).data

    return Response({
        'periodo':         f'{mes:02d}/{ano}',
        'conta':           conta.nome if conta else 'Todas',
        'saldo_inicial':   saldo_inicial,
        'total_entradas':  agg['total_entradas'] or Decimal('0'),
        'total_saidas':    agg['total_saidas'] or Decimal('0'),
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
            pagamento__year=ano, pagamento__month=mes, status='PAGO', ativo=True,
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
