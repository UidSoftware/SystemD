from django.contrib import admin
from .models import Prospecto, SocioProspecto


class SocioProspectoInline(admin.TabularInline):
    model = SocioProspecto
    extra = 1


@admin.register(Prospecto)
class ProspectoAdmin(admin.ModelAdmin):
    list_display = ('nome_empresa', 'segmento', 'responsavel', 'convertido', 'criado_em')
    list_filter = ('convertido', 'ativo', 'segmento')
    search_fields = ('nome_empresa', 'socios__nome', 'socios__email')
    inlines = [SocioProspectoInline]
