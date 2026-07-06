from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import Artefato

MODELOS_PERMITIDOS = {
    'lead':                 ('vitrine', 'lead'),
    'prospecto':            ('prospectos', 'prospecto'),
    'entrevista':           ('ordens', 'entrevista'),
    'arquitetura_tecnica':  ('ordens', 'arquiteturatecnica'),
    'os':                   ('ordens', 'os'),
    'manutencao':           ('ordens', 'manutencao'),
}


class ArtefatoSerializer(serializers.ModelSerializer):
    vinculo_modelo = serializers.ChoiceField(choices=list(MODELOS_PERMITIDOS.keys()), write_only=True, required=False)
    vinculo_id     = serializers.IntegerField(write_only=True, required=False)
    vinculo_tipo   = serializers.SerializerMethodField()
    vinculo_repr   = serializers.SerializerMethodField()

    class Meta:
        model = Artefato
        fields = [
            'id', 'tipo', 'agente', 'titulo', 'conteudo',
            'commit_hash', 'deploy_url', 'status',
            'vinculo_modelo', 'vinculo_id', 'vinculo_tipo', 'vinculo_repr',
            'criado_em',
        ]
        read_only_fields = ['id', 'criado_em']

    def get_vinculo_tipo(self, obj):
        return obj.content_type.model if obj.content_type_id else None

    def get_vinculo_repr(self, obj):
        return str(obj.vinculo) if obj.object_id and obj.vinculo else None

    def validate(self, attrs):
        modelo = attrs.get('vinculo_modelo')
        obj_id = attrs.get('vinculo_id')
        if bool(modelo) != bool(obj_id):
            raise serializers.ValidationError('Informe vinculo_modelo e vinculo_id juntos, ou nenhum dos dois.')
        return attrs

    def create(self, validated_data):
        modelo = validated_data.pop('vinculo_modelo', None)
        obj_id = validated_data.pop('vinculo_id', None)
        if modelo and obj_id:
            app_label, model_name = MODELOS_PERMITIDOS[modelo]
            content_type = ContentType.objects.get(app_label=app_label, model=model_name)
            validated_data['content_type'] = content_type
            validated_data['object_id'] = obj_id
        return Artefato.objects.create(**validated_data)
