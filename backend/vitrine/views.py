from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Lead
from .serializers import LeadSerializer, LeadGestaoSerializer
from usuarios.permissions import IsAdminOrOperacional


class LeadViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['lido', 'convertido', 'origem']
    search_fields = ['nome', 'email', 'empresa']
    ordering_fields = ['criado_em']
    ordering = ['-criado_em']

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdminOrOperacional()]

    def get_serializer_class(self):
        if self.action == 'create' and not self.request.user.is_authenticated:
            return LeadSerializer
        return LeadGestaoSerializer

    def get_queryset(self):
        qs = Lead.objects.all()
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        if data_inicio:
            qs = qs.filter(criado_em__date__gte=data_inicio)
        if data_fim:
            qs = qs.filter(criado_em__date__lte=data_fim)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            lead = serializer.save()
            return Response(
                {'id': lead.id, 'mensagem': 'Solicitação recebida com sucesso!'},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'erro': 'Leads não podem ser excluídos.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=['post'], url_path='converter')
    def converter(self, request, pk=None):
        from prospectos.serializers import ProspectoSerializer

        lead = self.get_object()
        if lead.convertido:
            return Response({'erro': 'Lead já foi convertido em Prospecto'}, status=status.HTTP_400_BAD_REQUEST)

        dados = {
            'lead': lead.id,
            'nome_empresa': request.data.get('nome_empresa', lead.empresa or ''),
            'nome_contato': request.data.get('nome_contato', lead.nome),
            'email': request.data.get('email', lead.email),
            'telefone': request.data.get('telefone', lead.telefone or ''),
            'whatsapp': request.data.get('whatsapp', ''),
            'segmento': request.data.get('segmento', ''),
            'cidade': request.data.get('cidade', ''),
            'estado': request.data.get('estado', ''),
            'cnpj_cpf': request.data.get('cnpj_cpf', ''),
            'origem': request.data.get('origem', lead.origem or ''),
            'observacoes': request.data.get('observacoes', lead.observacoes_internas or ''),
            'responsavel': request.data.get('responsavel'),
        }

        serializer = ProspectoSerializer(data=dados)
        if serializer.is_valid():
            prospecto = serializer.save()
            lead.convertido = True
            lead.lido = True
            lead.save()
            return Response(ProspectoSerializer(prospecto).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
