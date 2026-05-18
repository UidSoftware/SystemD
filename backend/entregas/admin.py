from django.contrib import admin
from .models import Unidade, Entrega


@admin.register(Unidade)
class UnidadeAdmin(admin.ModelAdmin):
    list_display = ('nome', 'ativo', 'criado_em')
    search_fields = ('nome',)


@admin.register(Entrega)
class EntregaAdmin(admin.ModelAdmin):
    list_display = ('empresa', 'data', 'solicitante', 'de', 'para', 'motoboy', 'status', 'confirmacao', 'registrado_por')
    list_filter = ('status', 'confirmacao', 'ativo', 'data')
    search_fields = ('empresa__nome_empresa', 'solicitante', 'motoboy', 'descricao')
    date_hierarchy = 'data'
