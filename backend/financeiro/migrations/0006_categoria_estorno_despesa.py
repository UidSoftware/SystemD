# Generated manually — Categoria, FK categoria em Receita/Despesa, campos estorno em Despesa

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0005_despesa_recorrente'),
    ]

    operations = [
        # 1. Criar tabela fin_categoria
        migrations.CreateModel(
            name='Categoria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=100)),
                ('tipo', models.CharField(
                    choices=[('ENTRADA', 'Entrada'), ('SAIDA', 'Saída')],
                    max_length=10,
                )),
                ('ativo', models.BooleanField(default=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['nome'],
                'db_table': 'fin_categoria',
            },
        ),
        migrations.AlterUniqueTogether(
            name='categoria',
            unique_together={('nome', 'tipo')},
        ),
        # 2. FK categoria em Receita
        migrations.AddField(
            model_name='receita',
            name='categoria',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'ativo': True, 'tipo': 'ENTRADA'},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='receitas',
                to='financeiro.categoria',
            ),
        ),
        # 3. FK categoria em Despesa
        migrations.AddField(
            model_name='despesa',
            name='categoria',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'ativo': True, 'tipo': 'SAIDA'},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='despesas',
                to='financeiro.categoria',
            ),
        ),
        # 4. Campos estorno em Despesa
        migrations.AddField(
            model_name='despesa',
            name='estornado',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='despesa',
            name='data_estorno',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='despesa',
            name='motivo_estorno',
            field=models.TextField(blank=True),
        ),
    ]
