from rest_framework import viewsets, filters, status
from rest_framework.response import Response

from .models import Nicho
from .serializers import NichoSerializer
from usuarios.permissions import IsAdminOrOperacional


class NichoViewSet(viewsets.ModelViewSet):
    serializer_class = NichoSerializer
    permission_classes = [IsAdminOrOperacional]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome']
    ordering = ['nome']

    def get_queryset(self):
        return Nicho.objects.filter(ativo=True)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
