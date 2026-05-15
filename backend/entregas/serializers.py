from rest_framework import serializers
from .models import Entrega


class EntregaSerializer(serializers.ModelSerializer):
    empresa_nome = serializers.CharField(source='empresa.nome_empresa', read_only=True)
    registrado_por_nome = serializers.CharField(source='registrado_por.nome', read_only=True)
    confirmado_por_nome = serializers.CharField(source='confirmado_por.nome', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    confirmacao_display = serializers.CharField(source='get_confirmacao_display', read_only=True)

    class Meta:
        model = Entrega
        fields = '__all__'
        read_only_fields = (
            'id', 'criado_em', 'atualizado_em',
            'empresa_nome', 'registrado_por_nome', 'confirmado_por_nome',
            'status_display', 'confirmacao_display',
            'registrado_por', 'confirmado_por', 'confirmado_em',
        )
