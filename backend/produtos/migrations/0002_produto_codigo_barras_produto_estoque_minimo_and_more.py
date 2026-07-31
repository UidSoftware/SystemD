from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


UNIDADE_CHOICES = [
    ('UN', 'Unidade'), ('HORA', 'Hora'), ('MES', 'Mês'), ('PROJETO', 'Projeto'),
    ('LICENCA', 'Licença'), ('GB', 'GB'), ('DIA', 'Dia'),
    ('PT', 'Pacote'), ('CX', 'Caixa'), ('KG', 'Quilograma'), ('L', 'Litro'), ('M', 'Metro'),
]


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('produtos', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='produto',
            name='codigo_barras',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
        migrations.AddField(
            model_name='produto',
            name='estoque_minimo',
            field=models.DecimalField(decimal_places=3, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='produto',
            name='quantidade_estoque',
            field=models.DecimalField(
                decimal_places=3, default=0, max_digits=12,
                help_text='Controle de estoque so faz sentido pra tipo=PRODUTO; '
                           'fica sempre 0 e sem uso pra tipo=SERVICO.',
            ),
        ),
        migrations.AlterField(
            model_name='produto',
            name='unidade',
            field=models.CharField(choices=UNIDADE_CHOICES, default='UN', max_length=10),
        ),
        migrations.CreateModel(
            name='ConversaoUnidade',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('unidade', models.CharField(choices=UNIDADE_CHOICES, max_length=10)),
                ('quantidade_por_base', models.DecimalField(
                    decimal_places=3, max_digits=12,
                    help_text='Quantos "produto.unidade" (a unidade base do produto) tem em 1 desta unidade.',
                )),
                ('produto', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='conversoes', to='produtos.produto',
                )),
            ],
            options={
                'verbose_name': 'Conversão de Unidade',
                'verbose_name_plural': 'Conversões de Unidade',
            },
        ),
        migrations.AlterUniqueTogether(
            name='conversaounidade',
            unique_together={('produto', 'unidade')},
        ),
        migrations.CreateModel(
            name='EntradaEstoque',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantidade', models.DecimalField(decimal_places=3, max_digits=12)),
                ('unidade', models.CharField(choices=UNIDADE_CHOICES, max_length=10)),
                ('quantidade_base', models.DecimalField(
                    decimal_places=3, default=0, max_digits=12,
                    help_text='Calculado automaticamente no save(), convertido pra unidade base do produto.',
                )),
                ('nota_fiscal', models.CharField(blank=True, default='', max_length=50)),
                ('observacoes', models.TextField(blank=True, default='')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('criado_por', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+', to=settings.AUTH_USER_MODEL,
                )),
                ('produto', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='entradas', to='produtos.produto',
                )),
            ],
            options={
                'verbose_name': 'Entrada de Estoque',
                'verbose_name_plural': 'Entradas de Estoque',
                'ordering': ['-criado_em'],
            },
        ),
    ]
