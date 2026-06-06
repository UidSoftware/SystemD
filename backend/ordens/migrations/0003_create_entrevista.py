from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0003_cliente_tem_entregas'),
        ('ordens', '0002_arquiteturatecnica'),
    ]

    operations = [
        migrations.CreateModel(
            name='Entrevista',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sistema', models.CharField(max_length=100)),
                ('descricao', models.TextField()),
                ('cores_empresa', models.CharField(max_length=100)),
                ('dominio', models.CharField(blank=True, max_length=200)),
                ('whatsapp_business', models.BooleanField(default=False)),
                ('redes_sociais', models.TextField(blank=True)),
                ('palavras_chave', models.TextField(blank=True)),
                ('segmento', models.CharField(choices=[('SAUDE', 'Saúde / Bem-estar'), ('BELEZA', 'Beleza'), ('VAREJO', 'Varejo'), ('ALIMENTACAO', 'Alimentação'), ('SERVICOS', 'Serviços'), ('EDUCACAO', 'Educação'), ('OUTRO', 'Outro')], max_length=20)),
                ('publico_alvo', models.TextField(blank=True)),
                ('concorrentes', models.TextField(blank=True)),
                ('prazo_desejado', models.DateField(blank=True, null=True)),
                ('orcamento_faixa', models.CharField(choices=[('MEI', 'MEI'), ('PEQUENO', 'Pequeno'), ('MEDIO', 'Médio')], max_length=10)),
                ('ativo', models.BooleanField(default=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('cliente', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='entrevistas', to='clientes.cliente')),
            ],
            options={
                'verbose_name': 'Entrevista',
                'verbose_name_plural': 'Entrevistas',
                'ordering': ['-criado_em'],
            },
        ),
    ]
