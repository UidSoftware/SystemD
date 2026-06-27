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
    search_fields = ['nome_empresa', 'cidade', 'socios__nome', 'socios__email']
    ordering_fields = ['criado_em', 'nome_empresa']
    ordering = ['-criado_em']

    def get_permissions(self):
        if self.action in ['destroy', 'converter']:
            return [IsAdmin()]
        return [IsAdminOrOperacional()]

    def get_queryset(self):
        return Prospecto.objects.filter(ativo=True).select_related('responsavel', 'lead').prefetch_related('socios')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='converter')
    def converter(self, request, pk=None):
        from clientes.models import Cliente, SocioCliente
        from clientes.serializers import ClienteSerializer

        prospecto = self.get_object()
        if prospecto.convertido:
            return Response({'erro': 'Prospecto já foi convertido em Cliente'}, status=status.HTTP_400_BAD_REQUEST)

        dados_cliente = {
            'nome_empresa': request.data.get('nome_empresa', prospecto.nome_empresa),
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
            # Copia sócios do prospecto para o cliente
            socios_novos = request.data.get('socios', None)
            if socios_novos is not None:
                for s in socios_novos:
                    SocioCliente.objects.create(
                        cliente=cliente,
                        nome=s.get('nome', ''),
                        email=s.get('email', ''),
                        telefone=s.get('telefone', ''),
                        whatsapp=s.get('whatsapp', ''),
                        cpf=s.get('cpf', ''),
                        principal=s.get('principal', False),
                    )
            else:
                for s in prospecto.socios.all():
                    SocioCliente.objects.create(
                        cliente=cliente,
                        nome=s.nome, email=s.email,
                        telefone=s.telefone, whatsapp=s.whatsapp,
                        cpf=s.cpf, principal=s.principal,
                    )
            prospecto.convertido = True
            prospecto.convertido_em = timezone.now()
            prospecto.save()
            return Response(ClienteSerializer(cliente).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
