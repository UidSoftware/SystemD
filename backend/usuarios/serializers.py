from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class UsuarioTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['nome'] = user.nome
        return token
