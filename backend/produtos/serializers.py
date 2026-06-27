from rest_framework import serializers
from .models import Produto


class ProdutoSerializer(serializers.ModelSerializer):
    tipo_display    = serializers.CharField(source='get_tipo_display', read_only=True)
    unidade_display = serializers.CharField(source='get_unidade_display', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True, default='')

    class Meta:
        model  = Produto
        fields = '__all__'
        read_only_fields = ['id', 'criado_em', 'atualizado_em',
                            'tipo_display', 'unidade_display', 'criado_por_nome']
