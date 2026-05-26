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
    ENTRADA_CONTRATO = 'ENTRADA_CONTRATO', 'Entrada de Contrato'
    MENSALIDADE      = 'MENSALIDADE',      'Mensalidade'
    CONSULTORIA      = 'CONSULTORIA',      'Consultoria Avulsa'
    OUTRO            = 'OUTRO',            'Outro'


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


class Despesa(BaseFinanceiro):
    tipo          = models.CharField(max_length=20, choices=TipoDespesa.choices)
    descricao     = models.CharField(max_length=255)
    fornecedor    = models.CharField(max_length=150, blank=True)
    valor_bruto   = models.DecimalField(max_digits=12, decimal_places=2)
    desconto      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_liquido = models.DecimalField(max_digits=12, decimal_places=2)
    conta         = models.ForeignKey(Conta, on_delete=models.PROTECT, related_name='despesas')
    vencimento    = models.DateField()
    pagamento     = models.DateField(null=True, blank=True)
    status        = models.CharField(max_length=20, choices=StatusDespesa.choices, default='PENDENTE')
    referencia_mes = models.DateField(null=True, blank=True)
    comprovante   = models.FileField(upload_to='despesas/', blank=True)
    observacoes   = models.TextField(blank=True)

    class Meta:
        db_table = 'fin_despesa'
        ordering = ['vencimento']

    def save(self, *args, **kwargs):
        self.valor_liquido = self.valor_bruto - (self.desconto or Decimal('0'))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.descricao} — R$ {self.valor_liquido}'


# ──────────────────────────────────────────────
# LivroCaixa (imutável)
# ──────────────────────────────────────────────

class TipoLancamento(models.TextChoices):
    ENTRADA = 'ENTRADA', 'Entrada'
    SAIDA   = 'SAIDA',   'Saída'


class OrigemLancamento(models.TextChoices):
    APORTE  = 'APORTE',  'Aporte'
    RECEITA = 'RECEITA', 'Receita'
    DESPESA = 'DESPESA', 'Despesa'
    MANUAL  = 'MANUAL',  'Lançamento Manual'


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
