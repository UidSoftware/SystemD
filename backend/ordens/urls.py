from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    OSViewSet, ContratoViewSet, ChamadoViewSet, MensagemChamadoViewSet,
    ChamadoGlobalViewSet, MensagemGlobalViewSet, EntrevistaViewSet,
    ArquiteturaTecnicaViewSet, ManutencaoViewSet, SistemasParaManutencaoViewSet,
)

router = DefaultRouter()
router.register('os', OSViewSet, basename='os')
router.register('chamados', ChamadoGlobalViewSet, basename='chamado')
router.register('entrevistas', EntrevistaViewSet, basename='entrevista')
router.register('arquitetura-tecnica', ArquiteturaTecnicaViewSet, basename='arquitetura-tecnica')
router.register('manutencoes', ManutencaoViewSet, basename='manutencao')
router.register('sistemas-manutencao', SistemasParaManutencaoViewSet, basename='sistemas-manutencao')

urlpatterns = router.urls + [
    # Contrato aninhado na OS
    path('os/<int:os_pk>/contrato/', ContratoViewSet.as_view({'get': 'list', 'post': 'create'}), name='os-contrato-list'),
    path('os/<int:os_pk>/contrato/<int:pk>/', ContratoViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update'}), name='os-contrato-detail'),
    # Chamados aninhados na OS
    path('os/<int:os_pk>/chamados/', ChamadoViewSet.as_view({'get': 'list', 'post': 'create'}), name='os-chamado-list'),
    path('os/<int:os_pk>/chamados/<int:pk>/', ChamadoViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='os-chamado-detail'),
    # Mensagens de chamado
    path('chamados/<int:chamado_pk>/mensagens/', MensagemGlobalViewSet.as_view({'get': 'list', 'post': 'create'}), name='chamado-mensagem-list'),
]
