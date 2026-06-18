from django.db import models
from django.db.models import CASCADE, PROTECT, SET_NULL


class StatusOS(models.TextChoices):
    LEAD          = 'LEAD',         'Lead'
    REUNIAO       = 'REUNIAO',      'Reunião agendada'
    LEVANTAMENTO  = 'LEVANTAMENTO', 'Levantamento'
    PROPOSTA      = 'PROPOSTA',     'Proposta enviada'
    CONTRATO      = 'CONTRATO',     'Contrato assinado'
    DESENVOLVIMENTO = 'DEV',        'Em desenvolvimento'
    ENTREGA       = 'ENTREGA',      'Entregue'
    MANUTENCAO    = 'MANUTENCAO',   'Manutenção ativa'
    CANCELADA     = 'CANCELADA',    'Cancelada'


FLUXO_OS = [
    StatusOS.LEAD,
    StatusOS.REUNIAO,
    StatusOS.LEVANTAMENTO,
    StatusOS.PROPOSTA,
    StatusOS.CONTRATO,
    StatusOS.DESENVOLVIMENTO,
    StatusOS.ENTREGA,
    StatusOS.MANUTENCAO,
]


class OS(models.Model):
    cliente       = models.ForeignKey('clientes.Cliente', on_delete=PROTECT, related_name='ordens')
    titulo        = models.CharField(max_length=200)
    descricao     = models.TextField(blank=True)
    status        = models.CharField(max_length=20, choices=StatusOS.choices, default=StatusOS.LEAD)
    responsavel   = models.ForeignKey('usuarios.Usuario', null=True, blank=True, on_delete=SET_NULL, related_name='os_responsavel')
    valor_total   = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valor_entrada = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valor_mensal  = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    data_inicio   = models.DateField(null=True, blank=True)
    data_entrega  = models.DateField(null=True, blank=True)
    observacoes   = models.TextField(blank=True)
    caminho_servidor = models.CharField(
        max_length=500, blank=True,
        verbose_name="Caminho no servidor",
        help_text="Caminho do projeto no servidor VPS. Ex: /root/SystemD",
    )
    url = models.URLField(
        blank=True,
        verbose_name="URL do sistema",
        help_text="Ex: https://uidsoftware.com.br",
    )
    ativo         = models.BooleanField(default=True)
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Ordem de Serviço'
        verbose_name_plural = 'Ordens de Serviço'
        ordering = ['-criado_em']

    def __str__(self):
        return f'OS #{self.pk} — {self.titulo}'

    def proximo_status(self):
        if self.status == StatusOS.CANCELADA:
            return None
        try:
            idx = FLUXO_OS.index(self.status)
            return FLUXO_OS[idx + 1] if idx + 1 < len(FLUXO_OS) else None
        except ValueError:
            return None


class FaseOS(models.Model):
    os          = models.ForeignKey(OS, on_delete=CASCADE, related_name='fases')
    fase        = models.CharField(max_length=20, choices=StatusOS.choices)
    descricao   = models.TextField(blank=True)
    responsavel = models.ForeignKey('usuarios.Usuario', null=True, blank=True, on_delete=SET_NULL)
    criado_em   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Fase da OS'
        verbose_name_plural = 'Fases da OS'
        ordering = ['criado_em']

    def __str__(self):
        return f'{self.os} → {self.fase}'


class Contrato(models.Model):
    os                 = models.OneToOneField(OS, on_delete=CASCADE, related_name='contrato')
    numero             = models.CharField(max_length=50)
    valor_total        = models.DecimalField(max_digits=10, decimal_places=2)
    valor_entrada      = models.DecimalField(max_digits=10, decimal_places=2)
    percentual_entrada = models.DecimalField(max_digits=5, decimal_places=2, default=30)
    valor_mensal       = models.DecimalField(max_digits=10, decimal_places=2)
    data_assinatura    = models.DateField(null=True, blank=True)
    observacoes        = models.TextField(blank=True)
    ativo              = models.BooleanField(default=True)
    criado_em          = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'

    def __str__(self):
        return f'Contrato {self.numero}'


class PrioridadeChamado(models.TextChoices):
    BAIXA   = 'BAIXA',   'Baixa'
    MEDIA   = 'MEDIA',   'Média'
    ALTA    = 'ALTA',    'Alta'
    URGENTE = 'URGENTE', 'Urgente'


class StatusChamado(models.TextChoices):
    ABERTO      = 'ABERTO',      'Aberto'
    ATENDIMENTO = 'ATENDIMENTO', 'Em atendimento'
    RESOLVIDO   = 'RESOLVIDO',   'Resolvido'


class Chamado(models.Model):
    os            = models.ForeignKey(OS, on_delete=CASCADE, related_name='chamados')
    aberto_por    = models.ForeignKey('usuarios.Usuario', on_delete=PROTECT, related_name='chamados_abertos')
    titulo        = models.CharField(max_length=200)
    descricao     = models.TextField()
    prioridade    = models.CharField(max_length=10, choices=PrioridadeChamado.choices, default=PrioridadeChamado.MEDIA)
    status        = models.CharField(max_length=15, choices=StatusChamado.choices, default=StatusChamado.ABERTO)
    resolvido_em  = models.DateTimeField(null=True, blank=True)
    ativo         = models.BooleanField(default=True)
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Chamado'
        verbose_name_plural = 'Chamados'
        ordering = ['-criado_em']

    def __str__(self):
        return f'Chamado #{self.pk} — {self.titulo}'


class MensagemChamado(models.Model):
    chamado   = models.ForeignKey(Chamado, on_delete=CASCADE, related_name='mensagens')
    autor     = models.ForeignKey('usuarios.Usuario', on_delete=PROTECT)
    mensagem  = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Mensagem'
        verbose_name_plural = 'Mensagens'
        ordering = ['criado_em']

    def __str__(self):
        return f'Msg de {self.autor} em #{self.chamado_id}'


class SegmentoEntrevista(models.TextChoices):
    SAUDE       = 'SAUDE',       'Saúde / Bem-estar'
    BELEZA      = 'BELEZA',      'Beleza'
    VAREJO      = 'VAREJO',      'Varejo'
    ALIMENTACAO = 'ALIMENTACAO', 'Alimentação'
    SERVICOS    = 'SERVICOS',    'Serviços'
    EDUCACAO    = 'EDUCACAO',    'Educação'
    OUTRO       = 'OUTRO',       'Outro'


class OrcamentoFaixa(models.TextChoices):
    MEI     = 'MEI',     'MEI'
    PEQUENO = 'PEQUENO', 'Pequeno'
    MEDIO   = 'MEDIO',   'Médio'


class Entrevista(models.Model):
    prospecto        = models.ForeignKey('prospectos.Prospecto', on_delete=PROTECT, related_name='entrevistas')
    sistema          = models.CharField(max_length=100)
    descricao        = models.TextField()
    cores_empresa    = models.CharField(max_length=100)
    dominio          = models.CharField(max_length=200, blank=True)
    whatsapp_business = models.BooleanField(default=False)
    redes_sociais    = models.TextField(blank=True)
    palavras_chave   = models.TextField(blank=True)
    segmento         = models.CharField(max_length=20, choices=SegmentoEntrevista.choices)
    publico_alvo     = models.TextField(blank=True)
    concorrentes     = models.TextField(blank=True)
    prazo_desejado   = models.DateField(null=True, blank=True)
    orcamento_faixa  = models.CharField(max_length=10, choices=OrcamentoFaixa.choices)
    ativo            = models.BooleanField(default=True)
    criado_em        = models.DateTimeField(auto_now_add=True)
    atualizado_em    = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Entrevista'
        verbose_name_plural = 'Entrevistas'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.sistema} — {self.prospecto.nome_empresa}'


class ArquiteturaTecnica(models.Model):
    entrevista         = models.ForeignKey('ordens.Entrevista', on_delete=PROTECT, related_name='arquiteturas')

    # Identificação
    projeto            = models.CharField(max_length=200)
    cliente            = models.CharField(max_length=200)
    versao             = models.CharField(max_length=20, default='1.0.0')
    data_levantamento  = models.DateField()
    responsavel        = models.CharField(max_length=200, blank=True)

    # Backend
    linguagem          = models.CharField(max_length=50, default='Python')
    framework          = models.CharField(max_length=100, default='Django REST Framework')
    banco              = models.CharField(max_length=50, default='PostgreSQL')
    autenticacao       = models.CharField(max_length=50, default='JWT')
    padrao_api         = models.CharField(max_length=50, default='REST')

    # Frontend
    frontend_fw        = models.CharField(max_length=100, default='React 18')
    build_tool         = models.CharField(max_length=50, default='Vite')
    estilizacao        = models.CharField(max_length=100, default='Tailwind CSS')
    estado_global      = models.CharField(max_length=100, default='Zustand')
    server_state       = models.CharField(max_length=100, default='TanStack Query')

    # Infra
    ambiente_deploy    = models.CharField(max_length=200, default='VPS própria (Uid Software)')
    servidor_web       = models.CharField(max_length=50, default='Nginx')
    docker             = models.BooleanField(default=True)
    ssl                = models.BooleanField(default=True)
    cicd               = models.BooleanField(default=False)
    pwa                = models.BooleanField(default=False)
    dominio_uid        = models.BooleanField(default=False)

    # Observações
    padrao_rotas       = models.TextField(blank=True)
    perfis_acesso      = models.TextField(blank=True)
    integracoes        = models.TextField(blank=True)
    restricoes         = models.TextField(blank=True)
    notas_claude       = models.TextField(blank=True)

    criado_em          = models.DateTimeField(auto_now_add=True)
    atualizado_em      = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Arquitetura Técnica'
        verbose_name_plural = 'Arquiteturas Técnicas'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.projeto} v{self.versao}'


class Manutencao(models.Model):
    """Pedido de manutenção vinculado a um sistema (OS) existente.

    O campo `sistema` aponta para uma OS.
    O campo `caminho` é preenchido automaticamente com o caminho
    do sistema no servidor, inferido do título/cliente da OS.
    """
    os           = models.ForeignKey(
        OS,
        on_delete=PROTECT,
        related_name='manutencoes',
        verbose_name='Sistema (OS)',
    )
    descricao    = models.TextField(verbose_name='Descrição')
    caminho      = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Caminho no servidor',
        help_text='Preenchido automaticamente com base no sistema selecionado.',
    )
    disparada_em = models.DateTimeField(
        null=True, blank=True,
        verbose_name='Disparada em',
        help_text='Preenchido automaticamente pelo disparar_hotfix.',
    )
    feito        = models.BooleanField(default=False, verbose_name='Concluído')
    ativo        = models.BooleanField(default=True)
    criado_em    = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Manutenção'
        verbose_name_plural = 'Manutenções'
        ordering = ['-criado_em']

    def __str__(self):
        return f'Manutenção #{self.pk} — {self.os.titulo}'
