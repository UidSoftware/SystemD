from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orcamentos', '0001_initial'),
        ('prospectos', '0002_socio_prospecto'),
    ]

    operations = [
        migrations.AddField(
            model_name='orcamento',
            name='prospecto',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='orcamentos',
                to='prospectos.prospecto',
            ),
        ),
    ]
