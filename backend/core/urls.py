from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('vitrine.urls')),
    path('api/auth/', include('usuarios.urls')),
    path('api/', include('clientes.urls')),
    path('api/email/', include('email_client.urls')),
    path('api/', include('ordens.urls')),
]
