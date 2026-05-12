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
