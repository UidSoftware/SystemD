from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Usuario, Setor, Perfil


class UsuarioTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['nome'] = user.nome
        token['perfil'] = user.perfil
        return token


class SetorSerializer(serializers.ModelSerializer):
    num_usuarios = serializers.SerializerMethodField()

    class Meta:
        model = Setor
        fields = ['id', 'nome', 'descricao', 'ativo', 'criado_em', 'num_usuarios']
        read_only_fields = ['criado_em']

    def get_num_usuarios(self, obj):
        return obj.usuarios.filter(ativo=True).count()


class SetorResumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Setor
        fields = ['id', 'nome']


class UsuarioSerializer(serializers.ModelSerializer):
    setor = SetorResumoSerializer(read_only=True)
    setor_id = serializers.PrimaryKeyRelatedField(
        queryset=Setor.objects.filter(ativo=True),
        source='setor',
        write_only=True,
        required=False,
        allow_null=True,
    )
    email_corporativo = serializers.SerializerMethodField()
    senha = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Usuario
        fields = [
            'id', 'nome', 'email', 'perfil', 'setor', 'setor_id',
            'email_corporativo', 'ativo', 'criado_em', 'senha',
        ]
        read_only_fields = ['criado_em']

    def get_email_corporativo(self, obj):
        config = getattr(obj, 'email_config', None)
        return config.email_conta if config and config.ativo else None

    def create(self, validated_data):
        senha = validated_data.pop('senha', None)
        usuario = Usuario(**validated_data)
        if senha:
            usuario.set_password(senha)
        usuario.save()
        return usuario

    def update(self, instance, validated_data):
        senha = validated_data.pop('senha', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if senha:
            instance.set_password(senha)
        instance.save()
        return instance


class MeSerializer(serializers.ModelSerializer):
    setor = SetorResumoSerializer(read_only=True)
    email_corporativo = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'nome', 'email', 'perfil', 'setor', 'email_corporativo']

    def get_email_corporativo(self, obj):
        config = getattr(obj, 'email_config', None)
        return config.email_conta if config and config.ativo else None
