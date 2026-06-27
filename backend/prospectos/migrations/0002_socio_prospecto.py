from django.db import migrations, models
import django.db.models.deletion


def migrar_socios_prospecto(apps, schema_editor):
    Prospecto = apps.get_model('prospectos', 'Prospecto')
    SocioProspecto = apps.get_model('prospectos', 'SocioProspecto')
    for p in Prospecto.objects.using(schema_editor.connection.alias).all():
        nome = getattr(p, 'nome_contato', '') or ''
        email = getattr(p, 'email', '') or ''
        telefone = getattr(p, 'telefone', '') or ''
        whatsapp = getattr(p, 'whatsapp', '') or ''
        if nome or email:
            SocioProspecto.objects.using(schema_editor.connection.alias).create(
                prospecto=p,
                nome=nome,
                email=email,
                telefone=telefone,
                whatsapp=whatsapp,
                cpf='',
                principal=True,
            )


class Migration(migrations.Migration):

    dependencies = [
        ('prospectos', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SocioProspecto',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=150, verbose_name='Nome')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='Email')),
                ('telefone', models.CharField(blank=True, max_length=20, verbose_name='Telefone')),
                ('whatsapp', models.CharField(blank=True, max_length=20, verbose_name='WhatsApp')),
                ('cpf', models.CharField(blank=True, max_length=20, verbose_name='CPF')),
                ('principal', models.BooleanField(default=False, verbose_name='Principal')),
                ('prospecto', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='socios', to='prospectos.prospecto', verbose_name='Prospecto')),
            ],
            options={
                'verbose_name': 'Sócio do Prospecto',
                'verbose_name_plural': 'Sócios do Prospecto',
                'ordering': ['-principal', 'nome'],
            },
        ),
        migrations.RunPython(migrar_socios_prospecto, migrations.RunPython.noop),
        migrations.RemoveField(model_name='prospecto', name='nome_contato'),
        migrations.RemoveField(model_name='prospecto', name='email'),
        migrations.RemoveField(model_name='prospecto', name='telefone'),
        migrations.RemoveField(model_name='prospecto', name='whatsapp'),
    ]
