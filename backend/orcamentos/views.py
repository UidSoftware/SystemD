from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import Orcamento
from .serializers import OrcamentoSerializer
from .services import sync_to_contratid
from usuarios.permissions import IsAdmin, IsAdminOrOperacional


class OrcamentoViewSet(viewsets.ModelViewSet):
    serializer_class   = OrcamentoSerializer
    permission_classes = [IsAdminOrOperacional]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields   = ['status', 'cliente']
    search_fields      = ['cliente__nome_empresa']
    ordering_fields    = ['criado_em', 'numero', 'valido_ate']
    ordering           = ['-criado_em']

    def get_queryset(self):
        return (
            Orcamento.objects
            .filter(ativo=True)
            .select_related('cliente', 'criado_por')
            .prefetch_related('itens', 'cliente__socios')
        )

    def perform_create(self, serializer):
        orcamento = serializer.save(criado_por=self.request.user)
        sync_to_contratid(orcamento)

    def perform_update(self, serializer):
        orcamento = serializer.save()
        sync_to_contratid(orcamento)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='sincronizar', permission_classes=[IsAdminOrOperacional])
    def sincronizar(self, request, pk=None):
        orcamento = self.get_object()
        ok, result = sync_to_contratid(orcamento)
        if ok:
            return Response({'ok': True, 'contratid_id': result})
        return Response({'ok': False, 'erro': result}, status=500)
