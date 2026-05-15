from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Usuario, Setor
from .serializers import UsuarioTokenSerializer, UsuarioSerializer, SetorSerializer, MeSerializer
from .permissions import IsAdmin


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = UsuarioTokenSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh_token = response.data.pop('refresh')
            resp = Response({'access': response.data['access']})
            resp.set_cookie(
                key='refresh_token',
                value=refresh_token,
                httponly=True,
                secure=True,
                samesite='Lax',
                max_age=7 * 24 * 60 * 60,
            )
            return resp
        return response


class TokenRefreshCookieView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({'error': 'Não autenticado'}, status=401)
        try:
            token = RefreshToken(refresh_token)
            return Response({'access': str(token.access_token)})
        except Exception:
            return Response({'error': 'Token inválido ou expirado'}, status=401)


class LogoutView(APIView):
    def post(self, request):
        resp = Response({'mensagem': 'Logout realizado com sucesso'})
        resp.delete_cookie('refresh_token')
        return resp


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class UsuarioViewSet(ModelViewSet):
    serializer_class = UsuarioSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Usuario.objects.select_related('setor', 'email_config').order_by('nome')
        busca = self.request.query_params.get('busca')
        perfil = self.request.query_params.get('perfil')
        setor = self.request.query_params.get('setor')
        if busca:
            qs = qs.filter(nome__icontains=busca) | qs.filter(email__icontains=busca)
        if perfil:
            qs = qs.filter(perfil=perfil)
        if setor:
            qs = qs.filter(setor_id=setor)
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AlterarSenhaView(APIView):
    """Usuário logado troca a própria senha."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        senha_atual = request.data.get('senha_atual', '')
        senha_nova = request.data.get('senha_nova', '')

        if not senha_atual or not senha_nova:
            return Response({'erro': 'Preencha todos os campos.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(senha_nova) < 6:
            return Response({'erro': 'A nova senha deve ter pelo menos 6 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.check_password(senha_atual):
            return Response({'erro': 'Senha atual incorreta.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(senha_nova)
        request.user.save()
        return Response({'mensagem': 'Senha alterada com sucesso.'})


class SolicitarAcessoView(APIView):
    """ADMIN envia email de primeiro acesso para um usuário."""
    permission_classes = [IsAdmin]

    def post(self, request):
        from email_client.services import enviar_email_sistema

        usuario_id = request.data.get('usuario_id')
        try:
            usuario = Usuario.objects.get(pk=usuario_id, ativo=True)
        except Usuario.DoesNotExist:
            return Response({'erro': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

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

        return Response({'mensagem': f'Email de acesso enviado para {usuario.email}.'})


class DefinirSenhaView(APIView):
    """Valida token e define senha — sem autenticação."""
    permission_classes = [AllowAny]

    def post(self, request):
        uid_b64 = request.data.get('uid', '')
        token = request.data.get('token', '')
        senha = request.data.get('senha', '')

        if not uid_b64 or not token or not senha:
            return Response({'erro': 'Dados incompletos.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(senha) < 6:
            return Response({'erro': 'A senha deve ter pelo menos 6 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            usuario = Usuario.objects.get(pk=uid)
        except (ValueError, Usuario.DoesNotExist):
            return Response({'erro': 'Link inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(usuario, token):
            return Response(
                {'erro': 'Link expirado ou inválido. Solicite um novo email de acesso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario.set_password(senha)
        usuario.save()
        return Response({'mensagem': 'Senha definida com sucesso. Você já pode fazer login.'})


class SetorViewSet(ModelViewSet):
    serializer_class = SetorSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return Setor.objects.all().order_by('nome')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        usuarios_ativos = instance.usuarios.filter(ativo=True).count()
        if usuarios_ativos > 0:
            return Response(
                {'erro': f'Não é possível desativar: {usuarios_ativos} usuário(s) ativo(s) vinculado(s) a este setor.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.ativo = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
