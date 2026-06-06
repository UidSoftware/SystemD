from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import OS, FaseOS, Contrato, Chamado, MensagemChamado, StatusOS, Entrevista, ArquiteturaTecnica
from .serializers import (
    OSListSerializer, OSDetailSerializer, OSCreateSerializer,
    ContratoSerializer, ChamadoSerializer, MensagemChamadoSerializer,
    EntrevistaSerializer, ArquiteturaTecnicaSerializer,
)
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsAdmin, IsAdminOrOperacional


class OSViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ['list', 'create', 'update', 'partial_update', 'avancar']:
            return [IsAdminOrOperacional()]
        if self.action == 'destroy':
            return [IsAdmin()]
        # retrieve: admin, operacional e cliente (própria OS)
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        user = self.request.user
        qs = OS.objects.select_related('cliente', 'responsavel').prefetch_related(
            'fases', 'chamados__mensagens', 'chamados__aberto_por',
        )
        if user.perfil == 'CLIENTE':
            cliente = getattr(user, 'cliente_perfil', None)
            if cliente:
                return qs.filter(cliente=cliente, ativo=True)
            return qs.none()
        busca = self.request.query_params.get('busca')
        status_filtro = self.request.query_params.get('status')
        if busca:
            qs = qs.filter(titulo__icontains=busca) | qs.filter(cliente__nome_empresa__icontains=busca)
        if status_filtro:
            qs = qs.filter(status=status_filtro)
        return qs.filter(ativo=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return OSListSerializer
        if self.action == 'create':
            return OSCreateSerializer
        return OSDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if user.perfil == 'CLIENTE':
            cliente = getattr(user, 'cliente_perfil', None)
            if not cliente or instance.cliente_id != cliente.id:
                return Response({'erro': 'Acesso negado.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(OSDetailSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def avancar(self, request, pk=None):
        os_obj = self.get_object()
        proximo = os_obj.proximo_status()
        if not proximo:
            return Response({'erro': 'OS já está no status final ou cancelada.'}, status=status.HTTP_400_BAD_REQUEST)
        descricao = request.data.get('descricao', '')
        os_obj.status = proximo
        os_obj.save()
        FaseOS.objects.create(
            os=os_obj,
            fase=proximo,
            responsavel=request.user,
            descricao=descricao,
        )
        return Response(OSDetailSerializer(os_obj).data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        os_obj = self.get_object()
        if os_obj.status == StatusOS.CANCELADA:
            return Response({'erro': 'OS já está cancelada.'}, status=status.HTTP_400_BAD_REQUEST)
        descricao = request.data.get('descricao', 'OS cancelada.')
        os_obj.status = StatusOS.CANCELADA
        os_obj.ativo = False
        os_obj.save()
        FaseOS.objects.create(
            os=os_obj,
            fase=StatusOS.CANCELADA,
            responsavel=request.user,
            descricao=descricao,
        )
        return Response({'mensagem': 'OS cancelada com sucesso.'})


class ContratoViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        os_pk = self.kwargs.get('os_pk')
        return Contrato.objects.filter(os_id=os_pk)

    def perform_create(self, serializer):
        os_pk = self.kwargs.get('os_pk')
        serializer.save(os_id=os_pk)


class ChamadoViewSet(viewsets.ModelViewSet):
    serializer_class = ChamadoSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated()]
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        os_pk = self.kwargs.get('os_pk')
        user = self.request.user
        qs = Chamado.objects.filter(os_id=os_pk, ativo=True).prefetch_related('mensagens__autor')
        if user.perfil == 'CLIENTE':
            cliente = getattr(user, 'cliente_perfil', None)
            if cliente:
                return qs.filter(os__cliente=cliente)
            return qs.none()
        return qs

    def perform_create(self, serializer):
        os_pk = self.kwargs.get('os_pk')
        serializer.save(os_id=os_pk, aberto_por=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MensagemChamadoViewSet(viewsets.ModelViewSet):
    serializer_class = MensagemChamadoSerializer
    http_method_names = ['get', 'post']

    def get_permissions(self):
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        chamado_pk = self.kwargs.get('chamado_pk')
        return MensagemChamado.objects.filter(chamado_id=chamado_pk)

    def perform_create(self, serializer):
        chamado_pk = self.kwargs.get('chamado_pk')
        serializer.save(chamado_id=chamado_pk, autor=self.request.user)


class ChamadoGlobalViewSet(viewsets.ModelViewSet):
    """ViewSet para /api/chamados/ — acesso direto sem contexto de OS."""
    serializer_class = ChamadoSerializer

    def get_permissions(self):
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        user = self.request.user
        qs = Chamado.objects.filter(ativo=True).select_related('os__cliente', 'aberto_por').prefetch_related('mensagens__autor')
        if user.perfil == 'CLIENTE':
            cliente = getattr(user, 'cliente_perfil', None)
            if cliente:
                return qs.filter(os__cliente=cliente)
            return qs.none()
        status_filtro = self.request.query_params.get('status')
        if status_filtro:
            qs = qs.filter(status=status_filtro)
        return qs

    def perform_create(self, serializer):
        serializer.save(aberto_por=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MensagemGlobalViewSet(viewsets.ModelViewSet):
    """ViewSet para /api/chamados/{id}/mensagens/."""
    serializer_class = MensagemChamadoSerializer
    http_method_names = ['get', 'post']

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        return MensagemChamado.objects.filter(chamado_id=self.kwargs.get('chamado_pk'))

    def perform_create(self, serializer):
        serializer.save(chamado_id=self.kwargs.get('chamado_pk'), autor=self.request.user)


class EntrevistaViewSet(viewsets.ModelViewSet):
    serializer_class = EntrevistaSerializer

    def get_permissions(self):
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        return Entrevista.objects.select_related('cliente').filter(ativo=True)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ArquiteturaTecnicaViewSet(viewsets.ModelViewSet):
    serializer_class = ArquiteturaTecnicaSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        return ArquiteturaTecnica.objects.all()
