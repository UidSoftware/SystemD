from django.db import models

from usuarios.models import Perfil


class TipoNotificacao(models.TextChoices):
    STACK_FORA_PADRAO = 'STACK_FORA_PADRAO', 'Stack fora do padrão'
    IMPEDIMENTO_ESTEIRA = 'IMPEDIMENTO_ESTEIRA', 'Impedimento na esteira'
    LEAD_NAO_QUALIFICADO = 'LEAD_NAO_QUALIFICADO', 'Lead não qualificado'


class PrioridadeNotificacao(models.TextChoices):
    BAIXA = 'BAIXA', 'Baixa'
    MEDIA = 'MEDIA', 'Média'
    ALTA = 'ALTA', 'Alta'


class Notificacao(models.Model):
    tipo          = models.CharField(max_length=30, choices=TipoNotificacao.choices)
    titulo        = models.CharField(max_length=200)
    descricao     = models.TextField(blank=True)
    link          = models.CharField(max_length=255, blank=True)
    prioridade    = models.CharField(max_length=10, choices=PrioridadeNotificacao.choices, default=PrioridadeNotificacao.MEDIA)
    perfil_destino = models.CharField(max_length=20, choices=Perfil.choices, null=True, blank=True)

    # Identifica de forma estável o registro de origem (ex: 'arquitetura_tecnica:5'),
    # usada para atualizar/resolver a mesma notificação em vez de duplicar.
    referencia    = models.CharField(max_length=100, blank=True, db_index=True)

    atribuido_a   = models.ForeignKey('usuarios.Usuario', null=True, blank=True, on_delete=models.SET_NULL, related_name='notificacoes')

    resolvida     = models.BooleanField(default=False)
    resolvida_por = models.ForeignKey('usuarios.Usuario', null=True, blank=True, on_delete=models.SET_NULL, related_name='notificacoes_resolvidas')
    resolvida_em  = models.DateTimeField(null=True, blank=True)

    ativo         = models.BooleanField(default=True)
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.get_tipo_display()} — {self.titulo}'
