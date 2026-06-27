from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orcamentos', '0002_add_prospecto'),
        ('produtos', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='itemorcamento',
            name='produto',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='itens_orcamento',
                to='produtos.produto',
            ),
        ),
        migrations.AddField(
            model_name='itemorcamento',
            name='unidade',
            field=models.CharField(default='UN', max_length=10),
        ),
    ]
