import django.db.models.deletion
from django.db import migrations, models

# Congelado aqui porque o enum SegmentoEntrevista foi removido de
# ordens/models.py (virou a tabela nichos.Nicho) -- migrations nunca
# devem importar o estado atual dos models de verdade.
SEGMENTO_LABELS = {
    'SAUDE': 'Saúde / Bem-estar',
    'BELEZA': 'Beleza',
    'VAREJO': 'Varejo',
    'ALIMENTACAO': 'Alimentação',
    'SERVICOS': 'Serviços',
    'EDUCACAO': 'Educação',
    'OUTRO': 'Outro',
}


def backfill_nicho(apps, schema_editor):
    Entrevista = apps.get_model('ordens', 'Entrevista')
    Nicho = apps.get_model('nichos', 'Nicho')
    for entrevista in Entrevista.objects.all():
        label = SEGMENTO_LABELS.get(entrevista.segmento, entrevista.segmento or 'Outro')
        nicho = Nicho.objects.filter(nome__iexact=label).first()
        if not nicho:
            nicho = Nicho.objects.create(nome=label)
        entrevista.nicho = nicho
        entrevista.save(update_fields=['nicho'])


def reverter_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('ordens', '0012_alter_manutencao_help_text'),
        ('nichos', '0002_seed_nichos'),
    ]

    operations = [
        migrations.AddField(
            model_name='entrevista',
            name='nicho',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='entrevistas',
                to='nichos.nicho',
            ),
        ),
        migrations.RunPython(backfill_nicho, reverter_backfill),
        migrations.AlterField(
            model_name='entrevista',
            name='nicho',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='entrevistas',
                to='nichos.nicho',
            ),
        ),
        migrations.RemoveField(
            model_name='entrevista',
            name='segmento',
        ),
    ]
