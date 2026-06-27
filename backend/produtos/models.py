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
    ]

    nome          = models.CharField(max_length=200)
    tipo          = models.CharField(max_length=10, choices=TIPO, default='SERVICO')
    categoria     = models.CharField(max_length=100, blank=True)
    descricao     = models.TextField(blank=True)
    unidade       = models.CharField(max_length=10, choices=UNIDADE, default='UN')
    preco_padrao  = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    preco_minimo  = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    ativo         = models.BooleanField(default=True)
    criado_por    = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, related_name='produtos_criados')
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['tipo', 'categoria', 'nome']
        verbose_name = 'Produto/Serviço'
        verbose_name_plural = 'Produtos/Serviços'

    def __str__(self):
        return f'{self.nome} ({self.get_tipo_display()})'
