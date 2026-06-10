from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from usuarios.permissions import IsAdminOrOperacional
from .models import Notificacao
from .serializers import NotificacaoSerializer


class NotificacaoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificacaoSerializer

    def get_permissions(self):
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        user = self.request.user
        qs = Notificacao.objects.filter(ativo=True).select_related('atribuido_a', 'resolvida_por')

        if user.perfil != 'ADMIN':
            # Vê o que foi atribuído a ele diretamente, ou avisos gerais
            # (sem destinatário específico) endereçados ao próprio perfil.
            qs = qs.filter(
                Q(atribuido_a=user)
                | Q(atribuido_a__isnull=True, perfil_destino__isnull=True)
                | Q(atribuido_a__isnull=True, perfil_destino=user.perfil)
            )

        resolvida = self.request.query_params.get('resolvida')
        if resolvida is not None:
            qs = qs.filter(resolvida=resolvida.lower() == 'true')

        return qs

    @action(detail=True, methods=['post'])
    def resolver(self, request, pk=None):
        notificacao = self.get_object()
        notificacao.resolvida = True
        notificacao.resolvida_por = request.user
        notificacao.resolvida_em = timezone.now()
        notificacao.save()
        return Response(NotificacaoSerializer(notificacao).data)
