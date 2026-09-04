import django.db.models.deletion
from django.db import migrations, models


def backfill_nicho(apps, schema_editor):
    Cliente = apps.get_model('clientes', 'Cliente')
    Nicho = apps.get_model('nichos', 'Nicho')
    for cliente in Cliente.objects.all():
        valor = (cliente.segmento or '').strip() or 'Outro'
        nicho = Nicho.objects.filter(nome__iexact=valor).first()
        if not nicho:
            nicho = Nicho.objects.create(nome=valor)
        cliente.nicho = nicho
        cliente.save(update_fields=['nicho'])


def reverter_backfill(apps, schema_editor):
    # AddField(nicho, null=True) no reverso reintroduziria a coluna
    # segmento vazia -- não há como recuperar o texto original a partir
    # do nicho selecionado, então o reverso desta migration é só
    # estrutural (schema), não tenta reconstruir o texto livre antigo.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0005_pessoa_base_cliente'),
        ('nichos', '0002_seed_nichos'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='nicho',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='clientes',
                to='nichos.nicho',
            ),
        ),
        migrations.RunPython(backfill_nicho, reverter_backfill),
        migrations.AlterField(
            model_name='cliente',
            name='nicho',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='clientes',
                to='nichos.nicho',
            ),
        ),
        migrations.RemoveField(
            model_name='cliente',
            name='segmento',
        ),
    ]
