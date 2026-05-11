from rest_framework import serializers
from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)
    email_ativo   = serializers.SerializerMethodField()

    def get_email_ativo(self, obj):
        return (
            obj.usuario is not None
            and hasattr(obj.usuario, 'email_config')
            and obj.usuario.email_config.ativo
        )

    class Meta:
        model = Cliente
        fields = '__all__'
        read_only_fields = ('id', 'criado_em', 'atualizado_em', 'usuario_email', 'email_ativo')
