from django.contrib import admin
from .models import Produto

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display  = ['nome', 'tipo', 'categoria', 'unidade', 'preco_padrao', 'ativo']
    list_filter   = ['tipo', 'categoria', 'ativo']
    search_fields = ['nome', 'descricao']
