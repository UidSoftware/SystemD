from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginView, TokenRefreshCookieView, LogoutView, MeView, UsuarioViewSet, SetorViewSet

router = DefaultRouter()
router.register('usuarios', UsuarioViewSet, basename='usuario')
router.register('setores', SetorViewSet, basename='setor')

urlpatterns = [
    path('token/', LoginView.as_view(), name='token_obtain'),
    path('token/refresh/', TokenRefreshCookieView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('', include(router.urls)),
]
