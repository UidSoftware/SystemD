from rest_framework.routers import DefaultRouter
from .views import ComboViewSet, ConversaoUnidadeViewSet, EntradaEstoqueViewSet, ProdutoViewSet

router = DefaultRouter()
router.register('produtos', ProdutoViewSet, basename='produto')
router.register('combos', ComboViewSet, basename='combo')
router.register('conversoes-unidade', ConversaoUnidadeViewSet, basename='conversao-unidade')
router.register('entradas-estoque', EntradaEstoqueViewSet, basename='entrada-estoque')

urlpatterns = router.urls
