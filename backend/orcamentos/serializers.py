from rest_framework import serializers
from .models import ItemOrcamento, ItemPedido, Orcamento, Pedido


class ItemOrcamentoSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ItemOrcamento
        fields = ['id', 'produto', 'ordem', 'descricao', 'unidade', 'quantidade', 'valor_unitario', 'subtotal']


class OrcamentoSerializer(serializers.ModelSerializer):
    itens              = ItemOrcamentoSerializer(many=True, required=False)
    subtotal           = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_geral        = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    cliente_nome       = serializers.CharField(source='cliente.nome_empresa', read_only=True, default='')
    prospecto_nome     = serializers.CharField(source='prospecto.nome_empresa', read_only=True, default='')
    criado_por_nome    = serializers.CharField(source='criado_por.nome', read_only=True)
    contratid_synced   = serializers.SerializerMethodField()

    def get_contratid_synced(self, obj):
        return obj.contratid_orcamento_id is not None

    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])
        orcamento = Orcamento.objects.create(**validated_data)
        for item in itens_data:
            ItemOrcamento.objects.create(orcamento=orcamento, **item)
        return orcamento

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if itens_data is not None:
            instance.itens.all().delete()
            for item in itens_data:
                ItemOrcamento.objects.create(orcamento=instance, **item)
        return instance

    class Meta:
        model = Orcamento
        fields = '__all__'
        read_only_fields = [
            'id', 'numero', 'criado_em', 'atualizado_em',
            'subtotal', 'total_geral', 'cliente_nome', 'prospecto_nome',
            'criado_por', 'criado_por_nome', 'contratid_synced', 'contratid_orcamento_id',
            'contratid_synced_at',
        ]


class ItemPedidoSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ItemPedido
        fields = ['id', 'produto', 'ordem', 'descricao', 'unidade', 'quantidade', 'valor_unitario', 'subtotal']


class PedidoSerializer(serializers.ModelSerializer):
    itens           = ItemPedidoSerializer(many=True, required=False)
    subtotal        = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    cliente_nome    = serializers.CharField(source='cliente.nome_empresa', read_only=True, default='')
    orcamento_numero = serializers.IntegerField(source='orcamento.numero', read_only=True, default=None)
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True)

    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])
        pedido = Pedido.objects.create(**validated_data)
        for item in itens_data:
            ItemPedido.objects.create(pedido=pedido, **item)
        return pedido

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if itens_data is not None:
            instance.itens.all().delete()
            for item in itens_data:
                ItemPedido.objects.create(pedido=instance, **item)
        return instance

    class Meta:
        model = Pedido
        fields = '__all__'
        read_only_fields = [
            'id', 'numero', 'criado_em', 'atualizado_em',
            'subtotal', 'cliente_nome', 'orcamento_numero',
            'criado_por', 'criado_por_nome',
        ]
