from rest_framework import serializers

from .models import Notificacao


class NotificacaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)
    atribuido_a_nome = serializers.CharField(source='atribuido_a.nome', read_only=True, default=None)
    resolvida_por_nome = serializers.CharField(source='resolvida_por.nome', read_only=True, default=None)

    class Meta:
        model = Notificacao
        fields = '__all__'
        read_only_fields = [
            'tipo', 'titulo', 'descricao', 'link', 'prioridade', 'perfil_destino',
            'referencia', 'atribuido_a', 'resolvida_por', 'resolvida_em',
            'criado_em', 'atualizado_em',
        ]
