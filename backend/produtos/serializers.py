from rest_framework import serializers
from .models import Combo, ConversaoUnidade, EntradaEstoque, ItemCombo, Produto


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


class ItemComboSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    subtotal     = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = ItemCombo
        fields = ['id', 'produto', 'produto_nome', 'quantidade', 'valor_unitario', 'subtotal']


class ComboSerializer(serializers.ModelSerializer):
    id              = serializers.IntegerField(source='pk', read_only=True)
    itens           = ItemComboSerializer(many=True)
    valor_total     = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True, default='')

    class Meta:
        model  = Combo
        fields = ['id', 'nome', 'descricao', 'itens', 'valor_total', 'ativo',
                  'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em']
        read_only_fields = ['id', 'ativo', 'criado_por', 'criado_em', 'atualizado_em']

    def validate_itens(self, value):
        if not value:
            raise serializers.ValidationError('O combo precisa ter pelo menos 1 item.')  # RN01
        for item in value:
            if item.get('quantidade', 0) <= 0:
                raise serializers.ValidationError('Quantidade de cada item deve ser maior que zero.')  # RN02
        return value

    def create(self, validated_data):
        itens_data = validated_data.pop('itens')
        combo = Combo.objects.create(**validated_data)
        for item in itens_data:
            ItemCombo.objects.create(combo=combo, **item)
        return combo

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)
        instance.nome      = validated_data.get('nome', instance.nome)
        instance.descricao = validated_data.get('descricao', instance.descricao)
        instance.save()
        if itens_data is not None:
            instance.itens.all().delete()
            for item in itens_data:
                ItemCombo.objects.create(combo=instance, **item)
        return instance
