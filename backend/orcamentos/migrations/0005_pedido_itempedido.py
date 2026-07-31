from django.db import migrations, models
import django.db.models.deletion
import datetime


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0004_socio_cliente'),
        ('usuarios', '0003_setor_usuario_perfil_setor'),
        ('produtos', '0002_produto_codigo_barras_produto_estoque_minimo_and_more'),
        ('orcamentos', '0004_alter_orcamento_emitido_em'),
    ]

    operations = [
        migrations.CreateModel(
            name='Pedido',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero', models.PositiveIntegerField(editable=False)),
                ('status', models.CharField(choices=[
                    ('pendente', 'Pendente'), ('confirmado', 'Confirmado'),
                    ('em_producao', 'Em Produção'), ('entregue', 'Entregue'), ('cancelado', 'Cancelado'),
                ], default='pendente', max_length=20)),
                ('data_pedido', models.DateField(default=datetime.date.today)),
                ('entrega_prevista', models.DateField(blank=True, null=True)),
                ('observacoes', models.TextField(blank=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('ativo', models.BooleanField(default=True)),
                ('cliente', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pedidos', to='clientes.cliente')),
                ('orcamento', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pedidos', to='orcamentos.orcamento')),
                ('criado_por', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pedidos_criados', to='usuarios.usuario')),
            ],
            options={
                'verbose_name': 'Pedido',
                'verbose_name_plural': 'Pedidos',
                'ordering': ['-criado_em'],
            },
        ),
        migrations.CreateModel(
            name='ItemPedido',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ordem', models.PositiveSmallIntegerField(default=1)),
                ('descricao', models.CharField(max_length=300)),
                ('quantidade', models.DecimalField(decimal_places=3, default=1, max_digits=10)),
                ('unidade', models.CharField(default='UN', max_length=10)),
                ('valor_unitario', models.DecimalField(decimal_places=2, max_digits=12)),
                ('produto', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='itens_pedido', to='produtos.produto')),
                ('pedido', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='itens', to='orcamentos.pedido')),
            ],
            options={
                'verbose_name': 'Item de Pedido',
                'ordering': ['ordem'],
            },
        ),
    ]
