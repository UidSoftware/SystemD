from decimal import Decimal

from django.conf import settings
from django.db import models


class BaseFinanceiro(models.Model):
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por    = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+',
    )
    ativo = models.BooleanField(default=True)

    class Meta:
        abstract = True


# ──────────────────────────────────────────────
# Conta
# ──────────────────────────────────────────────

class TipoConta(models.TextChoices):
    CORRENTE = 'CORRENTE', 'Conta Corrente'
    POUPANCA = 'POUPANCA', 'Poupança'
    CAIXA    = 'CAIXA',    'Caixa'
    CARTEIRA = 'CARTEIRA', 'Carteira Digital'


class Conta(BaseFinanceiro):
    nome          = models.CharField(max_length=100)
    tipo          = models.CharField(max_length=20, choices=TipoConta.choices)
    banco         = models.CharField(max_length=100, blank=True)
    agencia       = models.CharField(max_length=20, blank=True)
    numero        = models.CharField(max_length=30, blank=True)
    saldo_inicial = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = 'fin_conta'
        ordering = ['nome']

    def __str__(self):
        return self.nome


# ──────────────────────────────────────────────
# Aporte
# ──────────────────────────────────────────────

class TipoAporte(models.TextChoices):
    CAPITAL_SOCIAL = 'CAPITAL_SOCIAL', 'Capital Social'
    SOCIO          = 'SOCIO',          'Aporte do Fundador'
    INVESTIDOR     = 'INVESTIDOR',     'Aporte de Investidor'
    EMPRESTIMO     = 'EMPRESTIMO',     'Empréstimo'


class Aporte(BaseFinanceiro):
    tipo        = models.CharField(max_length=20, choices=TipoAporte.choices)
    descricao   = models.CharField(max_length=255)
    valor       = models.DecimalField(max_digits=12, decimal_places=2)
    conta       = models.ForeignKey(Conta, on_delete=models.PROTECT, related_name='aportes')
    data        = models.DateField()
    responsavel = models.CharField(max_length=150)
    observacoes = models.TextField(blank=True)

    class Meta:
        db_table = 'fin_aporte'
        ordering = ['-data']

    def __str__(self):
        return f'{self.descricao} — R$ {self.valor}'


# ──────────────────────────────────────────────
# Receita
# ──────────────────────────────────────────────

class TipoReceita(models.TextChoices):
    ENTRADA_CONTRATO   = 'ENTRADA_CONTRATO',   'Entrada de Contrato'
    MENSALIDADE        = 'MENSALIDADE',        'Mensalidade'
    CONSULTORIA        = 'CONSULTORIA',        'Consultoria Avulsa'
    RECEITA_FINANCEIRA = 'RECEITA_FINANCEIRA', 'Receita Financeira'
    OUTRO              = 'OUTRO',              'Outro'


class StatusReceita(models.TextChoices):
    PENDENTE  = 'PENDENTE',  'Pendente'
    RECEBIDO  = 'RECEBIDO',  'Recebido'
    CANCELADO = 'CANCELADO', 'Cancelado'
    ATRASADO  = 'ATRASADO',  'Atrasado'


class Receita(BaseFinanceiro):
    tipo           = models.CharField(max_length=20, choices=TipoReceita.choices)
    descricao      = models.CharField(max_length=255)
    cliente        = models.ForeignKey(
        'clientes.Cliente', null=True, blank=True,
        on_delete=models.PROTECT, related_name='receitas',
    )
    os             = models.ForeignKey(
        'ordens.OS', null=True, blank=True,
        on_delete=models.PROTECT, related_name='receitas',
    )
    categoria      = models.ForeignKey(
        'Categoria', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='receitas',
        limit_choices_to={'tipo': 'ENTRADA', 'ativo': True},
    )
    valor_bruto    = models.DecimalField(max_digits=12, decimal_places=2)
    desconto       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_liquido  = models.DecimalField(max_digits=12, decimal_places=2)
    conta          = models.ForeignKey(Conta, on_delete=models.PROTECT, related_name='receitas')
    vencimento     = models.DateField()
    recebimento    = models.DateField(null=True, blank=True)
    status         = models.CharField(max_length=20, choices=StatusReceita.choices, default='PENDENTE')
    referencia_mes = models.DateField(null=True, blank=True)
    observacoes    = models.TextField(blank=True)

    class Meta:
        db_table = 'fin_receita'
        ordering = ['vencimento']

    def save(self, *args, **kwargs):
        self.valor_liquido = self.valor_bruto - (self.desconto or Decimal('0'))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.descricao} — R$ {self.valor_liquido}'


# ──────────────────────────────────────────────
# Despesa
# ──────────────────────────────────────────────


class FrequenciaDespesa(models.TextChoices):
    MENSAL    = 'MENSAL',    'Mensal'
    SEMANAL   = 'SEMANAL',   'Semanal'
    QUINZENAL = 'QUINZENAL', 'Quinzenal'
    ANUAL     = 'ANUAL',     'Anual'

class TipoDespesa(models.TextChoices):
    FIXA      = 'FIXA',      'Despesa Fixa'
    VARIAVEL  = 'VARIAVEL',  'Despesa Variável'
    PROLABORE = 'PROLABORE', 'Pró-labore'
    IMPOSTO   = 'IMPOSTO',   'Imposto / DAS'
    OUTRO     = 'OUTRO',     'Outro'


class StatusDespesa(models.TextChoices):
    PENDENTE  = 'PENDENTE',  'Pendente'
    PAGO      = 'PAGO',      'Pago'
    CANCELADO = 'CANCELADO', 'Cancelado'
    ATRASADO  = 'ATRASADO',  'Atrasado'


class FormaPagamento(models.TextChoices):
    PIX             = 'PIX',             'PIX'
    TED_DOC         = 'TED_DOC',         'TED/DOC'
    BOLETO          = 'BOLETO',          'Boleto'
    CARTAO_DEBITO   = 'CARTAO_DEBITO',   'Cartão de Débito'
    CARTAO_CREDITO  = 'CARTAO_CREDITO',  'Cartão de Crédito'
    DINHEIRO        = 'DINHEIRO',        'Dinheiro'
    OUTRO           = 'OUTRO',           'Outro'


class Despesa(BaseFinanceiro):
    tipo             = models.CharField(max_length=20, choices=TipoDespesa.choices)
    descricao        = models.CharField(max_length=255)
    fornecedor       = models.CharField(max_length=150, blank=True)
    valor_bruto      = models.DecimalField(max_digits=12, decimal_places=2)
    desconto         = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_liquido    = models.DecimalField(max_digits=12, decimal_places=2)
    conta            = models.ForeignKey(Conta, on_delete=models.PROTECT, related_name='despesas')
    categoria        = models.ForeignKey(
        'Categoria', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='despesas',
        limit_choices_to={'tipo': 'SAIDA', 'ativo': True},
    )
    vencimento       = models.DateField()
    pagamento        = models.DateField(null=True, blank=True)
    forma_pagamento  = models.CharField(
        max_length=20, choices=FormaPagamento.choices, blank=True,
    )
    status           = models.CharField(max_length=20, choices=StatusDespesa.choices, default='PENDENTE')
    referencia_mes   = models.DateField(null=True, blank=True)
    comprovante      = models.FileField(upload_to='despesas/', blank=True)
    observacoes      = models.TextField(blank=True)
    recorrente       = models.BooleanField(default=False)
    frequencia       = models.CharField(
        max_length=20, choices=FrequenciaDespesa.choices, blank=True,
    )
    quantidade       = models.PositiveIntegerField(default=1)
    estornado        = models.BooleanField(default=False)
    data_estorno     = models.DateField(null=True, blank=True)
    motivo_estorno   = models.TextField(blank=True)

    class Meta:
        db_table = 'fin_despesa'
        ordering = ['vencimento']

    def save(self, *args, **kwargs):
        self.valor_liquido = self.valor_bruto - (self.desconto or Decimal('0'))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.descricao} — R$ {self.valor_liquido}'


# ──────────────────────────────────────────────
# Categoria
# ──────────────────────────────────────────────

class TipoCategoria(models.TextChoices):
    ENTRADA = 'ENTRADA', 'Entrada'
    SAIDA   = 'SAIDA',   'Saída'


class Categoria(models.Model):
    nome      = models.CharField(max_length=100)
    tipo      = models.CharField(max_length=10, choices=TipoCategoria.choices)
    ativo     = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nome']
        unique_together = [['nome', 'tipo']]
        db_table = 'fin_categoria'

    def __str__(self):
        return f'{self.nome} ({self.tipo})'


# ──────────────────────────────────────────────
# Fornecedor
# ──────────────────────────────────────────────

class Fornecedor(BaseFinanceiro):
    forn_nome        = models.CharField(max_length=200)
    forn_cnpj        = models.CharField(max_length=18, unique=True, null=True, blank=True)
    forn_email       = models.EmailField(blank=True)
    forn_telefone    = models.CharField(max_length=20, blank=True)
    forn_observacoes = models.TextField(blank=True)
    forn_ativo       = models.BooleanField(default=True)

    class Meta:
        db_table = 'fin_fornecedor'
        ordering = ['forn_nome']

    def __str__(self):
        return self.forn_nome


# ──────────────────────────────────────────────
# LivroCaixa (imutável)
# ──────────────────────────────────────────────

class TipoLancamento(models.TextChoices):
    ENTRADA = 'ENTRADA', 'Entrada'
    SAIDA   = 'SAIDA',   'Saída'


class OrigemLancamento(models.TextChoices):
    APORTE   = 'APORTE',   'Aporte'
    RECEITA  = 'RECEITA',  'Receita'
    DESPESA  = 'DESPESA',  'Despesa'
    MANUAL   = 'MANUAL',   'Lançamento Manual'
    TRANSFER = 'TRANSFER', 'Transferência'
    ESTORNO  = 'ESTORNO',  'Estorno'  # 7 chars — dentro do max_length=10


class LivroCaixa(models.Model):
    """Imutável — nunca expor PUT/PATCH/DELETE. Correções via estorno."""
    conta          = models.ForeignKey(Conta, on_delete=models.PROTECT, related_name='lancamentos')
    tipo           = models.CharField(max_length=10, choices=TipoLancamento.choices)
    origem         = models.CharField(max_length=10, choices=OrigemLancamento.choices)
    origem_id      = models.PositiveIntegerField(null=True, blank=True)
    descricao      = models.CharField(max_length=255)
    valor          = models.DecimalField(max_digits=12, decimal_places=2)
    data           = models.DateField()
    saldo_anterior = models.DecimalField(max_digits=12, decimal_places=2)
    saldo_atual    = models.DecimalField(max_digits=12, decimal_places=2)
    criado_em      = models.DateTimeField(auto_now_add=True)
    criado_por     = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+',
    )
    estornado      = models.BooleanField(default=False)
    estorno_de     = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='estornos',
    )

    class Meta:
        db_table = 'fin_livro_caixa'
        ordering = ['-data', '-criado_em']

    def __str__(self):
        return f'{self.get_tipo_display()} R$ {self.valor} — {self.descricao}'

# ──────────────────────────────────────────────
# Conciliação Bancária
# ──────────────────────────────────────────────

class StatusConciliacao(models.TextChoices):
    PENDENTE           = 'PENDENTE',           'Pendente'
    PROCESSADO         = 'PROCESSADO',         'Processado'
    COM_DIVERGENCIAS   = 'COM_DIVERGENCIAS',   'Com Divergências'


class StatusItemConciliacao(models.TextChoices):
    CONCILIADO       = 'CONCILIADO',       'Conciliado'
    FALTANDO_SISTEMA = 'FALTANDO_SISTEMA', 'Faltando no Sistema'
    FALTANDO_BANCO   = 'FALTANDO_BANCO',   'Faltando no Banco'


class ConciliacaoExtrato(BaseFinanceiro):
    conta          = models.ForeignKey(Conta, on_delete=models.PROTECT, related_name='conciliacoes')
    arquivo        = models.CharField(max_length=500)
    periodo        = models.DateField()
    processado_em  = models.DateTimeField(auto_now_add=True)
    status         = models.CharField(max_length=20, choices=StatusConciliacao.choices, default='PENDENTE')
    total_banco    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_sistema  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    divergencias   = models.IntegerField(default=0)

    class Meta:
        db_table = 'fin_conciliacao_extrato'
        ordering = ['-processado_em']

    def __str__(self):
        return f'Conciliação {self.conta.nome} — {self.periodo.strftime("%m/%Y")}'


class ItemConciliacao(models.Model):
    conciliacao    = models.ForeignKey(ConciliacaoExtrato, on_delete=models.CASCADE, related_name='itens')
    data_banco     = models.DateField()
    descricao_banco = models.CharField(max_length=500)
    valor          = models.DecimalField(max_digits=12, decimal_places=2)
    tipo           = models.CharField(max_length=10, choices=TipoLancamento.choices)
    status         = models.CharField(max_length=20, choices=StatusItemConciliacao.choices)
    lancamento_lc  = models.ForeignKey(LivroCaixa, null=True, blank=True, on_delete=models.SET_NULL, related_name='conciliacoes')
    confirmado     = models.BooleanField(default=False)

    class Meta:
        db_table = 'fin_item_conciliacao'
        ordering = ['data_banco']

    def __str__(self):
        return f'{self.data_banco} {self.get_tipo_display()} R${self.valor} — {self.status}'


# ──────────────────────────────────────────────
# Padrão Seguro para Conciliação Automática
# ──────────────────────────────────────────────

class NaturezaPadraoConciliacao(models.TextChoices):
    APORTE             = 'APORTE',             'Aporte (capital social)'
    RECEITA_FINANCEIRA = 'RECEITA_FINANCEIRA', 'Receita Financeira (rendimento)'


class PadraoSeguroConciliacao(models.Model):
    """
    Lista de padrões de descrição aprovados para criação automática de
    lançamentos via --auto no conciliar_extrato. Qualquer transação fora
    desses padrões fica como FALTANDO_SISTEMA aguardando revisão humana.
    """
    descricao_padrao = models.CharField(max_length=300)   # substring match case-insensitive
    tipo             = models.CharField(max_length=10, choices=TipoLancamento.choices)  # ENTRADA ou SAIDA
    natureza         = models.CharField(
        max_length=20, choices=NaturezaPadraoConciliacao.choices,
        default=NaturezaPadraoConciliacao.APORTE,
        help_text='Só relevante para tipo=ENTRADA — Aporte vira Patrimônio Líquido '
                   '(nunca entra no DRE); Receita Financeira entra no DRE como '
                   'rendimento, separado da receita operacional.',
    )
    ativo            = models.BooleanField(default=True)
    criado_em        = models.DateTimeField(auto_now_add=True)
    criado_por       = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+',
    )

    class Meta:
        db_table = 'fin_padrao_seguro_conciliacao'
        ordering = ['tipo', 'descricao_padrao']

    def __str__(self):
        return f'[{self.tipo}] {self.descricao_padrao}'
