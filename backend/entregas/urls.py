from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EntregaViewSet, UnidadeViewSet

router = DefaultRouter()
router.register(r'entregas', EntregaViewSet, basename='entregas')
router.register(r'unidades', UnidadeViewSet, basename='unidade')

urlpatterns = [
    path('', include(router.urls)),
]
