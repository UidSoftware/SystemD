from rest_framework import serializers
from .models import ConversaoUnidade, EntradaEstoque, Produto


class ProdutoSerializer(serializers.ModelSerializer):
    tipo_display    = serializers.CharField(source='get_tipo_display', read_only=True)
    unidade_display = serializers.CharField(source='get_unidade_display', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True, default='')

    class Meta:
        model  = Produto
        fields = '__all__'
        read_only_fields = ['id', 'criado_em', 'atualizado_em',
                            'tipo_display', 'unidade_display', 'criado_por_nome',
                            'quantidade_estoque']  # so muda via EntradaEstoque, nunca edicao direta


class ConversaoUnidadeSerializer(serializers.ModelSerializer):
    unidade_display = serializers.CharField(source='get_unidade_display', read_only=True)
    produto_nome    = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model  = ConversaoUnidade
        fields = ['id', 'produto', 'produto_nome', 'unidade', 'unidade_display', 'quantidade_por_base']


class EntradaEstoqueSerializer(serializers.ModelSerializer):
    unidade_display = serializers.CharField(source='get_unidade_display', read_only=True)
    produto_nome    = serializers.CharField(source='produto.nome', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True, default='')

    class Meta:
        model  = EntradaEstoque
        fields = [
            'id', 'produto', 'produto_nome', 'quantidade', 'unidade', 'unidade_display',
            'quantidade_base', 'nota_fiscal', 'observacoes',
            'criado_por', 'criado_por_nome', 'criado_em',
        ]
        read_only_fields = ['id', 'quantidade_base', 'criado_por', 'criado_em']
