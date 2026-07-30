"""
Lista manutencoes pendentes de disparo para o Empire Hotfix.
--list: JSON com manutencoes pendentes (feito=False, disparada_em=None, ativo=True)
--mark-dispatched <id>: marca disparada_em=now()
--concluir <id>: marca feito=True
--liberar <id>: reseta disparada_em=None (task falhou/sumiu, permite novo disparo)
--status <id>: JSON {feito, disparada_em, ativo} de uma manutencao especifica
Idempotente — usado pelo script de automacao em /opt/uid-automation.
"""
import json

from django.core.management.base import BaseCommand
from django.utils import timezone

from ordens.models import Manutencao
from notificacoes.models import Notificacao


class Command(BaseCommand):
    help = 'Lista/marca manutencoes pendentes para o Empire Hotfix.'

    def add_arguments(self, parser):
        parser.add_argument('--list', action='store_true', help='JSON das manutencoes pendentes.')
        parser.add_argument('--mark-dispatched', type=int, metavar='ID', help='Marca manutencao como disparada.')
        parser.add_argument('--concluir', type=int, metavar='ID', help='Marca manutencao como concluida.')
        parser.add_argument('--liberar', type=int, metavar='ID', help='Reseta disparada_em (task falhou/sumiu).')
        parser.add_argument('--status', type=int, metavar='ID', help='JSON de status de uma manutencao.')

    def handle(self, *args, **options):
        if options.get('mark_dispatched'):
            m = Manutencao.objects.filter(id=options['mark_dispatched'], ativo=True).first()
            if not m:
                self.stdout.write(self.style.ERROR('Manutencao nao encontrada.'))
                return
            m.disparada_em = timezone.now()
            m.save(update_fields=['disparada_em', 'atualizado_em'])
            self.stdout.write(self.style.SUCCESS(f'Manutencao {m.id} marcada como disparada.'))
            return

        if options.get('concluir'):
            m = Manutencao.objects.filter(id=options['concluir'], ativo=True).first()
            if not m:
                self.stdout.write(self.style.ERROR('Manutencao nao encontrada.'))
                return
            m.feito = True
            m.save(update_fields=['feito', 'atualizado_em'])

            # Fecha o loop com Notificacoes: '--concluir' e o sinal canonico de
            # que a manutencao terminou de verdade (Sentinel validou, Pilot
            # deployou). Ate 30/07/2026 nada resolvia a Notificacao
            # IMPEDIMENTO_ESTEIRA criada quando a delegacao inicial travou —
            # ela ficava pendente pra sempre mesmo com a manutencao concluida
            # com sucesso (achado real: Manutencao #9, UidCore, deploy
            # confirmado em CI/CD e a notificacao ainda 'Pendente').
            resolvidas = Notificacao.objects.filter(
                referencia=f'manutencao:{m.id}', resolvida=False,
            ).update(resolvida=True, resolvida_em=timezone.now())
            if resolvidas:
                self.stdout.write(self.style.SUCCESS(
                    f'{resolvidas} notificacao(oes) IMPEDIMENTO_ESTEIRA resolvida(s) para manutencao:{m.id}.'
                ))

            self.stdout.write(self.style.SUCCESS(f'Manutencao {m.id} marcada como concluida.'))
            return

        if options.get('liberar'):
            m = Manutencao.objects.filter(id=options['liberar'], ativo=True).first()
            if not m:
                self.stdout.write(self.style.ERROR('Manutencao nao encontrada.'))
                return
            m.disparada_em = None
            m.save(update_fields=['disparada_em', 'atualizado_em'])
            self.stdout.write(self.style.SUCCESS(f'Manutencao {m.id} liberada para novo disparo.'))
            return

        if options.get('status'):
            m = Manutencao.objects.filter(id=options['status']).first()
            if not m:
                self.stdout.write(json.dumps({'encontrada': False}))
                return
            self.stdout.write(json.dumps({
                'encontrada': True,
                'feito': m.feito,
                'ativo': m.ativo,
                'disparada_em': m.disparada_em.isoformat() if m.disparada_em else None,
            }))
            return

        if options.get('list'):
            pendentes = (
                Manutencao.objects
                .filter(feito=False, disparada_em__isnull=True, ativo=True)
                .select_related('os', 'os__cliente')
                .order_by('criado_em')
            )
            itens = [
                {
                    'id': m.id,
                    'os_id': m.os_id,
                    'os_titulo': m.os.titulo,
                    'os_cliente': m.os.cliente.nome_empresa,
                    'caminho': m.caminho,
                    'descricao': m.descricao,
                    'criado_em': m.criado_em.isoformat(),
                }
                for m in pendentes
            ]
            self.stdout.write(json.dumps(itens))
            return

        self.stdout.write(self.style.ERROR('Use --list, --mark-dispatched <id>, --concluir <id> ou --liberar <id>.'))
