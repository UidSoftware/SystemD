from rest_framework import serializers
from usuarios.models import Usuario
from .models import OS, FaseOS, Contrato, Chamado, MensagemChamado, Entrevista, ArquiteturaTecnica, Manutencao


class FaseOSSerializer(serializers.ModelSerializer):
    fase_display = serializers.CharField(source='get_fase_display', read_only=True)
    responsavel_nome = serializers.CharField(source='responsavel.nome', read_only=True, default=None)

    class Meta:
        model = FaseOS
        fields = ['id', 'fase', 'fase_display', 'descricao', 'responsavel_nome', 'criado_em']
        read_only_fields = ['criado_em']


class ContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrato
        fields = [
            'id', 'numero', 'valor_total', 'valor_entrada', 'percentual_entrada',
            'valor_mensal', 'data_assinatura', 'observacoes', 'ativo', 'criado_em',
        ]
        read_only_fields = ['criado_em']


class MensagemChamadoSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='autor.nome', read_only=True)

    class Meta:
        model = MensagemChamado
        fields = ['id', 'autor_nome', 'mensagem', 'criado_em']
        read_only_fields = ['criado_em']


class ChamadoSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)
    aberto_por_nome = serializers.CharField(source='aberto_por.nome', read_only=True)
    mensagens = MensagemChamadoSerializer(many=True, read_only=True)

    class Meta:
        model = Chamado
        fields = [
            'id', 'titulo', 'descricao', 'prioridade', 'prioridade_display',
            'status', 'status_display', 'aberto_por_nome', 'mensagens',
            'resolvido_em', 'ativo', 'criado_em', 'atualizado_em',
        ]
        read_only_fields = ['criado_em', 'atualizado_em', 'resolvido_em']


class OSListSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.nome_empresa', read_only=True)
    responsavel_nome = serializers.CharField(source='responsavel.nome', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    tem_contrato = serializers.SerializerMethodField()

    class Meta:
        model = OS
        fields = [
            'id', 'titulo', 'status', 'status_display', 'cliente_nome',
            'responsavel_nome', 'valor_total', 'data_entrega', 'tem_contrato',
            'criado_em', 'atualizado_em',
        ]

    def get_tem_contrato(self, obj):
        return hasattr(obj, 'contrato')


class OSDetailSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.nome_empresa', read_only=True)
    cliente_id = serializers.IntegerField(source='cliente.id', read_only=True)
    responsavel_nome = serializers.CharField(source='responsavel.nome', read_only=True, default=None)
    responsavel_id = serializers.PrimaryKeyRelatedField(
        source='responsavel',
        queryset=Usuario.objects.filter(ativo=True),
        write_only=True,
        required=False,
        allow_null=True,
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    proximo_status = serializers.CharField(source='proximo_status', read_only=True)
    fases = FaseOSSerializer(many=True, read_only=True)
    contrato = ContratoSerializer(read_only=True)
    chamados = ChamadoSerializer(many=True, read_only=True)

    class Meta:
        model = OS
        fields = [
            'id', 'titulo', 'descricao', 'status', 'status_display', 'proximo_status',
            'cliente_nome', 'cliente_id', 'responsavel_nome', 'responsavel_id',
            'valor_total', 'valor_entrada', 'valor_mensal',
            'data_inicio', 'data_entrega', 'observacoes',
            'ativo', 'criado_em', 'atualizado_em',
            'fases', 'contrato', 'chamados',
        ]
        read_only_fields = ['criado_em', 'atualizado_em']


class OSCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OS
        fields = [
            'cliente', 'titulo', 'descricao', 'responsavel',
            'valor_total', 'valor_entrada', 'valor_mensal',
            'data_inicio', 'data_entrega', 'observacoes',
        ]


class EntrevistaSerializer(serializers.ModelSerializer):
    prospecto_nome = serializers.CharField(source='prospecto.nome_empresa', read_only=True)
    prospecto_cliente_nome = serializers.CharField(source='prospecto.cliente.nome_empresa', read_only=True, default='')
    lead_id = serializers.IntegerField(source='prospecto.lead.id', read_only=True)
    lead_nome = serializers.CharField(source='prospecto.lead.nome', read_only=True)
    lead_mensagem = serializers.CharField(source='prospecto.lead.mensagem', read_only=True)
    segmento_display = serializers.CharField(source='get_segmento_display', read_only=True)
    orcamento_faixa_display = serializers.CharField(source='get_orcamento_faixa_display', read_only=True)

    class Meta:
        model = Entrevista
        fields = '__all__'
        read_only_fields = ['criado_em', 'atualizado_em']


class ArquiteturaTecnicaSerializer(serializers.ModelSerializer):
    entrevista_sistema = serializers.CharField(source='entrevista.sistema', read_only=True)
    prospecto_nome = serializers.CharField(source='entrevista.prospecto.nome_empresa', read_only=True)
    lead_mensagem = serializers.CharField(source='entrevista.prospecto.lead.mensagem', read_only=True)

    class Meta:
        model = ArquiteturaTecnica
        fields = '__all__'
        read_only_fields = ['criado_em', 'atualizado_em']


class ManutencaoSerializer(serializers.ModelSerializer):
    os_titulo = serializers.CharField(source='os.titulo', read_only=True)
    os_cliente = serializers.CharField(source='os.cliente.nome_empresa', read_only=True)

    class Meta:
        model = Manutencao
        fields = [
            'id', 'os', 'os_titulo', 'os_cliente',
            'descricao', 'caminho', 'feito', 'disparada_em',
            'ativo', 'criado_em', 'atualizado_em',
        ]
        read_only_fields = ['criado_em', 'atualizado_em', 'disparada_em']


class OSParaManutencaoSerializer(serializers.ModelSerializer):
    """Serializer mínimo para alimentar o combobox de sistemas na ManutencaoPage."""
    cliente_nome = serializers.CharField(source='cliente.nome_empresa', read_only=True)

    class Meta:
        model = OS
        fields = ['id', 'titulo', 'cliente_nome', 'status', 'caminho_servidor', 'url']
