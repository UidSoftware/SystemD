from decimal import Decimal

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('produtos', '0002_produto_codigo_barras_produto_estoque_minimo_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Combo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=200)),
                ('descricao', models.TextField(blank=True)),
                ('ativo', models.BooleanField(default=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('criado_por', models.ForeignKey(
                    null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='combos_criados', to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Combo',
                'verbose_name_plural': 'Combos',
                'ordering': ['-criado_em'],
            },
        ),
        migrations.CreateModel(
            name='ItemCombo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantidade', models.DecimalField(decimal_places=3, default=1, max_digits=12)),
                ('valor_unitario', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('combo', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='itens', to='produtos.combo',
                )),
                ('produto', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT, related_name='combo_itens', to='produtos.produto',
                )),
            ],
            options={
                'verbose_name': 'Item do Combo',
                'verbose_name_plural': 'Itens do Combo',
            },
        ),
    ]
