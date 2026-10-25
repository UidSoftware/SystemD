"""
Lista Arquiteturas Técnicas prontas para o Planner e marca como
disparadas após a task ser criada no Claw Empire.
Idempotente — usado pelo script de automação em /opt/uid-automation.
"""
import json
import re

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from notificacoes.models import Notificacao, TipoNotificacao
from ordens.models import ArquiteturaTecnica


class Command(BaseCommand):
    help = 'Lista/marca notificações PRONTO_PARA_PLANNER para o Planner.'

    def add_arguments(self, parser):
        parser.add_argument('--list', action='store_true', help='Imprime JSON dos pendentes.')
        parser.add_argument('--mark-done', type=int, help='ID da notificação a marcar como resolvida.')
        parser.add_argument('--status', type=int, metavar='ID', help='JSON de status de uma notificacao.')
        parser.add_argument('--entrevista-md', type=int, metavar='ID',
                            help='Markdown completo (Prospecto + Entrevista + Arquitetura) da notificacao.')

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

        if options.get('status'):
            notificacao = Notificacao.objects.filter(
                id=options['status'], tipo=TipoNotificacao.PRONTO_PARA_PLANNER,
            ).first()
            if not notificacao:
                self.stdout.write(json.dumps({'encontrada': False}))
                return
            self.stdout.write(json.dumps({
                'encontrada': True,
                'resolvida': notificacao.resolvida,
            }))
            return

        if options.get('entrevista_md'):
            notificacao = Notificacao.objects.filter(
                id=options['entrevista_md'], tipo=TipoNotificacao.PRONTO_PARA_PLANNER,
            ).first()
            if not notificacao:
                raise CommandError('Notificação não encontrada.')
            arquitetura = (
                ArquiteturaTecnica.objects
                .select_related('entrevista', 'entrevista__prospecto', 'entrevista__nicho')
                .get(id=notificacao.referencia.split(':')[1])
            )
            self.stdout.write(entrevista_markdown(arquitetura))
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
                    'base_projeto': arquitetura.base_projeto,
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


CAMPOS_IGNORADOS = {'id', 'ativo', 'criado_em', 'atualizado_em', 'entrevista', 'prospecto',
                    'descricao', 'descricao_projeto'}


def _campos(obj):
    linhas = []
    for f in obj._meta.fields:
        if f.name in CAMPOS_IGNORADOS:
            continue
        valor = getattr(obj, f.name)
        if valor in (None, ''):
            continue
        if isinstance(valor, bool):
            valor = 'sim' if valor else 'não'
        valor = str(valor).replace('\n', ' ').replace('|', '/')
        linhas.append(f"| {f.verbose_name} | {valor} |")
    return "| Campo | Valor |\n|---|---|\n" + "\n".join(linhas)


def entrevista_markdown(arquitetura):
    """Requisitos completos do projeto novo, gravados pelo disparar_planner.py
    em docs/entrevista.md do repo (24/10/2026). Antes o Planner recebia so
    resumir_descricao() -- 300 caracteres; no LifeStyle isso era so o titulo
    de um plano de ~10 mil caracteres."""
    e = arquitetura.entrevista
    p = e.prospecto
    partes = [
        f"# Entrevista e Arquitetura Técnica — {arquitetura.projeto}\n",
        "> Gerado automaticamente do SystemD pelo `disparar_planner.py` ao criar o projeto. "
        "É a **fonte de requisitos** do Fluxo 1: ler inteiro antes de qualquer etapa. "
        "Não editar aqui: mudanças vão na Entrevista/Arquitetura do SystemD e este arquivo "
        "é regravado (o histórico do git mostra o que mudou).\n",
        f"Origem: Prospecto #{p.id}, Entrevista #{e.id}, Arquitetura Técnica #{arquitetura.id}.\n",
        f"## Prospecto\n\n{_campos(p)}\n",
    ]
    if getattr(p, 'descricao_projeto', ''):
        partes.append(f"**Descrição do projeto (prospecto):**\n\n{p.descricao_projeto.strip()}\n")
    partes += [
        f"## Entrevista\n\n{_campos(e)}\n",
        f"### Descrição completa\n\n{(e.descricao or '').strip()}\n",
        f"## Arquitetura Técnica\n\n{_campos(arquitetura)}\n",
    ]
    return "\n".join(partes)
