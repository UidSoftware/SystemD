import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ordens', '0004_entrevista_arquitetura_links_nullable'),
        ('prospectos', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='entrevista',
            name='prospecto',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='entrevistas', to='prospectos.prospecto'),
        ),
        migrations.RemoveField(
            model_name='entrevista',
            name='cliente',
        ),
        migrations.AlterField(
            model_name='arquiteturatecnica',
            name='entrevista',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='arquiteturas', to='ordens.entrevista'),
        ),
    ]
