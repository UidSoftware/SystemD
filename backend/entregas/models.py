from django.db import models


class StatusEntrega(models.TextChoices):
    PENDENTE   = 'PENDENTE',   'Pendente'
    EM_ROTA    = 'EM_ROTA',    'Em rota'
    ENTREGUE   = 'ENTREGUE',   'Entregue'
    DEVOLVIDO  = 'DEVOLVIDO',  'Devolvido'
    CANCELADO  = 'CANCELADO',  'Cancelado'


class ConfirmacaoEntrega(models.TextChoices):
    PENDENTE       = 'PENDENTE',       'Pendente'
    CONFIRMADA     = 'CONFIRMADA',     'Confirmada'
    NAO_CONFIRMADA = 'NAO_CONFIRMADA', 'Não confirmada'


class Unidade(models.Model):
    nome      = models.CharField(max_length=200, unique=True)
    ativo     = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Unidade'
        verbose_name_plural = 'Unidades'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Entrega(models.Model):
    empresa    = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.PROTECT,
        related_name='entregas',
    )
    data        = models.DateField()
    hora        = models.TimeField(null=True, blank=True)
    solicitante = models.CharField(max_length=200)
    unidade     = models.ForeignKey(Unidade, on_delete=models.PROTECT, related_name='entregas_unidade')
    de          = models.ForeignKey(Unidade, on_delete=models.PROTECT, related_name='entregas_de')
    para        = models.ForeignKey(Unidade, on_delete=models.PROTECT, related_name='entregas_para')
    descricao   = models.TextField(blank=True)
    motoboy     = models.CharField(max_length=200)
    status      = models.CharField(
        max_length=15,
        choices=StatusEntrega.choices,
        default=StatusEntrega.PENDENTE,
    )
    registrado_por = models.ForeignKey(
        'usuarios.Usuario',
        on_delete=models.PROTECT,
        related_name='entregas_registradas',
    )
    observacoes = models.TextField(blank=True)
    confirmacao = models.CharField(
        max_length=20,
        choices=ConfirmacaoEntrega.choices,
        default=ConfirmacaoEntrega.PENDENTE,
    )
    confirmacao_motivo = models.TextField(blank=True)
    confirmado_por = models.ForeignKey(
        'usuarios.Usuario',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='entregas_confirmadas',
    )
    confirmado_em = models.DateTimeField(null=True, blank=True)
    ativo         = models.BooleanField(default=True)
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Entrega'
        verbose_name_plural = 'Entregas'
        ordering = ['-data', '-hora']

    def __str__(self):
        return f"{self.empresa.nome_empresa} — {self.data}"
