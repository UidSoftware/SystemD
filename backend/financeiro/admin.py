from django.contrib import admin

from .models import Aporte, Conta, Despesa, LivroCaixa, Receita


@admin.register(Conta)
class ContaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tipo', 'saldo_inicial', 'ativo']
    list_filter = ['tipo', 'ativo']
    search_fields = ['nome']


@admin.register(Aporte)
class AporteAdmin(admin.ModelAdmin):
    list_display = ['descricao', 'tipo', 'valor', 'conta', 'data', 'responsavel']
    list_filter = ['tipo']
    search_fields = ['descricao', 'responsavel']
    date_hierarchy = 'data'


@admin.register(Receita)
class ReceitaAdmin(admin.ModelAdmin):
    list_display = ['descricao', 'tipo', 'cliente', 'valor_liquido', 'vencimento', 'status']
    list_filter = ['tipo', 'status']
    search_fields = ['descricao']
    date_hierarchy = 'vencimento'


@admin.register(Despesa)
class DespesaAdmin(admin.ModelAdmin):
    list_display = ['descricao', 'tipo', 'fornecedor', 'valor_liquido', 'vencimento', 'status']
    list_filter = ['tipo', 'status']
    search_fields = ['descricao', 'fornecedor']
    date_hierarchy = 'vencimento'


@admin.register(LivroCaixa)
class LivroCaixaAdmin(admin.ModelAdmin):
    list_display = ['data', 'tipo', 'origem', 'descricao', 'valor', 'saldo_atual', 'estornado']
    list_filter = ['tipo', 'origem', 'estornado']
    search_fields = ['descricao']
    date_hierarchy = 'data'

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
