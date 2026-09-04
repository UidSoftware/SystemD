from django.db import migrations

# Mesmo conjunto que já era usado como choices fixo em Entrevista.segmento
# (SegmentoEntrevista) -- vira o ponto de partida da tabela única.
NICHOS_CANONICOS = [
    'Saúde / Bem-estar',
    'Beleza',
    'Varejo',
    'Alimentação',
    'Serviços',
    'Educação',
    'Outro',
]


def seed(apps, schema_editor):
    Nicho = apps.get_model('nichos', 'Nicho')
    for nome in NICHOS_CANONICOS:
        Nicho.objects.get_or_create(nome=nome)


def remover_seed(apps, schema_editor):
    Nicho = apps.get_model('nichos', 'Nicho')
    Nicho.objects.filter(nome__in=NICHOS_CANONICOS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('nichos', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, remover_seed),
    ]
