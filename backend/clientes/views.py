from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Cliente
from .serializers import ClienteSerializer
from usuarios.permissions import IsAdmin, IsAdminOrOperacional


class ClienteViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    permission_classes = [IsAdminOrOperacional]

    def get_queryset(self):
        return Cliente.objects.filter(ativo=True)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='enviar-acesso', permission_classes=[IsAdmin])
    def enviar_acesso(self, request, pk=None):
        """
        Cria usuário CLIENTE vinculado (se ainda não existe) e envia email de primeiro acesso.
        """
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        from django.conf import settings
        from email_client.services import enviar_email_sistema
        from usuarios.models import Usuario

        cliente = self.get_object()

        # Cria usuário se ainda não estiver vinculado
        if cliente.usuario is None:
            if Usuario.objects.filter(email=cliente.email).exists():
                usuario = Usuario.objects.get(email=cliente.email)
                if usuario.perfil != 'CLIENTE':
                    return Response(
                        {'erro': f'Já existe um usuário com o email {cliente.email} mas com perfil {usuario.perfil}.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                usuario = Usuario.objects.create_user(
                    email=cliente.email,
                    nome=cliente.nome_contato,
                    password=None,
                    perfil='CLIENTE',
                )
            cliente.usuario = usuario
            cliente.save()
        else:
            usuario = cliente.usuario

        # Gera token e envia email
        uid = urlsafe_base64_encode(force_bytes(usuario.pk))
        token = default_token_generator.make_token(usuario)
        link = f"{settings.FRONTEND_URL}/definir-senha/?uid={uid}&token={token}"

        corpo_html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0014;color:#f1f5f9;border-radius:12px;">
          <h2 style="color:#063BF8;margin-bottom:8px;">uid<span style="color:#f1f5f9">.</span>sistema</h2>
          <p style="margin-bottom:24px;color:#a78bca;">Acesso ao sistema</p>
          <p>Olá, <strong>{usuario.nome}</strong>!</p>
          <p>Você recebeu acesso ao sistema da <strong>Uid Software</strong>.<br>
          Clique no botão abaixo para definir sua senha e começar a usar.</p>
          <a href="{link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#063BF8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
            Definir minha senha
          </a>
          <p style="font-size:12px;color:#6b6b8a;">
            Link válido por 24 horas. Se não solicitou, ignore este email.<br><br>
            <a href="{link}" style="color:#6b6b8a;word-break:break-all;">{link}</a>
          </p>
        </div>
        """

        try:
            enviar_email_sistema(usuario.email, 'Acesso ao uid.sistema — defina sua senha', corpo_html)
        except Exception as e:
            return Response({'erro': f'Erro ao enviar email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'mensagem': f'Email de acesso enviado para {usuario.email}.',
            'usuario_criado': cliente.usuario_id == usuario.pk,
        })
