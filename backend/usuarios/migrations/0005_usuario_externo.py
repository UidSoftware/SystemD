from django.db import migrations, models


def marcar_contador_direto_como_externo(apps, schema_editor):
    Usuario = apps.get_model('usuarios', 'Usuario')
    Usuario.objects.filter(email='documento@contadordireto.com.br').update(externo=True)


def reverter(apps, schema_editor):
    Usuario = apps.get_model('usuarios', 'Usuario')
    Usuario.objects.filter(email='documento@contadordireto.com.br').update(externo=False)


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0004_usuario_perfil_contabilidade'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='externo',
            field=models.BooleanField(
                default=False,
                help_text=(
                    'Pessoa/empresa externa contratada (ex: escritório de contabilidade '
                    'terceirizado) — nunca tem acesso a módulos internos como Email, '
                    'independente do perfil (decisão 03/09/2026: distinção é interno x '
                    'externo, não o perfil em si — CONTABILIDADE interna e externa '
                    'coexistem e têm acesso diferente).'
                ),
            ),
        ),
        migrations.RunPython(marcar_contador_direto_como_externo, reverter),
    ]
