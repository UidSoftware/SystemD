from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from usuarios.permissions import IsAdminOrOperacional
from .models import Combo, ConversaoUnidade, EntradaEstoque, Produto
from .serializers import ComboSerializer, ConversaoUnidadeSerializer, EntradaEstoqueSerializer, ProdutoSerializer


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


class ComboViewSet(viewsets.ModelViewSet):
    serializer_class = ComboSerializer
    filter_backends  = [filters.SearchFilter, filters.OrderingFilter]
    search_fields    = ['nome']
    ordering_fields  = ['nome', 'criado_em']

    def get_permissions(self):
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        return Combo.objects.filter(ativo=True).prefetch_related('itens__produto')

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConversaoUnidadeViewSet(viewsets.ModelViewSet):
    serializer_class = ConversaoUnidadeSerializer
    filter_backends  = [DjangoFilterBackend]
    filterset_fields = ['produto']

    def get_permissions(self):
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        return ConversaoUnidade.objects.select_related('produto').all()


class EntradaEstoqueViewSet(viewsets.ModelViewSet):
    """Sempre cresce o estoque — nunca expor PUT/PATCH que altere quantidade_base
    retroativamente (o incremento em Produto.quantidade_estoque so roda na criacao,
    ver EntradaEstoque.save()). Correcao de erro de lancamento e via nova entrada
    negativa (quantidade negativa), nao editando uma entrada existente."""
    serializer_class = EntradaEstoqueSerializer
    http_method_names = ['get', 'post', 'head', 'options']
    filter_backends  = [DjangoFilterBackend]
    filterset_fields = ['produto']

    def get_permissions(self):
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        return EntradaEstoque.objects.select_related('produto', 'criado_por').all()

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)
