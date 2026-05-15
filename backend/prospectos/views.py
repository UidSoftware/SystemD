from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Prospecto
from .serializers import ProspectoSerializer
from usuarios.permissions import IsAdmin, IsAdminOrOperacional


class ProspectoViewSet(viewsets.ModelViewSet):
    serializer_class = ProspectoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['convertido', 'ativo', 'segmento', 'responsavel']
    search_fields = ['nome_empresa', 'nome_contato', 'email', 'cidade']
    ordering_fields = ['criado_em', 'nome_empresa']
    ordering = ['-criado_em']

    def get_permissions(self):
        if self.action in ['destroy', 'converter']:
            return [IsAdmin()]
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        return Prospecto.objects.filter(ativo=True).select_related('responsavel', 'lead')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='converter')
    def converter(self, request, pk=None):
        from clientes.models import Cliente
        from clientes.serializers import ClienteSerializer

        prospecto = self.get_object()
        if prospecto.convertido:
            return Response({'erro': 'Prospecto já foi convertido em Cliente'}, status=status.HTTP_400_BAD_REQUEST)

        dados_cliente = {
            'nome_empresa': request.data.get('nome_empresa', prospecto.nome_empresa),
            'nome_contato': request.data.get('nome_contato', prospecto.nome_contato),
            'email': request.data.get('email', prospecto.email),
            'telefone': request.data.get('telefone', prospecto.telefone or ''),
            'whatsapp': request.data.get('whatsapp', prospecto.whatsapp or ''),
            'segmento': request.data.get('segmento', prospecto.segmento or ''),
            'cidade': request.data.get('cidade', prospecto.cidade or ''),
            'estado': request.data.get('estado', prospecto.estado or ''),
            'cnpj_cpf': request.data.get('cnpj_cpf', prospecto.cnpj_cpf or ''),
            'origem': request.data.get('origem', prospecto.origem or ''),
            'observacoes': request.data.get('observacoes', prospecto.observacoes or ''),
        }

        serializer = ClienteSerializer(data=dados_cliente)
        if serializer.is_valid():
            cliente = serializer.save()
            prospecto.convertido = True
            prospecto.convertido_em = timezone.now()
            prospecto.save()
            return Response(ClienteSerializer(cliente).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
