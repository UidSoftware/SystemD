from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, TokenRefreshCookieView, LogoutView, MeView,
    UsuarioViewSet, SetorViewSet,
    AlterarSenhaView, SolicitarAcessoView, DefinirSenhaView,
)

router = DefaultRouter()
router.register('usuarios', UsuarioViewSet, basename='usuario')
router.register('setores', SetorViewSet, basename='setor')

urlpatterns = [
    path('token/', LoginView.as_view(), name='token_obtain'),
    path('token/refresh/', TokenRefreshCookieView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('alterar-senha/', AlterarSenhaView.as_view(), name='alterar_senha'),
    path('solicitar-acesso/', SolicitarAcessoView.as_view(), name='solicitar_acesso'),
    path('definir-senha/', DefinirSenhaView.as_view(), name='definir_senha'),
    path('', include(router.urls)),
]
