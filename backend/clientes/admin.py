from django.contrib import admin
from .models import Cliente, SocioCliente


class SocioClienteInline(admin.TabularInline):
    model = SocioCliente
    extra = 1


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('nome_empresa', 'segmento', 'dominio_email', 'usuario', 'ativo')
    list_filter = ('segmento', 'estado', 'ativo')
    search_fields = ('nome_empresa', 'socios__nome', 'socios__email', 'dominio_email')
    ordering = ('-criado_em',)
    inlines = [SocioClienteInline]
