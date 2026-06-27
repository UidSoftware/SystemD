from django.db import migrations, models
import django.db.models.deletion


def migrar_socios_cliente(apps, schema_editor):
    Cliente = apps.get_model('clientes', 'Cliente')
    SocioCliente = apps.get_model('clientes', 'SocioCliente')
    for c in Cliente.objects.using(schema_editor.connection.alias).all():
        nome = getattr(c, 'nome_contato', '') or ''
        email = getattr(c, 'email', '') or ''
        telefone = getattr(c, 'telefone', '') or ''
        whatsapp = getattr(c, 'whatsapp', '') or ''
        if nome or email:
            SocioCliente.objects.using(schema_editor.connection.alias).create(
                cliente=c,
                nome=nome,
                email=email,
                telefone=telefone,
                whatsapp=whatsapp,
                cpf='',
                principal=True,
            )


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0003_cliente_tem_entregas'),
    ]

    operations = [
        migrations.CreateModel(
            name='SocioCliente',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=150, verbose_name='Nome')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='Email')),
                ('telefone', models.CharField(blank=True, max_length=20, verbose_name='Telefone')),
                ('whatsapp', models.CharField(blank=True, max_length=20, verbose_name='WhatsApp')),
                ('cpf', models.CharField(blank=True, max_length=20, verbose_name='CPF')),
                ('principal', models.BooleanField(default=False, verbose_name='Principal')),
                ('cliente', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='socios', to='clientes.cliente', verbose_name='Cliente')),
            ],
            options={
                'verbose_name': 'Sócio do Cliente',
                'verbose_name_plural': 'Sócios do Cliente',
                'ordering': ['-principal', 'nome'],
            },
        ),
        migrations.RunPython(migrar_socios_cliente, migrations.RunPython.noop),
        migrations.RemoveField(model_name='cliente', name='nome_contato'),
        migrations.RemoveField(model_name='cliente', name='email'),
        migrations.RemoveField(model_name='cliente', name='telefone'),
        migrations.RemoveField(model_name='cliente', name='whatsapp'),
    ]
