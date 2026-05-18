from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    Adiciona Unidade + novos campos (solicitante, motoboy, de, para, unidade)
    e remove origem/destino. Campos FK são nullable para preservar dados existentes.
    """

    dependencies = [
        ('entregas', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Unidade',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=200, unique=True)),
                ('ativo', models.BooleanField(default=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Unidade',
                'verbose_name_plural': 'Unidades',
                'ordering': ['nome'],
            },
        ),
        migrations.AddField(
            model_name='entrega',
            name='solicitante',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='entrega',
            name='motoboy',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='entrega',
            name='unidade',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='entregas_unidade', to='entregas.unidade'),
        ),
        migrations.AddField(
            model_name='entrega',
            name='de',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='entregas_de', to='entregas.unidade'),
        ),
        migrations.AddField(
            model_name='entrega',
            name='para',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='entregas_para', to='entregas.unidade'),
        ),
        migrations.RemoveField(
            model_name='entrega',
            name='origem',
        ),
        migrations.RemoveField(
            model_name='entrega',
            name='destino',
        ),
    ]
