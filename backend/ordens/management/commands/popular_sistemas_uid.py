"""
Semeie os OS records dos sistemas internos da Uid no banco.
Idempotente: usa get_or_create — pode ser rodado mais de uma vez sem efeito colateral.
"""
from django.core.management.base import BaseCommand

from clientes.models import Cliente
from ordens.models import OS, StatusOS


SISTEMAS_UID = [
    {
        'titulo':           'SystemD',
        'url':              'https://uidsoftware.com.br',
        'caminho_servidor': '/root/SystemD',
    },
    {
        'titulo':           'Uid Office',
        'url':              'https://office.uidsoftware.com.br',
        'caminho_servidor': '/opt/uid-office',
    },
    {
        'titulo':           'Claw Empire',
        'url':              'https://empire.uidsoftware.com.br',
        'caminho_servidor': '/opt/claw-empire',
    },
    {
        'titulo':           'Studio Fluir',
        'url':              '',
        'caminho_servidor': '/var/www/studio-fluir',
    },
    {
        'titulo':           'ContratId',
        'url':              '',
        'caminho_servidor': '/var/www/contratid',
    },
    {
        'titulo':           'UidMail',
        'url':              '',
        'caminho_servidor': '/opt/uidmail',
    },
]


class Command(BaseCommand):
    help = 'Cria/atualiza OS records dos sistemas internos da Uid (idempotente).'

    def handle(self, *args, **options):
        cliente_uid = Cliente.objects.filter(nome_empresa__icontains='uid').first()
        if not cliente_uid:
            self.stdout.write(self.style.ERROR(
                'Cliente "Uid" nao encontrado. Crie o cliente primeiro.'
            ))
            return

        for sistema in SISTEMAS_UID:
            os_obj, criado = OS.objects.get_or_create(
                titulo=sistema['titulo'],
                cliente=cliente_uid,
                defaults={
                    'status':           StatusOS.MANUTENCAO,
                    'caminho_servidor': sistema['caminho_servidor'],
                    'url':              sistema['url'],
                    'descricao':        f"Sistema interno Uid — {sistema['titulo']}",
                    'ativo':            True,
                },
            )
            if not criado:
                # Atualiza caminho e url se mudou
                atualizado = False
                if not os_obj.caminho_servidor and sistema['caminho_servidor']:
                    os_obj.caminho_servidor = sistema['caminho_servidor']
                    atualizado = True
                if not os_obj.url and sistema['url']:
                    os_obj.url = sistema['url']
                    atualizado = True
                if atualizado:
                    os_obj.save(update_fields=['caminho_servidor', 'url', 'atualizado_em'])

            status = 'CRIADO' if criado else 'ja existe'
            self.stdout.write(f"  {sistema['titulo']}: {status}")

        self.stdout.write(self.style.SUCCESS('Sistemas Uid populados com sucesso.'))
