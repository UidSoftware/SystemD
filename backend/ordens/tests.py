from datetime import date

from django.test import TestCase

from notificacoes.models import Notificacao, TipoNotificacao
from prospectos.models import Prospecto
from usuarios.models import Usuario

from .models import ArquiteturaTecnica, Entrevista


def criar_arquitetura(**kwargs):
    usuario = Usuario.objects.create_user(
        email='resp@uid.com', nome='Responsavel', password='s', perfil='ADMIN'
    )
    prospecto = Prospecto.objects.create(
        nome_empresa='Empresa Teste',
        nome_contato='Contato',
        email='contato@empresa.com',
        origem='manual',
        responsavel=usuario,
    )
    entrevista = Entrevista.objects.create(
        prospecto=prospecto,
        sistema='Sistema Teste',
        descricao='Descrição',
        cores_empresa='#000000',
        segmento='OUTRO',
        orcamento_faixa='PEQUENO',
    )
    defaults = dict(
        entrevista=entrevista,
        projeto='Projeto Teste',
        cliente='Cliente Teste',
        data_levantamento=date.today(),
    )
    defaults.update(kwargs)
    return ArquiteturaTecnica.objects.create(**defaults)


class ArquiteturaDisparaPlannerTest(TestCase):

    def test_cria_notificacao_pronto_para_planner(self):
        arquitetura = criar_arquitetura()
        notificacao = Notificacao.objects.get(
            tipo=TipoNotificacao.PRONTO_PARA_PLANNER,
            referencia=f'arquitetura_tecnica:{arquitetura.id}:planner',
        )
        self.assertFalse(notificacao.resolvida)
        self.assertEqual(notificacao.perfil_destino, 'ADMIN')

    def test_salvar_novamente_nao_duplica_notificacao(self):
        arquitetura = criar_arquitetura()
        arquitetura.notas_claude = 'Atualizado'
        arquitetura.save()
        self.assertEqual(
            Notificacao.objects.filter(tipo=TipoNotificacao.PRONTO_PARA_PLANNER).count(),
            1,
        )

    def test_stack_fora_do_padrao_bloqueia_disparo(self):
        criar_arquitetura(linguagem='Node.js')
        self.assertFalse(
            Notificacao.objects.filter(tipo=TipoNotificacao.PRONTO_PARA_PLANNER).exists()
        )
        self.assertTrue(
            Notificacao.objects.filter(
                tipo=TipoNotificacao.STACK_FORA_PADRAO,
                resolvida=False,
            ).exists()
        )

    def test_resolver_divergencia_permite_disparo_na_proxima_save(self):
        arquitetura = criar_arquitetura(linguagem='Node.js')
        arquitetura.linguagem = 'Python'
        arquitetura.save()
        self.assertTrue(
            Notificacao.objects.filter(
                tipo=TipoNotificacao.PRONTO_PARA_PLANNER,
                referencia=f'arquitetura_tecnica:{arquitetura.id}:planner',
            ).exists()
        )
