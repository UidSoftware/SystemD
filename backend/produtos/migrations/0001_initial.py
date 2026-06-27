from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from decimal import Decimal


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Produto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=200)),
                ('tipo', models.CharField(choices=[('PRODUTO', 'Produto'), ('SERVICO', 'Serviço')], default='SERVICO', max_length=10)),
                ('categoria', models.CharField(blank=True, max_length=100)),
                ('descricao', models.TextField(blank=True)),
                ('unidade', models.CharField(choices=[('UN', 'Unidade'), ('HORA', 'Hora'), ('MES', 'Mês'), ('PROJETO', 'Projeto'), ('LICENCA', 'Licença'), ('GB', 'GB'), ('DIA', 'Dia')], default='UN', max_length=10)),
                ('preco_padrao', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('preco_minimo', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('ativo', models.BooleanField(default=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('criado_por', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='produtos_criados', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Produto/Serviço',
                'verbose_name_plural': 'Produtos/Serviços',
                'ordering': ['tipo', 'categoria', 'nome'],
            },
        ),
    ]
