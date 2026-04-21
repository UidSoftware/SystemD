from django.contrib import admin
from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('nome', 'email', 'empresa', 'origem', 'criado_em', 'lido')
    list_filter = ('lido', 'criado_em', 'origem')
    search_fields = ('nome', 'email', 'empresa')
    readonly_fields = ('criado_em',)
    list_editable = ('lido',)
