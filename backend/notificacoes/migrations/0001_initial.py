import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notificacao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('STACK_FORA_PADRAO', 'Stack fora do padrão'), ('IMPEDIMENTO_ESTEIRA', 'Impedimento na esteira'), ('LEAD_NAO_QUALIFICADO', 'Lead não qualificado')], max_length=30)),
                ('titulo', models.CharField(max_length=200)),
                ('descricao', models.TextField(blank=True)),
                ('link', models.CharField(blank=True, max_length=255)),
                ('prioridade', models.CharField(choices=[('BAIXA', 'Baixa'), ('MEDIA', 'Média'), ('ALTA', 'Alta')], default='MEDIA', max_length=10)),
                ('perfil_destino', models.CharField(blank=True, choices=[('ADMIN', 'Administrador'), ('FINANCEIRO', 'Financeiro'), ('OPERACIONAL', 'Operacional'), ('CLIENTE', 'Cliente')], max_length=20, null=True)),
                ('referencia', models.CharField(blank=True, db_index=True, max_length=100)),
                ('resolvida', models.BooleanField(default=False)),
                ('resolvida_em', models.DateTimeField(blank=True, null=True)),
                ('ativo', models.BooleanField(default=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('atribuido_a', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notificacoes', to=settings.AUTH_USER_MODEL)),
                ('resolvida_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notificacoes_resolvidas', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Notificação',
                'verbose_name_plural': 'Notificações',
                'ordering': ['-criado_em'],
            },
        ),
    ]
