from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ordens', '0005_entrevista_prospecto_required'),
    ]

    operations = [
        migrations.CreateModel(
            name='Manutencao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('descricao', models.TextField(verbose_name='Descrição')),
                ('caminho', models.CharField(
                    blank=True,
                    help_text='Preenchido automaticamente com base no sistema selecionado.',
                    max_length=500,
                    verbose_name='Caminho no servidor',
                )),
                ('feito', models.BooleanField(default=False, verbose_name='Concluído')),
                ('ativo', models.BooleanField(default=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('os', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='manutencoes',
                    to='ordens.os',
                    verbose_name='Sistema (OS)',
                )),
            ],
            options={
                'verbose_name': 'Manutenção',
                'verbose_name_plural': 'Manutenções',
                'ordering': ['-criado_em'],
            },
        ),
    ]
