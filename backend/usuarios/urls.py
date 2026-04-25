from django.urls import path
from .views import LoginView, TokenRefreshCookieView, LogoutView

urlpatterns = [
    path('token/', LoginView.as_view(), name='token_obtain'),
    path('token/refresh/', TokenRefreshCookieView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
]
