from django.db import models
from decimal import Decimal
from datetime import date


class Orcamento(models.Model):
    STATUS = [
        ('rascunho', 'Rascunho'),
        ('enviado', 'Enviado'),
        ('aprovado', 'Aprovado'),
        ('recusado', 'Recusado'),
        ('expirado', 'Expirado'),
        ('cancelado', 'Cancelado'),
    ]

    cliente         = models.ForeignKey('clientes.Cliente', null=True, blank=True, on_delete=models.SET_NULL, related_name='orcamentos')
    prospecto       = models.ForeignKey('prospectos.Prospecto', null=True, blank=True, on_delete=models.SET_NULL, related_name='orcamentos')
    numero          = models.PositiveIntegerField(editable=False)
    emitido_em      = models.DateField(default=date.today)
    valido_ate      = models.DateField()
    status          = models.CharField(max_length=20, choices=STATUS, default='rascunho')
    desconto        = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    forma_pagamento = models.CharField(max_length=200, blank=True)
    observacoes     = models.TextField(blank=True)

    contratid_orcamento_id = models.IntegerField(null=True, blank=True)
    contratid_synced_at    = models.DateTimeField(null=True, blank=True)

    criado_por    = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE, related_name='orcamentos_criados')
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    ativo         = models.BooleanField(default=True)

    @property
    def subtotal(self):
        return sum(item.subtotal for item in self.itens.all())

    @property
    def total_geral(self):
        return self.subtotal - self.desconto

    def save(self, *args, **kwargs):
        if not self.pk:
            ultimo = Orcamento.objects.order_by('-numero').first()
            self.numero = (ultimo.numero + 1) if ultimo else 1
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-criado_em']
        verbose_name = 'Orçamento'
        verbose_name_plural = 'Orçamentos'

    def __str__(self):
        nome = (self.cliente.nome_empresa if self.cliente else None) or (self.prospecto.nome_empresa if self.prospecto else None) or 'sem vínculo'
        return f'#{self.numero} — {nome}'


class ItemOrcamento(models.Model):
    orcamento      = models.ForeignKey(Orcamento, on_delete=models.CASCADE, related_name='itens')
    produto        = models.ForeignKey('produtos.Produto', null=True, blank=True, on_delete=models.SET_NULL, related_name='itens_orcamento')
    ordem          = models.PositiveSmallIntegerField(default=1)
    descricao      = models.CharField(max_length=300)
    quantidade     = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unidade        = models.CharField(max_length=10, default='UN')
    valor_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def subtotal(self):
        return self.quantidade * self.valor_unitario

    class Meta:
        ordering = ['ordem']
        verbose_name = 'Item de Orçamento'
