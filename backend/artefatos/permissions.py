from rest_framework.permissions import BasePermission


class PodeGerenciarArtefatos(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_service', False):
            return True
        return getattr(user, 'perfil', None) in ['ADMIN', 'OPERACIONAL']
