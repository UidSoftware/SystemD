from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Cliente
from .serializers import ClienteSerializer
from usuarios.permissions import IsAdminOrOperacional


class ClienteViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    permission_classes = [IsAdminOrOperacional]

    def get_queryset(self):
        return Cliente.objects.filter(ativo=True)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
