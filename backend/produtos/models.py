from django.db import models
from decimal import Decimal


class Produto(models.Model):
    TIPO = [
        ('PRODUTO', 'Produto'),
        ('SERVICO', 'Serviço'),
    ]
    UNIDADE = [
        ('UN',      'Unidade'),
        ('HORA',    'Hora'),
        ('MES',     'Mês'),
        ('PROJETO', 'Projeto'),
        ('LICENCA', 'Licença'),
        ('GB',      'GB'),
        ('DIA',     'Dia'),
        ('PT',      'Pacote'),
        ('CX',      'Caixa'),
        ('KG',      'Quilograma'),
        ('L',       'Litro'),
        ('M',       'Metro'),
    ]

    nome               = models.CharField(max_length=200)
    tipo               = models.CharField(max_length=10, choices=TIPO, default='SERVICO')
    categoria          = models.CharField(max_length=100, blank=True)
    descricao          = models.TextField(blank=True)
    codigo_barras      = models.CharField(max_length=50, blank=True, default='')
    unidade            = models.CharField(max_length=10, choices=UNIDADE, default='UN')
    quantidade_estoque = models.DecimalField(
        max_digits=12, decimal_places=3, default=0,
        help_text='Controle de estoque so faz sentido pra tipo=PRODUTO; '
                   'fica sempre 0 e sem uso pra tipo=SERVICO.',
    )
    estoque_minimo     = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    preco_padrao       = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    preco_minimo       = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    ativo              = models.BooleanField(default=True)
    criado_por         = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, related_name='produtos_criados')
    criado_em          = models.DateTimeField(auto_now_add=True)
    atualizado_em      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['tipo', 'categoria', 'nome']
        verbose_name = 'Produto/Serviço'
        verbose_name_plural = 'Produtos/Serviços'

    def __str__(self):
        return f'{self.nome} ({self.get_tipo_display()})'


class ConversaoUnidade(models.Model):
    """Ex: 1 CX = 30 UN -> quantidade_por_base=30 (unidade=CX, produto.unidade=UN)."""
    produto             = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name='conversoes')
    unidade             = models.CharField(max_length=10, choices=Produto.UNIDADE)
    quantidade_por_base = models.DecimalField(
        max_digits=12, decimal_places=3,
        help_text='Quantos "produto.unidade" (a unidade base do produto) tem em 1 desta unidade.',
    )

    class Meta:
        unique_together = [('produto', 'unidade')]
        verbose_name = 'Conversão de Unidade'
        verbose_name_plural = 'Conversões de Unidade'

    def __str__(self):
        return f'{self.produto.nome}: 1 {self.unidade} = {self.quantidade_por_base} {self.produto.unidade}'


class EntradaEstoque(models.Model):
    produto         = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name='entradas')
    quantidade      = models.DecimalField(max_digits=12, decimal_places=3)
    unidade         = models.CharField(max_length=10, choices=Produto.UNIDADE)
    quantidade_base = models.DecimalField(
        max_digits=12, decimal_places=3, default=0,
        help_text='Calculado automaticamente no save(), convertido pra unidade base do produto.',
    )
    nota_fiscal     = models.CharField(max_length=50, blank=True, default='')
    observacoes     = models.TextField(blank=True, default='')
    criado_por      = models.ForeignKey('usuarios.Usuario', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    criado_em       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-criado_em']
        verbose_name = 'Entrada de Estoque'
        verbose_name_plural = 'Entradas de Estoque'

    def save(self, *args, **kwargs):
        if self.unidade == self.produto.unidade:
            self.quantidade_base = self.quantidade
        else:
            try:
                conversao = ConversaoUnidade.objects.get(produto=self.produto, unidade=self.unidade)
                self.quantidade_base = self.quantidade * conversao.quantidade_por_base
            except ConversaoUnidade.DoesNotExist:
                # Sem conversão definida: assume 1:1
                self.quantidade_base = self.quantidade

        is_new = self.pk is None
        super().save(*args, **kwargs)

        # Atualizar estoque do produto so em criacoes (nao em updates)
        if is_new:
            Produto.objects.filter(pk=self.produto_id).update(
                quantidade_estoque=models.F('quantidade_estoque') + self.quantidade_base,
            )

    def __str__(self):
        return f'Entrada {self.quantidade} {self.unidade} — {self.produto.nome}'


class Combo(models.Model):
    nome          = models.CharField(max_length=200)
    descricao     = models.TextField(blank=True)
    ativo         = models.BooleanField(default=True)
    criado_por    = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, related_name='combos_criados')
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-criado_em']
        verbose_name = 'Combo'
        verbose_name_plural = 'Combos'

    @property
    def valor_total(self):
        return sum((item.subtotal for item in self.itens.all()), Decimal('0.00'))

    def __str__(self):
        return self.nome


class ItemCombo(models.Model):
    combo          = models.ForeignKey(Combo, on_delete=models.CASCADE, related_name='itens')
    produto        = models.ForeignKey(Produto, on_delete=models.PROTECT, related_name='combo_itens')
    quantidade     = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    valor_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    # snapshot no momento de salvar — nao referencia Produto.preco_padrao dinamicamente (RN05)

    class Meta:
        verbose_name = 'Item do Combo'
        verbose_name_plural = 'Itens do Combo'

    @property
    def subtotal(self):
        return self.quantidade * self.valor_unitario

    def __str__(self):
        return f'{self.combo.nome} — {self.produto.nome} x{self.quantidade}'
