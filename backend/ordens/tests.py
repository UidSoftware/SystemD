from datetime import date
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from clientes.models import Cliente
from notificacoes.models import Notificacao, TipoNotificacao
from prospectos.models import Prospecto
from usuarios.models import Usuario
from nichos.models import Nicho

from .models import ArquiteturaTecnica, Entrevista, FaseOS, Manutencao, OS
from .relatorio_pdf import gerar_relatorio_sistema_pdf


def criar_arquitetura(**kwargs):
    usuario = Usuario.objects.create_user(
        email='resp@uid.com', nome='Responsavel', password='s', perfil='ADMIN'
    )
    prospecto = Prospecto.objects.create(
        nome_empresa='Empresa Teste',
        origem='manual',
        responsavel=usuario,
    )
    entrevista = Entrevista.objects.create(
        prospecto=prospecto,
        sistema='Sistema Teste',
        descricao='Descrição',
        cores_empresa='#000000',
        nicho=Nicho.objects.create(nome='Outro Teste'),
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


# ── Manutencao #68 — Relatorio PDF do sistema + envio por email ─────

def criar_os(titulo='Sistema Teste', nome_empresa='Empresa Teste'):
    nicho, _ = Nicho.objects.get_or_create(nome=f'Nicho {nome_empresa}')
    cliente = Cliente.objects.create(
        nome_empresa=nome_empresa,
        nicho=nicho,
        origem='manual',
    )
    return OS.objects.create(cliente=cliente, titulo=titulo)


class RelatorioSistemaPdfTest(TestCase):
    """RF01/RF05 — geracao do PDF a partir de consulta real ao banco."""

    def test_pdf_gerado_tem_bytes_nao_vazios_e_conteudo_minimo(self):
        os_obj = criar_os(titulo='Studio Fluir', nome_empresa='Studio Fluir')
        FaseOS.objects.create(os=os_obj, fase='LEAD', descricao='Primeiro contato')
        Manutencao.objects.create(os=os_obj, descricao='Fix de ciclo', feito=True, etapa='DEPLOYADO')
        Manutencao.objects.create(os=os_obj, descricao='Bug pendente', etapa='BACKEND_PRONTO')

        pdf_bytes = gerar_relatorio_sistema_pdf(os_obj)

        self.assertIsInstance(pdf_bytes, bytes)
        self.assertGreater(len(pdf_bytes), 0)
        self.assertTrue(pdf_bytes.startswith(b'%PDF'))

    def test_pdf_gerado_sem_fases_manutencoes_ou_artefatos_nao_quebra(self):
        os_obj = criar_os()
        pdf_bytes = gerar_relatorio_sistema_pdf(os_obj)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertGreater(len(pdf_bytes), 0)

    def test_pdf_reflete_manutencao_bloqueada_com_motivo(self):
        os_obj = criar_os()
        Manutencao.objects.create(
            os=os_obj, descricao='Aguardando aprovacao', etapa='BLOQUEADA',
            bloqueio_motivo='Aguardando reunião com o cliente',
        )
        # Nao levanta excecao -- cobre o branch de bloqueio_motivo no PDF.
        pdf_bytes = gerar_relatorio_sistema_pdf(os_obj)
        self.assertGreater(len(pdf_bytes), 0)


class RelatorioStudioFluirCommandTest(TestCase):
    """RF06/RN08 — resolucao dinamica da OS (0, 1, >1 resultados)."""

    def test_abort_quando_nenhuma_os_encontrada(self):
        out = StringIO()
        with self.assertRaises(CommandError):
            call_command('relatorio_studio_fluir', '--dry-run', stdout=out)

    def test_dry_run_salva_pdf_quando_exatamente_uma_os_encontrada(self):
        criar_os(titulo='Studio Fluir — Pilates', nome_empresa='Studio Fluir')
        out = StringIO()
        call_command('relatorio_studio_fluir', '--dry-run', stdout=out)
        saida = out.getvalue()
        self.assertIn('OS resolvida', saida)
        self.assertIn('[dry-run]', saida)
        self.assertIn('email NAO enviado', saida)

    def test_abort_quando_mais_de_uma_os_encontrada(self):
        criar_os(titulo='Studio Fluir A', nome_empresa='Studio Fluir')
        criar_os(titulo='Studio Fluir B', nome_empresa='Studio Fluir')
        out = StringIO()
        with self.assertRaises(CommandError) as ctx:
            call_command('relatorio_studio_fluir', '--dry-run', stdout=out)
        self.assertIn('Mais de uma OS encontrada', str(ctx.exception))

    def test_os_id_explicito_pula_a_busca_por_nome(self):
        os_obj = criar_os(titulo='Sistema Qualquer', nome_empresa='Qualquer')
        out = StringIO()
        call_command('relatorio_studio_fluir', '--dry-run', f'--os-id={os_obj.pk}', stdout=out)
        self.assertIn(f'#{os_obj.pk}', out.getvalue())

    def test_os_id_inexistente_aborta_com_mensagem_clara(self):
        out = StringIO()
        with self.assertRaises(CommandError) as ctx:
            call_command('relatorio_studio_fluir', '--dry-run', '--os-id=999999', stdout=out)
        self.assertIn('Nenhuma OS encontrada', str(ctx.exception))

    def test_falha_de_envio_de_email_propaga_commanderror_sem_vazar_senha(self):
        """RN06/RN07 — falha de SMTP (sem --dry-run) deve virar CommandError
        com a mensagem original, nunca falhar silenciosamente nem expor
        credencial."""
        from unittest.mock import patch

        os_obj = criar_os(titulo='Studio Fluir', nome_empresa='Studio Fluir')
        out = StringIO()
        with patch(
            'email_client.services.enviar_email_sistema',
            side_effect=Exception('SMTP indisponível'),
        ):
            with self.assertRaises(CommandError) as ctx:
                call_command('relatorio_studio_fluir', f'--os-id={os_obj.pk}', stdout=out)
        self.assertIn('Erro ao enviar email', str(ctx.exception))
        self.assertIn('SMTP indisponível', str(ctx.exception))
        self.assertNotIn('senha', str(ctx.exception).lower())
