import hashlib
import secrets
from datetime import timedelta

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from .models import OS, FaseOS, Contrato, Chamado, MensagemChamado, StatusOS, Entrevista, ArquiteturaTecnica, Manutencao
from .serializers import (
    OSListSerializer, OSDetailSerializer, OSCreateSerializer,
    ContratoSerializer, ChamadoSerializer, MensagemChamadoSerializer,
    EntrevistaSerializer, ArquiteturaTecnicaSerializer,
    ManutencaoSerializer, OSParaManutencaoSerializer,
)
from rest_framework.permissions import IsAuthenticated, AllowAny
from usuarios.permissions import IsAdmin, IsAdminOrOperacional
from notificacoes.models import Notificacao, TipoNotificacao, PrioridadeNotificacao
from notificacoes.terminal_ticket import montar_briefing


class OSViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ['list', 'create', 'update', 'partial_update', 'avancar']:
            return [IsAdminOrOperacional()]
        if self.action in ['destroy', 'gerar_api_key']:
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

    @action(detail=True, methods=['post'], url_path='gerar-api-key')
    def gerar_api_key(self, request, pk=None):
        """Gera (ou regenera, invalidando a anterior) a chave de integração
        dessa OS -- usada por sistemas clientes (ex: um UidCore-derivado)
        pra criar Manutencao direto no SystemD via POST /api/integracoes/
        manutencoes/. Só guarda o hash; a chave em texto puro só aparece
        UMA VEZ, nesta resposta -- se perder, tem que gerar outra."""
        os_obj = self.get_object()
        chave = secrets.token_urlsafe(32)
        os_obj.api_key_hash = hashlib.sha256(chave.encode()).hexdigest()
        os_obj.api_key_criada_em = timezone.now()
        os_obj.save(update_fields=['api_key_hash', 'api_key_criada_em'])
        return Response({
            'chave': chave,
            'aviso': 'Guarde essa chave agora — ela não pode ser recuperada '
                     'depois de sair desta tela, só regenerada (o que '
                     'invalida a anterior).',
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def criar_manutencao_via_api(request):
    """POST /api/integracoes/manutencoes/
    Header: Authorization: ApiKey <chave>
    Body: {"descricao": "...", "prioridade": "BAIXA"|"MEDIA"|"ALTA" (opcional)}

    Permite que um sistema cliente (ex: um UidCore-derivado, quando o
    cliente final relata um problema dentro do próprio sistema dele) crie
    uma Manutencao direto no banco do SystemD, sem precisar de um humano
    da Uid cadastrando manualmente. A chave já identifica a OS -- o
    sistema chamador nunca escolhe/declara de qual cliente é, elimina erro
    ou uso indevido em nome de outro sistema.
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('ApiKey '):
        return Response({'erro': 'Header "Authorization: ApiKey <chave>" obrigatório.'}, status=401)
    chave = auth_header[len('ApiKey '):].strip()
    if not chave:
        return Response({'erro': 'Chave vazia.'}, status=401)

    chave_hash = hashlib.sha256(chave.encode()).hexdigest()
    os_obj = OS.objects.filter(api_key_hash=chave_hash, ativo=True).first()
    if not os_obj:
        return Response({'erro': 'Chave inválida.'}, status=403)

    descricao = (request.data.get('descricao') or '').strip()
    if not descricao:
        return Response({'erro': 'Campo "descricao" é obrigatório.'}, status=400)
    if not os_obj.caminho_servidor:
        return Response({'erro': 'OS sem caminho_servidor configurado — contate a Uid Software.'}, status=500)

    # Throttle simples por OS (nao por IP -- o chamador e sempre o mesmo
    # backend do sistema cliente, nao um usuario final direto): no maximo 5
    # manutencoes criadas via essa rota nas ultimas 24h pra essa OS, evita
    # flood (ex: bug em loop no sistema cliente reportando repetido).
    janela = timezone.now() - timedelta(hours=24)
    recentes = Manutencao.objects.filter(
        os=os_obj, criado_em__gte=janela, descricao__startswith='[via API]',
    ).count()
    if recentes >= 5:
        return Response(
            {'erro': 'Limite de manutenções via API atingido nas últimas 24h pra esse sistema. Contate a Uid Software diretamente.'},
            status=429,
        )

    prioridade = (request.data.get('prioridade') or '').strip().upper()
    prefixo = f'[Prioridade: {prioridade}] ' if prioridade in ('BAIXA', 'MEDIA', 'ALTA') else ''
    manutencao = Manutencao.objects.create(
        os=os_obj,
        descricao=f'[via API] {prefixo}{descricao}',
        caminho=os_obj.caminho_servidor,
    )

    return Response({'mensagem': 'Manutenção criada com sucesso.', 'manutencao_id': manutencao.id}, status=201)


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
        return Entrevista.objects.select_related('prospecto', 'prospecto__lead').filter(ativo=True)

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
        return ArquiteturaTecnica.objects.select_related(
            'entrevista', 'entrevista__prospecto', 'entrevista__prospecto__lead',
        ).filter(ativo=True)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ManutencaoViewSet(viewsets.ModelViewSet):
    """CRUD de pedidos de manutenção. Somente ADMIN."""
    serializer_class = ManutencaoSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        return [IsAdmin()]

    def get_queryset(self):
        qs = Manutencao.objects.select_related('os', 'os__cliente').filter(ativo=True)
        feito = self.request.query_params.get('feito')
        os_id = self.request.query_params.get('os')
        if feito is not None:
            qs = qs.filter(feito=feito.lower() in ('true', '1'))
        if os_id:
            qs = qs.filter(os_id=os_id)
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def notificar(self, request, pk=None):
        """
        Cria a notificacao IMPEDIMENTO_ESTEIRA na hora, sem esperar o cron
        (disparar_hotfix.py) tentar e falhar primeiro. Disparo manual — o
        cron continua rodando normalmente em paralelo, como fallback
        automatico; nao mexe em disparada_em de proposito, pra nao tirar a
        manutencao da fila de tentativa automatica.
        """
        manutencao = self.get_object()
        if manutencao.feito:
            return Response({'detail': 'Manutenção já concluída.'}, status=status.HTTP_400_BAD_REQUEST)

        referencia = f'manutencao:{manutencao.id}'
        if Notificacao.objects.filter(referencia=referencia, resolvida=False).exists():
            return Response({'detail': 'Já existe notificação pendente para esta manutenção.', 'criada': False})

        Notificacao.objects.create(
            tipo=TipoNotificacao.IMPEDIMENTO_ESTEIRA,
            titulo=f'Disparo manual — Manutenção #{manutencao.id} ({manutencao.os.titulo})',
            descricao=(
                'Disparo manual pelo usuário (botão "Notificar" em Manutenções) — '
                'sem esperar o cron tentar e falhar primeiro.\n\n'
                + montar_briefing(manutencao)
            ),
            prioridade=PrioridadeNotificacao.ALTA,
            perfil_destino='ADMIN',
            referencia=referencia,
        )
        return Response({'detail': 'Notificação criada.', 'criada': True})


class SistemasParaManutencaoViewSet(viewsets.ReadOnlyModelViewSet):
    """Lista OSs ativas para alimentar o combobox de sistemas na ManutencaoPage."""
    serializer_class = OSParaManutencaoSerializer

    def get_permissions(self):
        return [IsAdmin()]

    def get_queryset(self):
        return OS.objects.select_related('cliente').filter(ativo=True).order_by('titulo')
