import common.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0010_base_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='fornecedor',
            name='cnpj',
            field=models.CharField(blank=True, default='', help_text='Apenas dígitos.', max_length=14, verbose_name='CNPJ'),
        ),
        migrations.AddField(
            model_name='fornecedor',
            name='cpf',
            field=models.CharField(blank=True, default='', help_text='Apenas dígitos.', max_length=11, verbose_name='CPF'),
        ),
        migrations.AddField(
            model_name='fornecedor',
            name='documento',
            field=models.CharField(blank=True, help_text='Apenas dígitos (sem máscara). Validado (dígito verificador).', max_length=14, null=True, unique=True, validators=[common.validators.validar_documento], verbose_name='CPF/CNPJ'),
        ),
        migrations.AddField(
            model_name='fornecedor',
            name='tipo_pessoa',
            field=models.CharField(choices=[('PF', 'Pessoa Física'), ('PJ', 'Pessoa Jurídica')], default='PJ', max_length=2, verbose_name='tipo de pessoa'),
        ),
        migrations.CreateModel(
            name='AcionistaFornecedor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=150)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('telefone', models.CharField(blank=True, max_length=20)),
                ('whatsapp', models.CharField(blank=True, max_length=20)),
                ('cpf', models.CharField(blank=True, max_length=20)),
                ('principal', models.BooleanField(default=False)),
                ('fornecedor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='acionistas', to='financeiro.fornecedor')),
            ],
            options={
                'verbose_name': 'Acionista do Fornecedor',
                'verbose_name_plural': 'Acionistas do Fornecedor',
                'db_table': 'fin_acionista_fornecedor',
                'ordering': ['-principal', 'nome'],
            },
        ),
    ]
