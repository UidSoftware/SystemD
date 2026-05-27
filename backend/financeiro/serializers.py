from decimal import Decimal

from rest_framework import serializers

from .models import Aporte, Conta, Despesa, FormaPagamento, Fornecedor, LivroCaixa, Receita


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
    cliente_nome = serializers.CharField(source='cliente.nome_empresa', read_only=True)
    os_titulo    = serializers.CharField(source='os.titulo', read_only=True)
    conta_nome   = serializers.CharField(source='conta.nome', read_only=True)

    class Meta:
        model = Receita
        fields = [
            'id', 'tipo', 'descricao',
            'cliente', 'cliente_nome', 'os', 'os_titulo',
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
    conta_nome = serializers.CharField(source='conta.nome', read_only=True)

    class Meta:
        model = Despesa
        fields = [
            'id', 'tipo', 'descricao', 'fornecedor',
            'valor_bruto', 'desconto', 'valor_liquido',
            'conta', 'conta_nome',
            'vencimento', 'pagamento', 'forma_pagamento', 'status',
            'referencia_mes', 'comprovante', 'observacoes', 'ativo', 'criado_em',
        ]
        read_only_fields = ['id', 'valor_liquido', 'criado_em']

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
