from rest_framework import serializers
from .models import Cliente, SocioCliente


class SocioClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocioCliente
        fields = ['id', 'nome', 'email', 'telefone', 'whatsapp', 'cpf', 'principal']


class ClienteSerializer(serializers.ModelSerializer):
    socios = SocioClienteSerializer(many=True, required=False)
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)
    email_ativo   = serializers.SerializerMethodField()
    socio_principal_nome = serializers.SerializerMethodField()

    def get_email_ativo(self, obj):
        return (
            obj.usuario is not None
            and hasattr(obj.usuario, 'email_config')
            and obj.usuario.email_config.ativo
        )

    def get_socio_principal_nome(self, obj):
        s = obj.socios.filter(principal=True).first() or obj.socios.first()
        return s.nome if s else ''

    def create(self, validated_data):
        socios_data = validated_data.pop('socios', [])
        cliente = super().create(validated_data)
        for s in socios_data:
            SocioCliente.objects.create(cliente=cliente, **s)
        return cliente

    def update(self, instance, validated_data):
        socios_data = validated_data.pop('socios', None)
        instance = super().update(instance, validated_data)
        if socios_data is not None:
            instance.socios.all().delete()
            for s in socios_data:
                SocioCliente.objects.create(cliente=instance, **s)
        return instance

    class Meta:
        model = Cliente
        fields = '__all__'
        read_only_fields = ('id', 'criado_em', 'atualizado_em', 'usuario_email',
                            'email_ativo', 'socio_principal_nome')
