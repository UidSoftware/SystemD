from django.contrib import admin
from .models import Prospecto


@admin.register(Prospecto)
class ProspectoAdmin(admin.ModelAdmin):
    list_display = ('nome_empresa', 'nome_contato', 'email', 'segmento', 'responsavel', 'convertido', 'criado_em')
    list_filter = ('convertido', 'ativo', 'segmento')
    search_fields = ('nome_empresa', 'nome_contato', 'email')
