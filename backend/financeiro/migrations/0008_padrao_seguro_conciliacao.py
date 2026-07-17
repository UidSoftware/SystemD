import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0007_alter_livrocaixa_origem_conciliacaoextrato_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PadraoSeguroConciliacao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('descricao_padrao', models.CharField(max_length=300)),
                ('tipo', models.CharField(choices=[('ENTRADA', 'Entrada'), ('SAIDA', 'Saída')], max_length=10)),
                ('ativo', models.BooleanField(default=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('criado_por', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'fin_padrao_seguro_conciliacao',
                'ordering': ['tipo', 'descricao_padrao'],
            },
        ),
    ]
