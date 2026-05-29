# Generated manually — Despesa: recorrente + frequencia + quantidade

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0004_add_fornecedor'),
    ]

    operations = [
        migrations.AddField(
            model_name='despesa',
            name='recorrente',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='despesa',
            name='frequencia',
            field=models.CharField(
                blank=True,
                choices=[
                    ('MENSAL', 'Mensal'),
                    ('SEMANAL', 'Semanal'),
                    ('QUINZENAL', 'Quinzenal'),
                    ('ANUAL', 'Anual'),
                ],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='despesa',
            name='quantidade',
            field=models.PositiveIntegerField(default=1),
        ),
    ]
