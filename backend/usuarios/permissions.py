from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.perfil == 'ADMIN')


class IsAdminOrOperacional(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.perfil in ['ADMIN', 'OPERACIONAL'])


class IsAdminOrFinanceiro(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.perfil in ['ADMIN', 'FINANCEIRO'])


class IsAdminOrOperacionalOrFinanceiro(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.perfil in ['ADMIN', 'OPERACIONAL', 'FINANCEIRO'])


class IsAdminOperacionalOrCliente(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.perfil in ['ADMIN', 'OPERACIONAL', 'CLIENTE'])


class IsAdminOrFinanceiroOrContabilidade(BasePermission):
    """So pra endpoints de RELATORIO (leitura). Nunca usar em ViewSet que
    tambem aceita POST/PATCH/DELETE sem checar o metodo -- Contabilidade
    nunca lanca Despesa/Receita/Conta/Aporte, so consulta relatorio."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.perfil in ['ADMIN', 'FINANCEIRO', 'CONTABILIDADE'])
