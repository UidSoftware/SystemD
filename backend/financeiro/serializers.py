from decimal import Decimal

from rest_framework import serializers

from .models import AcionistaFornecedor, Aporte, Categoria, ConciliacaoExtrato, Conta, Despesa, FormaPagamento, Fornecedor, ItemConciliacao, LivroCaixa, PadraoSeguroConciliacao, Receita, SubCategoria


class CategoriaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = Categoria
        fields = ['id', 'nome', 'tipo', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class SubCategoriaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)

    class Meta:
        model = SubCategoria
        fields = ['id', 'categoria', 'categoria_nome', 'nome', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class ContaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = Conta
        fields = [
            'id', 'nome', 'tipo', 'banco', 'agencia', 'numero',
            'saldo_inicial', 'is_active', 'created_at',
        ]
        read_only_fields = ['created_at']


class AporteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    conta_nome = serializers.CharField(source='conta.nome', read_only=True)

    class Meta:
        model = Aporte
        fields = [
            'id', 'tipo', 'descricao', 'valor', 'conta', 'conta_nome',
            'data', 'responsavel', 'observacoes', 'is_active', 'created_at',
        ]
        read_only_fields = ['created_at']


class ReceitaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    cliente_nome   = serializers.CharField(source='cliente.nome_empresa', read_only=True)
    os_titulo      = serializers.CharField(source='os.titulo', read_only=True)
    conta_nome     = serializers.CharField(source='conta.nome', read_only=True)
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    subcategoria_nome = serializers.CharField(source='subcategoria.nome', read_only=True)

    class Meta:
        model = Receita
        fields = [
            'id', 'tipo', 'descricao',
            'cliente', 'cliente_nome', 'os', 'os_titulo',
            'categoria', 'categoria_nome', 'subcategoria', 'subcategoria_nome',
            'valor_bruto', 'desconto', 'valor_liquido',
            'conta', 'conta_nome',
            'vencimento', 'recebimento', 'status',
            'referencia_mes', 'observacoes', 'is_active', 'created_at',
        ]
        read_only_fields = ['valor_liquido', 'created_at']

    def validate(self, data):
        bruto    = data.get('valor_bruto', getattr(self.instance, 'valor_bruto', Decimal('0')))
        desconto = data.get('desconto', getattr(self.instance, 'desconto', Decimal('0')))
        if desconto > bruto:
            raise serializers.ValidationError({'desconto': 'Desconto não pode ser maior que o valor bruto.'})
        return data


class DespesaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    conta_nome     = serializers.CharField(source='conta.nome', read_only=True)
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    subcategoria_nome = serializers.CharField(source='subcategoria.nome', read_only=True)

    class Meta:
        model = Despesa
        fields = [
            'id', 'tipo', 'descricao', 'fornecedor',
            'valor_bruto', 'desconto', 'valor_liquido',
            'conta', 'conta_nome',
            'categoria', 'categoria_nome', 'subcategoria', 'subcategoria_nome',
            'vencimento', 'pagamento', 'forma_pagamento', 'status',
            'referencia_mes', 'recorrencia_suspeita', 'comprovante', 'observacoes',
            'recorrente', 'frequencia', 'quantidade',
            'estornado', 'data_estorno', 'motivo_estorno',
            'is_active', 'created_at',
        ]
        read_only_fields = ['valor_liquido', 'estornado', 'data_estorno', 'motivo_estorno', 'created_at']

    def validate(self, data):
        bruto    = data.get('valor_bruto', getattr(self.instance, 'valor_bruto', Decimal('0')))
        desconto = data.get('desconto', getattr(self.instance, 'desconto', Decimal('0')))
        if desconto > bruto:
            raise serializers.ValidationError({'desconto': 'Desconto não pode ser maior que o valor bruto.'})
        return data


class AcionistaFornecedorSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)

    class Meta:
        model = AcionistaFornecedor
        fields = ['id', 'nome', 'email', 'telefone', 'whatsapp', 'cpf', 'principal']


class FornecedorSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    acionistas = AcionistaFornecedorSerializer(many=True, required=False)

    class Meta:
        model = Fornecedor
        fields = [
            'id', 'forn_nome', 'forn_cnpj', 'forn_email',
            'forn_telefone', 'forn_observacoes', 'forn_ativo',
            'tipo_pessoa', 'documento', 'cpf', 'cnpj', 'acionistas',
            'is_active', 'created_at',
        ]
        read_only_fields = ['created_at']

    def validate_forn_cnpj(self, value):
        # Regra CLAUDE.md: unique+null+blank -> '' viola constraint; converter para None
        if value == '':
            return None
        return value

    def validate_documento(self, value):
        # Mesma regra: unique+null+blank -> '' viola constraint; converter para None
        if value == '':
            return None
        return value

    def create(self, validated_data):
        acionistas_data = validated_data.pop('acionistas', [])
        fornecedor = super().create(validated_data)
        for a in acionistas_data:
            AcionistaFornecedor.objects.create(fornecedor=fornecedor, **a)
        return fornecedor

    def update(self, instance, validated_data):
        acionistas_data = validated_data.pop('acionistas', None)
        instance = super().update(instance, validated_data)
        if acionistas_data is not None:
            instance.acionistas.all().delete()
            for a in acionistas_data:
                AcionistaFornecedor.objects.create(fornecedor=instance, **a)
        return instance


class LivroCaixaSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    conta_nome   = serializers.CharField(source='conta.nome', read_only=True)
    tipo_label   = serializers.CharField(source='get_tipo_display', read_only=True)
    origem_label = serializers.CharField(source='get_origem_display', read_only=True)

    class Meta:
        model = LivroCaixa
        fields = [
            'id', 'conta', 'conta_nome',
            'tipo', 'tipo_label', 'origem', 'origem_label', 'origem_id',
            'descricao', 'valor', 'data',
            'saldo_anterior', 'saldo_atual',
            'created_at', 'estornado', 'estorno_de',
        ]
        read_only_fields = [
            'created_at', 'saldo_anterior', 'saldo_atual', 'estornado', 'estorno_de',
        ]


class ItemConciliacaoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    lancamento_lc_data  = serializers.DateField(source='lancamento_lc.data', read_only=True)
    lancamento_lc_desc  = serializers.CharField(source='lancamento_lc.descricao', read_only=True)
    tipo_label          = serializers.SerializerMethodField()
    status_label        = serializers.SerializerMethodField()

    def get_tipo_label(self, obj):
        return 'Entrada' if obj.tipo == 'ENTRADA' else 'Saída'

    def get_status_label(self, obj):
        labels = {
            'CONCILIADO':       'Conciliado',
            'FALTANDO_SISTEMA': 'Faltando no Sistema',
            'FALTANDO_BANCO':   'Faltando no Banco',
        }
        return labels.get(obj.status, obj.status)

    class Meta:
        model = ItemConciliacao
        fields = [
            'id', 'conciliacao', 'data_banco', 'descricao_banco', 'valor', 'tipo', 'tipo_label',
            'status', 'status_label', 'lancamento_lc', 'lancamento_lc_data',
            'lancamento_lc_desc', 'confirmado',
        ]


class ConciliacaoExtratoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    conta_nome    = serializers.CharField(source='conta.nome', read_only=True)
    status_label  = serializers.SerializerMethodField()
    itens         = ItemConciliacaoSerializer(many=True, read_only=True)

    def get_status_label(self, obj):
        labels = {
            'PENDENTE':           'Pendente',
            'PROCESSADO':         'Processado',
            'COM_DIVERGENCIAS':   'Com Divergências',
        }
        return labels.get(obj.status, obj.status)

    class Meta:
        model = ConciliacaoExtrato
        fields = [
            'id', 'conta', 'conta_nome', 'arquivo', 'periodo', 'processado_em',
            'status', 'status_label', 'total_banco', 'total_sistema', 'divergencias',
            'itens',
        ]
        read_only_fields = ['processado_em', 'status', 'total_banco', 'total_sistema', 'divergencias']


class ConciliacaoListSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    conta_nome   = serializers.CharField(source='conta.nome', read_only=True)
    status_label = serializers.SerializerMethodField()

    def get_status_label(self, obj):
        labels = {
            'PENDENTE':           'Pendente',
            'PROCESSADO':         'Processado',
            'COM_DIVERGENCIAS':   'Com Divergências',
        }
        return labels.get(obj.status, obj.status)

    class Meta:
        model = ConciliacaoExtrato
        fields = [
            'id', 'conta', 'conta_nome', 'arquivo', 'periodo',
            'processado_em', 'status', 'status_label',
            'total_banco', 'total_sistema', 'divergencias',
        ]


class PadraoSeguroConciliacaoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='pk', read_only=True)
    created_by_nome = serializers.CharField(source='created_by.nome', read_only=True)

    class Meta:
        model = PadraoSeguroConciliacao
        fields = [
            'id', 'descricao_padrao', 'tipo', 'natureza', 'is_active',
            'created_at', 'created_by', 'created_by_nome',
        ]
        read_only_fields = ['created_at', 'created_by']
