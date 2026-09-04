from rest_framework import serializers
from .models import Nicho


class NichoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Nicho
        fields = ['id', 'nome', 'ativo', 'criado_em']
        read_only_fields = ['id', 'criado_em']
