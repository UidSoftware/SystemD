from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from usuarios.permissions import IsAdminOrOperacional
from .models import Produto
from .serializers import ProdutoSerializer


class ProdutoViewSet(viewsets.ModelViewSet):
    serializer_class   = ProdutoSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['tipo', 'categoria', 'ativo']
    search_fields      = ['nome', 'descricao', 'categoria']
    ordering_fields    = ['nome', 'tipo', 'categoria', 'preco_padrao', 'criado_em']

    def get_permissions(self):
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        qs = Produto.objects.filter(ativo=True)
        # catálogo público para seletores — aceita ?todos=1 para incluir inativos (só ADMIN)
        if self.request.query_params.get('todos') == '1':
            qs = Produto.objects.all()
        return qs

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
