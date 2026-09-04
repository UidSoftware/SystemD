from django.contrib import admin
from .models import Nicho


@admin.register(Nicho)
class NichoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'ativo', 'criado_em')
    list_filter = ('ativo',)
    search_fields = ('nome',)
