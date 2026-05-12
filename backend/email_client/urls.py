from django.urls import path
from .views import (
    InboxView, EmailDetailView, EnviarEmailView, ResponderEmailView,
    DeletarEmailView, PastasView, DownloadAnexoView, ArquivarEmailView,
)

urlpatterns = [
    path('inbox/',                   InboxView.as_view(),          name='email-inbox'),
    path('enviar/',                  EnviarEmailView.as_view(),     name='email-enviar'),
    path('pastas/',                  PastasView.as_view(),          name='email-pastas'),
    path('<int:uid>/',               EmailDetailView.as_view(),     name='email-detalhe'),
    path('<int:uid>/responder/',     ResponderEmailView.as_view(),  name='email-responder'),
    path('<int:uid>/deletar/',       DeletarEmailView.as_view(),    name='email-deletar'),
    path('<int:uid>/anexo/',         DownloadAnexoView.as_view(),   name='email-anexo'),
    path('<int:uid>/arquivar/',      ArquivarEmailView.as_view(),   name='email-arquivar'),
]
