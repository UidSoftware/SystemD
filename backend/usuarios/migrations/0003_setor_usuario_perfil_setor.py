from django.db import migrations, models
import django.db.models.deletion


def set_admin_perfil(apps, schema_editor):
    Usuario = apps.get_model('usuarios', 'Usuario')
    Usuario.objects.all().update(perfil='ADMIN')


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0002_usuarioemailconfig'),
    ]

    operations = [
        migrations.CreateModel(
            name='Setor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=100)),
                ('descricao', models.CharField(blank=True, max_length=255)),
                ('ativo', models.BooleanField(default=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Setor',
                'verbose_name_plural': 'Setores',
                'ordering': ['nome'],
            },
        ),
        migrations.AddField(
            model_name='usuario',
            name='perfil',
            field=models.CharField(
                choices=[('ADMIN', 'Administrador'), ('FINANCEIRO', 'Financeiro'), ('OPERACIONAL', 'Operacional'), ('CLIENTE', 'Cliente')],
                default='OPERACIONAL',
                max_length=20,
            ),
        ),
        migrations.RunPython(set_admin_perfil, migrations.RunPython.noop),
        migrations.AddField(
            model_name='usuario',
            name='setor',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='usuarios',
                to='usuarios.setor',
            ),
        ),
    ]
