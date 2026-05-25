from rest_framework import mixins
from rest_framework.viewsets import GenericViewSet


class AuditMixin:
    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save(update_fields=['ativo'])


class ReadCreateViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,
):
    pass
