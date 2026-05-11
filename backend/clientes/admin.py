from django.contrib import admin
from .models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('nome_empresa', 'segmento', 'dominio_email', 'usuario', 'ativo')
    list_filter = ('segmento', 'estado', 'ativo')
    search_fields = ('nome_empresa', 'nome_contato', 'email', 'dominio_email')
    ordering = ('-criado_em',)
