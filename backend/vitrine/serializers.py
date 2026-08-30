from rest_framework import serializers
from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ('id', 'nome', 'email', 'telefone', 'empresa', 'mensagem', 'origem')


class LeadGestaoSerializer(serializers.ModelSerializer):
    qtd_prospectos = serializers.SerializerMethodField()

    def get_qtd_prospectos(self, obj):
        return obj.prospectos.count()

    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ('id', 'criado_em')
