from decimal import Decimal

from rest_framework import serializers

from .models import Aporte, Categoria, ConciliacaoExtrato, Conta, Despesa, FormaPagamento, Fornecedor, ItemConciliacao, LivroCaixa, Receita


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nome', 'tipo', 'ativo', 'criado_em']
        read_only_fields = ['id', 'criado_em']


class ContaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conta
        fields = [
            'id', 'nome', 'tipo', 'banco', 'agencia', 'numero',
            'saldo_inicial', 'ativo', 'criado_em',
        ]
        read_only_fields = ['id', 'criado_em']


class AporteSerializer(serializers.ModelSerializer):
    conta_nome = serializers.CharField(source='conta.nome', read_only=True)

    class Meta:
        model = Aporte
        fields = [
            'id', 'tipo', 'descricao', 'valor', 'conta', 'conta_nome',
            'data', 'responsavel', 'observacoes', 'ativo', 'criado_em',
        ]
        read_only_fields = ['id', 'criado_em']


class ReceitaSerializer(serializers.ModelSerializer):
    cliente_nome   = serializers.CharField(source='cliente.nome_empresa', read_only=True)
    os_titulo      = serializers.CharField(source='os.titulo', read_only=True)
    conta_nome     = serializers.CharField(source='conta.nome', read_only=True)
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)

    class Meta:
        model = Receita
        fields = [
            'id', 'tipo', 'descricao',
            'cliente', 'cliente_nome', 'os', 'os_titulo',
            'categoria', 'categoria_nome',
            'valor_bruto', 'desconto', 'valor_liquido',
            'conta', 'conta_nome',
            'vencimento', 'recebimento', 'status',
            'referencia_mes', 'observacoes', 'ativo', 'criado_em',
        ]
        read_only_fields = ['id', 'valor_liquido', 'criado_em']

    def validate(self, data):
        bruto    = data.get('valor_bruto', getattr(self.instance, 'valor_bruto', Decimal('0')))
        desconto = data.get('desconto', getattr(self.instance, 'desconto', Decimal('0')))
        if desconto > bruto:
            raise serializers.ValidationError({'desconto': 'Desconto não pode ser maior que o valor bruto.'})
        return data


class DespesaSerializer(serializers.ModelSerializer):
    conta_nome     = serializers.CharField(source='conta.nome', read_only=True)
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)

    class Meta:
        model = Despesa
        fields = [
            'id', 'tipo', 'descricao', 'fornecedor',
            'valor_bruto', 'desconto', 'valor_liquido',
            'conta', 'conta_nome',
            'categoria', 'categoria_nome',
            'vencimento', 'pagamento', 'forma_pagamento', 'status',
            'referencia_mes', 'comprovante', 'observacoes',
            'recorrente', 'frequencia', 'quantidade',
            'estornado', 'data_estorno', 'motivo_estorno',
            'ativo', 'criado_em',
        ]
        read_only_fields = ['id', 'valor_liquido', 'estornado', 'data_estorno', 'motivo_estorno', 'criado_em']

    def validate(self, data):
        bruto    = data.get('valor_bruto', getattr(self.instance, 'valor_bruto', Decimal('0')))
        desconto = data.get('desconto', getattr(self.instance, 'desconto', Decimal('0')))
        if desconto > bruto:
            raise serializers.ValidationError({'desconto': 'Desconto não pode ser maior que o valor bruto.'})
        return data


class FornecedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fornecedor
        fields = [
            'id', 'forn_nome', 'forn_cnpj', 'forn_email',
            'forn_telefone', 'forn_observacoes', 'forn_ativo',
            'ativo', 'criado_em',
        ]
        read_only_fields = ['id', 'criado_em']

    def validate_forn_cnpj(self, value):
        # Regra CLAUDE.md: unique+null+blank -> '' viola constraint; converter para None
        if value == '':
            return None
        return value


class LivroCaixaSerializer(serializers.ModelSerializer):
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
            'criado_em', 'estornado', 'estorno_de',
        ]
        read_only_fields = [
            'id', 'criado_em', 'saldo_anterior', 'saldo_atual', 'estornado', 'estorno_de',
        ]


class ItemConciliacaoSerializer(serializers.ModelSerializer):
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
            'id', 'data_banco', 'descricao_banco', 'valor', 'tipo', 'tipo_label',
            'status', 'status_label', 'lancamento_lc', 'lancamento_lc_data',
            'lancamento_lc_desc', 'confirmado',
        ]


class ConciliacaoExtratoSerializer(serializers.ModelSerializer):
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
        read_only_fields = ['id', 'processado_em', 'status', 'total_banco', 'total_sistema', 'divergencias']


class ConciliacaoListSerializer(serializers.ModelSerializer):
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
