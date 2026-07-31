from rest_framework import mixins
from rest_framework.viewsets import GenericViewSet


class AuditMixin:
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])


class ReadCreateViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,
):
    pass
