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
