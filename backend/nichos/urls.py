from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NichoViewSet

router = DefaultRouter()
router.register(r'nichos', NichoViewSet, basename='nichos')

urlpatterns = [
    path('', include(router.urls)),
]
