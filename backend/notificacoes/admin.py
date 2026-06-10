from django.contrib import admin
from .models import Notificacao


@admin.register(Notificacao)
class NotificacaoAdmin(admin.ModelAdmin):
    list_display = ('tipo', 'titulo', 'prioridade', 'atribuido_a', 'resolvida', 'criado_em')
    list_filter = ('tipo', 'prioridade', 'resolvida', 'ativo')
    search_fields = ('titulo', 'descricao', 'referencia')
