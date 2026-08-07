from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend

from .models import Artefato
from .serializers import ArtefatoSerializer
from .authentication import ServiceTokenAuthentication
from .permissions import PodeGerenciarArtefatos


class ArtefatoViewSet(viewsets.ModelViewSet):
    serializer_class = ArtefatoSerializer
    authentication_classes = [ServiceTokenAuthentication, JWTAuthentication]
    permission_classes = [PodeGerenciarArtefatos]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['tipo', 'agente', 'content_type', 'object_id']
    search_fields = ['titulo', 'conteudo']
    ordering = ['-criado_em']
    http_method_names = ['get', 'post', 'patch', 'put', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = Artefato.objects.filter(ativo=True).select_related('content_type')
        # Atalho pro Kanban de Manutencao (esteira em fila) -- evita o
        # frontend ter que hardcodar o content_type id de Manutencao pra
        # filtrar por ?content_type=X&object_id=Y.
        manutencao_id = self.request.query_params.get('manutencao')
        if manutencao_id:
            from django.contrib.contenttypes.models import ContentType
            from ordens.models import Manutencao
            ct = ContentType.objects.get_for_model(Manutencao)
            qs = qs.filter(content_type=ct, object_id=manutencao_id)
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save(update_fields=['ativo'])
        return Response(status=status.HTTP_204_NO_CONTENT)
