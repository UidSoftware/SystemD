from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import UsuarioTokenSerializer


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
