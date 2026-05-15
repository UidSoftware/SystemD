from django.contrib import admin
from .models import Entrega


@admin.register(Entrega)
class EntregaAdmin(admin.ModelAdmin):
    list_display = ('empresa', 'data', 'origem', 'destino', 'status', 'confirmacao', 'registrado_por')
    list_filter = ('status', 'confirmacao', 'ativo', 'data')
    search_fields = ('empresa__nome_empresa', 'origem', 'destino', 'descricao')
    date_hierarchy = 'data'
