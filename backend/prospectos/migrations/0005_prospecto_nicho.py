import django.db.models.deletion
from django.db import migrations, models


def backfill_nicho(apps, schema_editor):
    Prospecto = apps.get_model('prospectos', 'Prospecto')
    Nicho = apps.get_model('nichos', 'Nicho')
    for prospecto in Prospecto.objects.all():
        valor = (prospecto.segmento or '').strip()
        if not valor:
            continue
        nicho = Nicho.objects.filter(nome__iexact=valor).first()
        if not nicho:
            nicho = Nicho.objects.create(nome=valor)
        prospecto.nicho = nicho
        prospecto.save(update_fields=['nicho'])


def reverter_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('prospectos', '0004_prospecto_descricao_projeto'),
        ('nichos', '0002_seed_nichos'),
    ]

    operations = [
        migrations.AddField(
            model_name='prospecto',
            name='nicho',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='prospectos',
                to='nichos.nicho',
            ),
        ),
        migrations.RunPython(backfill_nicho, reverter_backfill),
        migrations.RemoveField(
            model_name='prospecto',
            name='segmento',
        ),
    ]
