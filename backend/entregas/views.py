from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from rest_framework.permissions import IsAuthenticated
from .models import Unidade, Entrega, ConfirmacaoEntrega
from .serializers import UnidadeSerializer, EntregaSerializer
from .export_pdf import exportar_pdf
from .export_excel import exportar_excel
from usuarios.permissions import IsAdmin, IsAdminOrOperacional, IsAdminOperacionalOrCliente


class UnidadeViewSet(viewsets.ModelViewSet):
    serializer_class = UnidadeSerializer
    permission_classes = [IsAdminOrOperacional]

    def get_queryset(self):
        qs = Unidade.objects.all()
        if self.request.query_params.get('ativas'):
            return qs.filter(ativo=True)
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EntregaViewSet(viewsets.ModelViewSet):
    serializer_class = EntregaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'confirmacao']
    search_fields = ['solicitante', 'motoboy', 'descricao']
    ordering_fields = ['data', 'criado_em']
    ordering = ['-data', '-hora']

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdmin()]
        if self.action == 'confirmar':
            return [IsAdminOperacionalOrCliente()]
        if self.action in ['list', 'retrieve', 'exportar_pdf', 'exportar_excel']:
            return [IsAdminOperacionalOrCliente()]
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        user = self.request.user
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        if user.perfil == 'CLIENTE':
            cliente = getattr(user, 'cliente_perfil', None)
            if not cliente:
                return Entrega.objects.none()
            qs = Entrega.objects.filter(empresa=cliente, ativo=True).select_related(
                'empresa', 'registrado_por', 'unidade', 'de', 'para')
        else:
            qs = Entrega.objects.filter(ativo=True).select_related(
                'empresa', 'registrado_por', 'unidade', 'de', 'para')
            empresa_id = self.request.query_params.get('empresa')
            if empresa_id:
                qs = qs.filter(empresa_id=empresa_id)

        unidade_id = self.request.query_params.get('unidade')
        if unidade_id:
            from django.db.models import Q
            qs = qs.filter(Q(unidade_id=unidade_id) | Q(de_id=unidade_id) | Q(para_id=unidade_id))
        if data_inicio:
            qs = qs.filter(data__gte=data_inicio)
        if data_fim:
            qs = qs.filter(data__lte=data_fim)
        return qs

    def perform_create(self, serializer):
        serializer.save(registrado_por=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='confirmar')
    def confirmar(self, request, pk=None):
        entrega = self.get_object()
        user = request.user

        # CLIENTE só confirma entregas da própria empresa
        if user.perfil == 'CLIENTE':
            cliente = getattr(user, 'cliente_perfil', None)
            if not cliente or entrega.empresa != cliente:
                return Response({'erro': 'Sem permissão'}, status=status.HTTP_403_FORBIDDEN)

        confirmacao = request.data.get('confirmacao')
        motivo = request.data.get('confirmacao_motivo', '')

        if confirmacao not in [c[0] for c in ConfirmacaoEntrega.choices]:
            return Response({'erro': 'Valor de confirmação inválido'}, status=status.HTTP_400_BAD_REQUEST)

        if confirmacao == ConfirmacaoEntrega.NAO_CONFIRMADA and not motivo:
            return Response({'erro': 'Motivo obrigatório quando não confirmada'}, status=status.HTTP_400_BAD_REQUEST)

        entrega.confirmacao = confirmacao
        entrega.confirmacao_motivo = motivo
        entrega.confirmado_por = user
        entrega.confirmado_em = timezone.now()
        entrega.save()
        return Response(EntregaSerializer(entrega).data)

    @action(detail=False, methods=['get'], url_path='exportar/pdf')
    def exportar_pdf(self, request):
        qs = self.get_queryset()
        user = request.user
        data_inicio = request.query_params.get('data_inicio', '')
        data_fim = request.query_params.get('data_fim', '')

        if user.perfil == 'CLIENTE':
            empresa = getattr(user, 'cliente_perfil', None)
        else:
            empresa_id = request.query_params.get('empresa')
            if empresa_id:
                from clientes.models import Cliente
                try:
                    empresa = Cliente.objects.get(pk=empresa_id)
                except Cliente.DoesNotExist:
                    empresa = None
            else:
                empresa = None

        return exportar_pdf(list(qs), empresa, data_inicio, data_fim)

    @action(detail=False, methods=['get'], url_path='exportar/excel')
    def exportar_excel(self, request):
        qs = self.get_queryset()
        user = request.user
        data_inicio = request.query_params.get('data_inicio', '')
        data_fim = request.query_params.get('data_fim', '')

        if user.perfil == 'CLIENTE':
            empresa = getattr(user, 'cliente_perfil', None)
        else:
            empresa_id = request.query_params.get('empresa')
            if empresa_id:
                from clientes.models import Cliente
                try:
                    empresa = Cliente.objects.get(pk=empresa_id)
                except Cliente.DoesNotExist:
                    empresa = None
            else:
                empresa = None

        return exportar_excel(list(qs), empresa, data_inicio, data_fim)
