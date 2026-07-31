from django.contrib import admin
from .models import ConversaoUnidade, EntradaEstoque, Produto

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display  = ['nome', 'tipo', 'categoria', 'unidade', 'quantidade_estoque', 'preco_padrao', 'ativo']
    list_filter   = ['tipo', 'categoria', 'ativo']
    search_fields = ['nome', 'descricao']


@admin.register(ConversaoUnidade)
class ConversaoUnidadeAdmin(admin.ModelAdmin):
    list_display  = ['produto', 'unidade', 'quantidade_por_base']
    list_filter   = ['unidade']


@admin.register(EntradaEstoque)
class EntradaEstoqueAdmin(admin.ModelAdmin):
    list_display  = ['produto', 'quantidade', 'unidade', 'quantidade_base', 'criado_em']
    list_filter   = ['unidade']
    search_fields = ['produto__nome', 'nota_fiscal']
