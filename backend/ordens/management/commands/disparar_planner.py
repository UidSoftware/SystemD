"""
Lista Arquiteturas Técnicas prontas para o Planner e marca como
disparadas após a task ser criada no Claw Empire.
Idempotente — usado pelo script de automação em /opt/uid-automation.
"""
import json
import re

from django.core.management.base import BaseCommand
from django.utils import timezone

from notificacoes.models import Notificacao, TipoNotificacao
from ordens.models import ArquiteturaTecnica


class Command(BaseCommand):
    help = 'Lista/marca notificações PRONTO_PARA_PLANNER para o Planner.'

    def add_arguments(self, parser):
        parser.add_argument('--list', action='store_true', help='Imprime JSON dos pendentes.')
        parser.add_argument('--mark-done', type=int, help='ID da notificação a marcar como resolvida.')

    def handle(self, *args, **options):
        if options.get('mark_done'):
            notificacao = Notificacao.objects.filter(
                id=options['mark_done'],
                tipo=TipoNotificacao.PRONTO_PARA_PLANNER,
            ).first()
            if not notificacao:
                self.stdout.write(self.style.ERROR('Notificação não encontrada.'))
                return
            notificacao.resolvida = True
            notificacao.resolvida_em = timezone.now()
            notificacao.save()
            self.stdout.write(self.style.SUCCESS(f'Notificação {notificacao.id} marcada como resolvida.'))
            return

        if options.get('list'):
            pendentes = (
                Notificacao.objects
                .filter(tipo=TipoNotificacao.PRONTO_PARA_PLANNER, resolvida=False)
                .select_related('atribuido_a')
            )

            itens = []
            for notificacao in pendentes:
                arquitetura_id = notificacao.referencia.split(':')[1]
                arquitetura = (
                    ArquiteturaTecnica.objects
                    .select_related('entrevista', 'entrevista__prospecto')
                    .get(id=arquitetura_id)
                )
                itens.append({
                    'notificacao_id': notificacao.id,
                    'arquitetura_id': arquitetura.id,
                    'projeto': arquitetura.projeto,
                    'entrevista_sistema': arquitetura.entrevista.sistema,
                    'prospecto_nome': arquitetura.entrevista.prospecto.nome_empresa,
                    'core_goal': resumir_descricao(arquitetura.entrevista.descricao),
                })

            self.stdout.write(json.dumps(itens))
            return

        self.stdout.write(self.style.ERROR('Use --list ou --mark-done <id>.'))


def resumir_descricao(descricao, limite=300):
    """Extrai um resumo curto (1 paragrafo) da descricao livre da Entrevista para
    usar como core_goal do projeto no Claw Empire."""
    if not descricao:
        return ''
    texto = descricao.strip()
    texto = re.sub(r'^VIS[ÃA]O GERAL\s*\n+', '', texto, flags=re.IGNORECASE)
    paragrafo = texto.split(chr(10) + chr(10))[0].replace(chr(10), ' ').strip()
    if len(paragrafo) > limite:
        paragrafo = paragrafo[:limite].rsplit(' ', 1)[0] + '...'
    return paragrafo
