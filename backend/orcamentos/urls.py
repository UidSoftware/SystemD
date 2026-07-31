from rest_framework.routers import DefaultRouter
from .views import OrcamentoViewSet, PedidoViewSet

router = DefaultRouter()
router.register('orcamentos', OrcamentoViewSet, basename='orcamentos')
router.register('pedidos', PedidoViewSet, basename='pedidos')
urlpatterns = router.urls
