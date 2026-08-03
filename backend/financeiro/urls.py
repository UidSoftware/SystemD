from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AporteViewSet, CategoriaViewSet, ConciliacaoViewSet, ContaViewSet,
    DespesaViewSet, FornecedorViewSet,
    LivroCaixaViewSet, PadraoSeguroConciliacaoViewSet, ReceitaViewSet, SubCategoriaViewSet,
    balanco_patrimonial, balanco_patrimonial_pdf, dashboard, dre, dre_pdf,
    fluxo_caixa, fluxo_caixa_pdf, fluxo_projetado,
    indicadores_cfo, indicadores_cfo_pdf, receita_por_cliente, receita_por_cliente_pdf,
)

router = DefaultRouter()
router.register('categorias',                    CategoriaViewSet,                basename='categorias')
router.register('subcategorias',                 SubCategoriaViewSet,             basename='subcategorias')
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
    path('fluxo-caixa/pdf/',     fluxo_caixa_pdf,      name='fluxo-caixa-pdf'),
    path('dre/',                 dre,                  name='dre'),
    path('dre/pdf/',             dre_pdf,              name='dre-pdf'),
    path('receita-por-cliente/', receita_por_cliente,  name='receita-por-cliente'),
    path('receita-por-cliente/pdf/', receita_por_cliente_pdf, name='receita-por-cliente-pdf'),
    path('balanco/',             balanco_patrimonial,  name='balanco-patrimonial'),
    path('balanco/pdf/',         balanco_patrimonial_pdf, name='balanco-patrimonial-pdf'),
    path('fluxo-projetado/',     fluxo_projetado,      name='fluxo-projetado'),
    path('indicadores/',         indicadores_cfo,      name='indicadores-cfo'),
    path('indicadores/pdf/',     indicadores_cfo_pdf,  name='indicadores-cfo-pdf'),
]
