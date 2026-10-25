"""
Cria uma Notificacao tipo IMPEDIMENTO_ESTEIRA de forma idempotente (nao
duplica se ja existe uma pendente com a mesma referencia). Usado pelo
fallback de emergencia do Hotfix/Planner quando a delegacao via Bash
(claude --agent X) falha numa sessao sem interacao humana, e pelos
scripts de disparo (/opt/uid-automation/esteira_comum.py) quando desistem
ou pausam (24/10/2026).

--email-para: alem de criar a notificacao, manda e-mail pela conta de
sistema. So manda quando a notificacao e criada de verdade -- se ja
existe uma pendente com a mesma referencia, nao manda de novo (um e-mail
por problema, nao um por tick do cron). Falha de e-mail nunca impede a
notificacao de ser criada.

--resolver: marca como resolvida a notificacao pendente com a referencia
(ex: a conta do Claude voltou a funcionar). --titulo/--descricao nao sao
necessarios nesse modo.
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.html import escape

from notificacoes.models import Notificacao, TipoNotificacao


class Command(BaseCommand):
    help = 'Cria notificacao IMPEDIMENTO_ESTEIRA (idempotente por referencia).'

    def add_arguments(self, parser):
        parser.add_argument('--titulo')
        parser.add_argument('--descricao')
        parser.add_argument('--referencia', required=True, help="ex: manutencao:7")
        parser.add_argument('--prioridade', default='ALTA', choices=['BAIXA', 'MEDIA', 'ALTA'])
        parser.add_argument('--email-para', default='', help="manda e-mail ao criar")
        parser.add_argument('--resolver', action='store_true')

    def handle(self, *args, **options):
        referencia = options['referencia']

        if options['resolver']:
            n = Notificacao.objects.filter(
                referencia=referencia, resolvida=False,
            ).update(resolvida=True, resolvida_em=timezone.now())
            self.stdout.write(f'{n} notificacao(oes) resolvida(s) para referencia={referencia}.')
            return

        if not options['titulo'] or not options['descricao']:
            raise CommandError('--titulo e --descricao sao obrigatorios (exceto com --resolver).')

        existe = Notificacao.objects.filter(
            referencia=referencia, resolvida=False,
        ).exists()
        if existe:
            self.stdout.write(self.style.WARNING(
                f"Ja existe notificacao pendente com referencia={referencia} — nao duplicado."
            ))
            return

        notificacao = Notificacao.objects.create(
            tipo=TipoNotificacao.IMPEDIMENTO_ESTEIRA,
            titulo=options['titulo'],
            descricao=options['descricao'],
            prioridade=options['prioridade'],
            perfil_destino='ADMIN',
            referencia=referencia,
        )
        self.stdout.write(self.style.SUCCESS(f'Notificacao {notificacao.id} criada.'))

        if options['email_para']:
            from email_client.services import enviar_email_sistema
            corpo = (
                f"<p><b>{escape(options['titulo'])}</b></p>"
                f"<p style='white-space:pre-wrap'>{escape(options['descricao'])}</p>"
                f"<p>Ver em SystemD &rarr; Notificações (#{notificacao.id}).</p>"
            )
            try:
                enviar_email_sistema(options['email_para'], f"[Esteira] {options['titulo']}", corpo)
                self.stdout.write(f"E-mail enviado para {options['email_para']}.")
            except Exception as exc:
                self.stderr.write(f"Falha ao enviar e-mail: {exc}")
