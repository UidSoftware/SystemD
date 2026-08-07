"""
Lista manutencoes pendentes de disparo para o Empire Hotfix.
--list: JSON com manutencoes pendentes (feito=False, disparada_em=None, ativo=True)
--mark-dispatched <id>: marca disparada_em=now()
--concluir <id>: marca feito=True
--liberar <id>: reseta disparada_em=None (task falhou/sumiu, permite novo disparo)
--status <id>: JSON {feito, disparada_em, ativo} de uma manutencao especifica

Esteira em fila (ver plano_execucao.md) — comandos por etapa, usados
pelos 6 crons de disparar_etapa.py:
--listar-etapa <etapa>: JSON com manutencoes ativas nessa etapa
--avancar-etapa <id> <etapa_nova>: avanca a coluna do Kanban, zera
    tentativas_etapa (troca de etapa = fresh start de tentativas)
--bloquear <id> <motivo>: etapa=BLOQUEADA + bloqueio_motivo + bloqueada_em
    (substitui a antiga Notificacao IMPEDIMENTO_ESTEIRA — o bloqueio
    agora vive na propria Manutencao, nao numa tabela separada)

Idempotente — usado pelo script de automacao em /opt/uid-automation.
"""
import json

from django.core.management.base import BaseCommand
from django.utils import timezone

from ordens.models import EtapaManutencao, Manutencao
from notificacoes.models import Notificacao


class Command(BaseCommand):
    help = 'Lista/marca manutencoes pendentes para o Empire Hotfix.'

    def add_arguments(self, parser):
        parser.add_argument('--list', action='store_true', help='JSON das manutencoes pendentes.')
        parser.add_argument('--mark-dispatched', type=int, metavar='ID', help='Marca manutencao como disparada.')
        parser.add_argument('--concluir', type=int, metavar='ID', help='Marca manutencao como concluida.')
        parser.add_argument('--liberar', type=int, metavar='ID', help='Reseta disparada_em (task falhou/sumiu).')
        parser.add_argument('--status', type=int, metavar='ID', help='JSON de status de uma manutencao.')
        parser.add_argument('--listar-etapa', type=str, metavar='ETAPA', help='JSON das manutencoes ativas nessa etapa.')
        parser.add_argument('--avancar-etapa', nargs=2, metavar=('ID', 'ETAPA_NOVA'), help='Avanca a etapa da manutencao.')
        parser.add_argument('--bloquear', nargs=2, metavar=('ID', 'MOTIVO'), help='Bloqueia a manutencao (precisa de decisao humana).')
        parser.add_argument('--incrementar-tentativa', type=int, metavar='ID', help='Incrementa tentativas_etapa (falha real na etapa atual, sem trocar de etapa).')

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
                'etapa': m.etapa,
                'tentativas_etapa': m.tentativas_etapa,
                'ativo': m.ativo,
                'disparada_em': m.disparada_em.isoformat() if m.disparada_em else None,
            }))
            return

        if options.get('listar_etapa'):
            etapa = options['listar_etapa']
            validas = {c[0] for c in EtapaManutencao.choices}
            if etapa not in validas:
                self.stdout.write(json.dumps({'erro': f'etapa invalida: {etapa}', 'validas': sorted(validas)}))
                return
            itens_etapa = (
                Manutencao.objects
                .filter(etapa=etapa, ativo=True)
                .select_related('os', 'os__cliente')
                .order_by('etapa_atualizada_em')
            )
            itens = [
                {
                    'id': m.id,
                    'os_id': m.os_id,
                    'os_titulo': m.os.titulo,
                    'os_cliente': m.os.cliente.nome_empresa,
                    'caminho': m.caminho,
                    'descricao': m.descricao,
                    'etapa': m.etapa,
                    'etapa_atualizada_em': m.etapa_atualizada_em.isoformat(),
                    'tentativas_etapa': m.tentativas_etapa,
                    'criado_em': m.criado_em.isoformat(),
                }
                for m in itens_etapa
            ]
            self.stdout.write(json.dumps(itens))
            return

        if options.get('avancar_etapa'):
            id_str, etapa_nova = options['avancar_etapa']
            m = Manutencao.objects.filter(id=int(id_str), ativo=True).first()
            if not m:
                self.stdout.write(self.style.ERROR('Manutencao nao encontrada.'))
                return
            validas = {c[0] for c in EtapaManutencao.choices}
            if etapa_nova not in validas:
                self.stdout.write(self.style.ERROR(f'Etapa invalida: {etapa_nova}. Validas: {sorted(validas)}'))
                return
            etapa_anterior = m.etapa
            m.etapa = etapa_nova
            m.tentativas_etapa = 0  # troca de etapa = fresh start de tentativas
            # DEPLOYADO fecha o loop igual --concluir ja fazia (feito=True +
            # resolve Notificacao antiga por compatibilidade).
            update_fields = ['etapa', 'tentativas_etapa', 'etapa_atualizada_em', 'atualizado_em']
            if etapa_nova == EtapaManutencao.DEPLOYADO:
                m.feito = True
                update_fields.append('feito')
            m.save(update_fields=update_fields)

            if etapa_nova == EtapaManutencao.DEPLOYADO:
                resolvidas = Notificacao.objects.filter(
                    referencia=f'manutencao:{m.id}', resolvida=False,
                ).update(resolvida=True, resolvida_em=timezone.now())
                if resolvidas:
                    self.stdout.write(self.style.SUCCESS(
                        f'{resolvidas} notificacao(oes) IMPEDIMENTO_ESTEIRA resolvida(s) para manutencao:{m.id}.'
                    ))

            self.stdout.write(self.style.SUCCESS(
                f'Manutencao {m.id}: {etapa_anterior} -> {etapa_nova}.'
            ))
            return

        if options.get('bloquear'):
            id_str, motivo = options['bloquear']
            m = Manutencao.objects.filter(id=int(id_str), ativo=True).first()
            if not m:
                self.stdout.write(self.style.ERROR('Manutencao nao encontrada.'))
                return
            m.etapa = EtapaManutencao.BLOQUEADA
            m.bloqueio_motivo = motivo
            m.bloqueada_em = timezone.now()
            m.save(update_fields=['etapa', 'bloqueio_motivo', 'bloqueada_em', 'etapa_atualizada_em', 'atualizado_em'])
            self.stdout.write(self.style.SUCCESS(f'Manutencao {m.id} bloqueada: {motivo}'))
            return

        if options.get('incrementar_tentativa'):
            m = Manutencao.objects.filter(id=options['incrementar_tentativa'], ativo=True).first()
            if not m:
                self.stdout.write(self.style.ERROR('Manutencao nao encontrada.'))
                return
            m.tentativas_etapa += 1
            m.save(update_fields=['tentativas_etapa', 'atualizado_em'])
            self.stdout.write(json.dumps({'id': m.id, 'etapa': m.etapa, 'tentativas_etapa': m.tentativas_etapa}))
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
