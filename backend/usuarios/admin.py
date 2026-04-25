from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    model = Usuario
    list_display = ('email', 'nome', 'is_staff', 'ativo')
    list_filter = ('is_staff', 'ativo')
    ordering = ('email',)
    search_fields = ('email', 'nome')

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Dados', {'fields': ('nome',)}),
        ('Permissões', {'fields': ('ativo', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nome', 'password1', 'password2', 'is_staff'),
        }),
    )
