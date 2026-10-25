"""
Resumo diario do que esta PARADO na esteira (criado 24/10/2026).

Motivo: o LifeStyle (notificacao #24) ficou 3 dias parado sem ninguem
saber -- o cron desistiu e so escreveu num log. Este comando roda 1x por
dia (cron na VPS) e manda e-mail SO se houver algo parado ha mais de
--horas (padrao 24h). Dia sem problema = nenhum e-mail.

Considera parado:
  - Notificacao IMPEDIMENTO_ESTEIRA / PRONTO_PARA_PLANNER nao resolvida
  - Manutencao ativa com feito=False
criadas ha mais de --horas.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.html import escape

from notificacoes.models import Notificacao, TipoNotificacao
from ordens.models import Manutencao


class Command(BaseCommand):
    help = 'Manda e-mail com o que esta parado na esteira ha mais de N horas.'

    def add_arguments(self, parser):
        parser.add_argument('--horas', type=int, default=24)
        parser.add_argument('--email-para', default='luizeduardo@uidsoftware.com.br')
        parser.add_argument('--dry-run', action='store_true', help='so imprime, nao manda e-mail')

    def handle(self, *args, **options):
        limite = timezone.now() - timedelta(hours=options['horas'])
        agora = timezone.now()

        def idade(dt):
            horas = int((agora - dt).total_seconds() // 3600)
            return f"{horas // 24}d {horas % 24}h" if horas >= 24 else f"{horas}h"

        itens = []
        notifs = Notificacao.objects.filter(
            ativo=True, resolvida=False, criado_em__lt=limite,
            tipo__in=[TipoNotificacao.IMPEDIMENTO_ESTEIRA, TipoNotificacao.PRONTO_PARA_PLANNER],
        ).order_by('criado_em')
        for n in notifs:
            itens.append(f"Notificação #{n.id} — {n.titulo} (parada há {idade(n.criado_em)})")

        mans = Manutencao.objects.filter(
            ativo=True, feito=False, criado_em__lt=limite,
        ).select_related('os').order_by('criado_em')
        for m in mans:
            desc = (m.descricao or '').strip().splitlines()[0][:90] if m.descricao else ''
            itens.append(
                f"Manutenção #{m.id} ({m.os}) — etapa {m.etapa or '-'} — {desc} "
                f"(aberta há {idade(m.criado_em)})"
            )

        if not itens:
            self.stdout.write('Nada parado. Nenhum e-mail enviado.')
            return

        texto = '\n'.join(f'- {i}' for i in itens)
        self.stdout.write(texto)
        if options['dry_run']:
            self.stdout.write('(dry-run: e-mail nao enviado)')
            return

        from email_client.services import enviar_email_sistema
        corpo = (
            f"<p><b>{len(itens)} item(ns) parado(s) na esteira há mais de {options['horas']}h:</b></p>"
            "<ul>" + ''.join(f"<li>{escape(i)}</li>" for i in itens) + "</ul>"
            "<p>Detalhes em SystemD &rarr; Notificações / Manutenções.</p>"
        )
        enviar_email_sistema(
            options['email_para'],
            f"[Esteira] {len(itens)} item(ns) parado(s)",
            corpo,
        )
        self.stdout.write(f"E-mail enviado para {options['email_para']}.")
