from rest_framework import serializers
from .models import Prospecto, SocioProspecto


class SocioProspectoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocioProspecto
        fields = ['id', 'nome', 'email', 'telefone', 'whatsapp', 'cpf', 'principal']


class ProspectoSerializer(serializers.ModelSerializer):
    socios = SocioProspectoSerializer(many=True, required=False)
    responsavel_nome = serializers.CharField(source='responsavel.nome', read_only=True)
    lead_nome = serializers.CharField(source='lead.nome', read_only=True)
    lead_mensagem = serializers.CharField(source='lead.mensagem', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome_empresa', read_only=True, default='')
    socio_principal_nome = serializers.SerializerMethodField()

    def get_socio_principal_nome(self, obj):
        s = obj.socios.filter(principal=True).first() or obj.socios.first()
        return s.nome if s else ''

    def create(self, validated_data):
        socios_data = validated_data.pop('socios', [])
        prospecto = super().create(validated_data)
        for s in socios_data:
            SocioProspecto.objects.create(prospecto=prospecto, **s)
        return prospecto

    def update(self, instance, validated_data):
        socios_data = validated_data.pop('socios', None)
        instance = super().update(instance, validated_data)
        if socios_data is not None:
            instance.socios.all().delete()
            for s in socios_data:
                SocioProspecto.objects.create(prospecto=instance, **s)
        return instance

    class Meta:
        model = Prospecto
        fields = '__all__'
        read_only_fields = ('id', 'criado_em', 'atualizado_em', 'responsavel_nome',
                            'lead_nome', 'lead_mensagem', 'cliente_nome', 'socio_principal_nome')
