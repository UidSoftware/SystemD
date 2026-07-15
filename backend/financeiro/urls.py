from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AporteViewSet, CategoriaViewSet, ConciliacaoViewSet, ContaViewSet,
    DespesaViewSet, FornecedorViewSet,
    LivroCaixaViewSet, PadraoSeguroConciliacaoViewSet, ReceitaViewSet,
    dashboard, dre, fluxo_caixa, receita_por_cliente,
)

router = DefaultRouter()
router.register('categorias',                    CategoriaViewSet,                basename='categorias')
router.register('contas',                        ContaViewSet,                    basename='contas')
router.register('aportes',                       AporteViewSet,                   basename='aportes')
router.register('receitas',                      ReceitaViewSet,                  basename='receitas')
router.register('despesas',                      DespesaViewSet,                  basename='despesas')
router.register('fornecedores',                  FornecedorViewSet,               basename='fornecedores')
router.register('livro-caixa',                   LivroCaixaViewSet,               basename='livro-caixa')
router.register('conciliacoes',                  ConciliacaoViewSet,              basename='conciliacoes')
router.register('padroes-seguros-conciliacao',   PadraoSeguroConciliacaoViewSet,  basename='padroes-seguros-conciliacao')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/',            dashboard,            name='dashboard'),
    path('fluxo-caixa/',         fluxo_caixa,          name='fluxo-caixa'),
    path('dre/',                 dre,                  name='dre'),
    path('receita-por-cliente/', receita_por_cliente,  name='receita-por-cliente'),
]
