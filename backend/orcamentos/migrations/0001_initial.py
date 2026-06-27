from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
from decimal import Decimal


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('clientes', '0004_socio_cliente'),
        ('usuarios', '0003_setor_usuario_perfil_setor'),
    ]

    operations = [
        migrations.CreateModel(
            name='Orcamento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero', models.PositiveIntegerField(editable=False)),
                ('emitido_em', models.DateField(auto_now_add=True)),
                ('valido_ate', models.DateField()),
                ('status', models.CharField(choices=[('rascunho', 'Rascunho'), ('enviado', 'Enviado'), ('aprovado', 'Aprovado'), ('recusado', 'Recusado'), ('expirado', 'Expirado'), ('cancelado', 'Cancelado')], default='rascunho', max_length=20)),
                ('desconto', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('forma_pagamento', models.CharField(blank=True, max_length=200)),
                ('observacoes', models.TextField(blank=True)),
                ('contratid_orcamento_id', models.IntegerField(blank=True, null=True)),
                ('contratid_synced_at', models.DateTimeField(blank=True, null=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('ativo', models.BooleanField(default=True)),
                ('cliente', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='orcamentos', to='clientes.cliente')),
                ('criado_por', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='orcamentos_criados', to='usuarios.usuario')),
            ],
            options={
                'verbose_name': 'Orçamento',
                'verbose_name_plural': 'Orçamentos',
                'ordering': ['-criado_em'],
            },
        ),
        migrations.CreateModel(
            name='ItemOrcamento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ordem', models.PositiveSmallIntegerField(default=1)),
                ('descricao', models.CharField(max_length=300)),
                ('quantidade', models.DecimalField(decimal_places=3, default=1, max_digits=10)),
                ('valor_unitario', models.DecimalField(decimal_places=2, max_digits=12)),
                ('orcamento', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='itens', to='orcamentos.orcamento')),
            ],
            options={
                'verbose_name': 'Item de Orçamento',
                'ordering': ['ordem'],
            },
        ),
    ]
