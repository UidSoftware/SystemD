"""
Cria uma Notificacao tipo IMPEDIMENTO_ESTEIRA de forma idempotente (nao
duplica se ja existe uma pendente com a mesma referencia). Usado pelo
fallback de emergencia do Hotfix/Planner quando a delegacao via Bash
(claude --agent X) falha numa sessao sem interacao humana.
"""
from django.core.management.base import BaseCommand

from notificacoes.models import Notificacao, TipoNotificacao


class Command(BaseCommand):
    help = 'Cria notificacao IMPEDIMENTO_ESTEIRA (idempotente por referencia).'

    def add_arguments(self, parser):
        parser.add_argument('--titulo', required=True)
        parser.add_argument('--descricao', required=True)
        parser.add_argument('--referencia', required=True, help="ex: manutencao:7")
        parser.add_argument('--prioridade', default='ALTA', choices=['BAIXA', 'MEDIA', 'ALTA'])

    def handle(self, *args, **options):
        existe = Notificacao.objects.filter(
            referencia=options['referencia'], resolvida=False,
        ).exists()
        if existe:
            self.stdout.write(self.style.WARNING(
                f"Ja existe notificacao pendente com referencia={options['referencia']} — nao duplicado."
            ))
            return

        notificacao = Notificacao.objects.create(
            tipo=TipoNotificacao.IMPEDIMENTO_ESTEIRA,
            titulo=options['titulo'],
            descricao=options['descricao'],
            prioridade=options['prioridade'],
            perfil_destino='ADMIN',
            referencia=options['referencia'],
        )
        self.stdout.write(self.style.SUCCESS(f'Notificacao {notificacao.id} criada.'))
