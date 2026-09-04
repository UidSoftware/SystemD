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


class IsAdminOrOperacionalOrFinanceiroOrContabilidadeInterna(BasePermission):
    """Igual IsAdminOrOperacionalOrFinanceiro, mas também libera CONTABILIDADE
    quando o usuário é interno da Uid (Usuario.externo=False) -- decisão
    03/09/2026: o módulo Email nunca é liberado pra parceiro externo (ex:
    escritório de contabilidade terceirizado), só pra quem é da própria Uid.
    Antes da existência do campo `externo`, CONTABILIDADE era bloqueada por
    completo nas views de email_client (decisão de 03/08/2026, quando só
    existia o usuário externo) -- agora a distinção certa é interno x
    externo, não mais o perfil sozinho."""
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if u.perfil in ['ADMIN', 'OPERACIONAL', 'FINANCEIRO']:
            return True
        return u.perfil == 'CONTABILIDADE' and not u.externo


class IsAdminOperacionalOrCliente(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.perfil in ['ADMIN', 'OPERACIONAL', 'CLIENTE'])


class IsAdminOrFinanceiroOrContabilidade(BasePermission):
    """So pra endpoints de RELATORIO (leitura). Nunca usar em ViewSet que
    tambem aceita POST/PATCH/DELETE sem checar o metodo -- Contabilidade
    nunca lanca Despesa/Receita/Conta/Aporte, so consulta relatorio."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.perfil in ['ADMIN', 'FINANCEIRO', 'CONTABILIDADE'])


class IsAdminOrOperacionalOrFinanceiroOrContabilidade(BasePermission):
    """So pro endpoint de dashboard financeiro (leitura) -- deliberadamente
    SEPARADA de IsAdminOrOperacionalOrFinanceiro (essa e' compartilhada com
    email_client/views.py; adicionar CONTABILIDADE naquela daria acesso a
    Email pra Contabilidade, o oposto do pedido do usuario 03/08/2026)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.perfil in ['ADMIN', 'OPERACIONAL', 'FINANCEIRO', 'CONTABILIDADE'])
