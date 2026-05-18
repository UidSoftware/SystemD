from rest_framework import serializers
from .models import Unidade, Entrega


class UnidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unidade
        fields = ['id', 'nome', 'ativo', 'criado_em']
        read_only_fields = ['criado_em']


class EntregaSerializer(serializers.ModelSerializer):
    empresa_nome        = serializers.CharField(source='empresa.nome_empresa', read_only=True)
    registrado_por_nome = serializers.CharField(source='registrado_por.nome', read_only=True)
    confirmado_por_nome = serializers.CharField(source='confirmado_por.nome', read_only=True, default=None)
    status_display      = serializers.CharField(source='get_status_display', read_only=True)
    confirmacao_display = serializers.CharField(source='get_confirmacao_display', read_only=True)
    unidade_nome        = serializers.CharField(source='unidade.nome', read_only=True)
    de_nome             = serializers.CharField(source='de.nome', read_only=True)
    para_nome           = serializers.CharField(source='para.nome', read_only=True)

    class Meta:
        model = Entrega
        fields = '__all__'
        read_only_fields = (
            'id', 'criado_em', 'atualizado_em',
            'empresa_nome', 'registrado_por', 'registrado_por_nome',
            'confirmado_por', 'confirmado_por_nome', 'confirmado_em',
            'status_display', 'confirmacao_display',
            'unidade_nome', 'de_nome', 'para_nome',
        )
