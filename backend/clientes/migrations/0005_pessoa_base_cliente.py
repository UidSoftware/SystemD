import common.validators
import django.db.models.deletion
from django.db import migrations, models


def popular_documento_cliente(apps, schema_editor):
    Cliente = apps.get_model('clientes', 'Cliente')
    cliente = Cliente.objects.filter(pk=3).first()
    if cliente is None:
        return
    import re
    digitos = re.sub(r'\D', '', cliente.cnpj_cpf or '')
    if digitos != '60939393000125':
        return
    Cliente.objects.filter(pk=3).update(
        tipo_pessoa='PJ', documento='60939393000125', cnpj='60939393000125',
    )


def reverter_documento_cliente(apps, schema_editor):
    Cliente = apps.get_model('clientes', 'Cliente')
    Cliente.objects.filter(pk=3).update(tipo_pessoa='PJ', documento=None, cnpj='')


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0004_socio_cliente'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='cnpj',
            field=models.CharField(blank=True, default='', help_text='Apenas dígitos.', max_length=14, verbose_name='CNPJ'),
        ),
        migrations.AddField(
            model_name='cliente',
            name='cpf',
            field=models.CharField(blank=True, default='', help_text='Apenas dígitos.', max_length=11, verbose_name='CPF'),
        ),
        migrations.AddField(
            model_name='cliente',
            name='documento',
            field=models.CharField(blank=True, help_text='Apenas dígitos (sem máscara). Validado (dígito verificador).', max_length=14, null=True, unique=True, validators=[common.validators.validar_documento], verbose_name='CPF/CNPJ'),
        ),
        migrations.AddField(
            model_name='cliente',
            name='tipo_pessoa',
            field=models.CharField(choices=[('PF', 'Pessoa Física'), ('PJ', 'Pessoa Jurídica')], default='PJ', max_length=2, verbose_name='tipo de pessoa'),
        ),
        migrations.AlterField(
            model_name='sociocliente',
            name='cliente',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='socios', to='clientes.cliente'),
        ),
        migrations.AlterField(
            model_name='sociocliente',
            name='cpf',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name='sociocliente',
            name='email',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AlterField(
            model_name='sociocliente',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
        migrations.AlterField(
            model_name='sociocliente',
            name='nome',
            field=models.CharField(max_length=150),
        ),
        migrations.AlterField(
            model_name='sociocliente',
            name='principal',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='sociocliente',
            name='telefone',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name='sociocliente',
            name='whatsapp',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.RunPython(popular_documento_cliente, reverter_documento_cliente),
    ]
