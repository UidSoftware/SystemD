from rest_framework import serializers
from .models import Prospecto


class ProspectoSerializer(serializers.ModelSerializer):
    responsavel_nome = serializers.CharField(source='responsavel.nome', read_only=True)
    lead_nome = serializers.CharField(source='lead.nome', read_only=True)

    class Meta:
        model = Prospecto
        fields = '__all__'
        read_only_fields = ('id', 'criado_em', 'atualizado_em', 'responsavel_nome', 'lead_nome')
