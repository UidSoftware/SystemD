"""
Testes de email_client/services.py -- primeira suite deste app
(confirmado antes da Manutencao #68: nao havia tests.py aqui).

Cobre a extensao aditiva de anexo (RN05) em enviar_email/
enviar_email_sistema -- sem bater em servidor SMTP real (mock de
smtplib.SMTP), e confirma que as chamadas existentes (sem anexos)
continuam funcionando identicas a antes.
"""
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from .services import enviar_email, enviar_email_sistema


@override_settings(SMTP_HOST='smtp.teste.local', SMTP_PORT='587')
class EnviarEmailTest(TestCase):

    @patch('email_client.services.smtplib.SMTP')
    def test_enviar_email_sem_anexo_mantem_comportamento_atual(self, mock_smtp_cls):
        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        resultado = enviar_email(
            'contato@uidsoftware.com.br', 'senha123', 'destino@teste.com',
            'Assunto', 'Corpo texto', corpo_html='<p>Corpo html</p>',
        )

        self.assertEqual(resultado, {'status': 'enviado'})
        mock_server.login.assert_called_once_with('contato@uidsoftware.com.br', 'senha123')
        mock_server.sendmail.assert_called_once()
        destinatarios_enviados = mock_server.sendmail.call_args[0][1]
        self.assertEqual(destinatarios_enviados, ['destino@teste.com'])
        corpo_enviado = mock_server.sendmail.call_args[0][2]
        self.assertIn('Content-Type: multipart/alternative', corpo_enviado)
        self.assertNotIn('Content-Disposition: attachment', corpo_enviado)

    @patch('email_client.services.smtplib.SMTP')
    def test_enviar_email_com_anexo_usa_multipart_mixed(self, mock_smtp_cls):
        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        pdf_bytes = b'%PDF-1.4 conteudo falso de teste'
        resultado = enviar_email(
            'contato@uidsoftware.com.br', 'senha123', 'destino@teste.com',
            'Assunto com anexo', 'Corpo texto', corpo_html='<p>Corpo html</p>',
            anexos=[('relatorio.pdf', pdf_bytes, 'application/pdf')],
        )

        self.assertEqual(resultado, {'status': 'enviado'})
        corpo_enviado = mock_server.sendmail.call_args[0][2]
        self.assertIn('Content-Type: multipart/mixed', corpo_enviado)
        self.assertIn('Content-Disposition: attachment; filename="relatorio.pdf"', corpo_enviado)
        # Texto + HTML continuam presentes (dentro da sub-parte alternative,
        # codificados em base64 pelo MIMEText -- decodifica via email parser
        # em vez de buscar texto puro na string raw).
        import email as email_lib
        msg_parseada = email_lib.message_from_string(corpo_enviado)
        partes_html = [
            p.get_payload(decode=True).decode('utf-8')
            for p in msg_parseada.walk() if p.get_content_type() == 'text/html'
        ]
        self.assertIn('Corpo html', ' '.join(partes_html))

    @patch('email_client.services.smtplib.SMTP')
    def test_enviar_email_com_multiplos_anexos(self, mock_smtp_cls):
        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        resultado = enviar_email(
            'contato@uidsoftware.com.br', 'senha123', 'destino@teste.com',
            'Assunto', 'Corpo',
            anexos=[
                ('a.pdf', b'conteudo-a', 'application/pdf'),
                ('b.txt', b'conteudo-b', 'text/plain'),
            ],
        )
        self.assertEqual(resultado, {'status': 'enviado'})
        corpo_enviado = mock_server.sendmail.call_args[0][2]
        self.assertIn('filename="a.pdf"', corpo_enviado)
        self.assertIn('filename="b.txt"', corpo_enviado)

    @patch('email_client.services.smtplib.SMTP')
    def test_falha_smtp_propaga_erro_claro(self, mock_smtp_cls):
        mock_smtp_cls.side_effect = Exception('Conexão recusada')
        with self.assertRaises(Exception) as ctx:
            enviar_email(
                'contato@uidsoftware.com.br', 'senha123', 'destino@teste.com',
                'Assunto', 'Corpo',
            )
        self.assertIn('Erro ao enviar email', str(ctx.exception))


@override_settings(
    SMTP_HOST='smtp.teste.local', SMTP_PORT='587',
    SYSTEM_EMAIL_CONTA='contato@uidsoftware.com.br', SYSTEM_EMAIL_SENHA='senha-sistema',
)
class EnviarEmailSistemaTest(TestCase):
    """Garante que a extensao de anexos nao quebrou os chamadores
    existentes (convite de acesso, redefinicao de senha em
    usuarios/views.py) -- ambos chamam sem o parametro anexos."""

    @patch('email_client.services.smtplib.SMTP')
    def test_enviar_email_sistema_sem_anexos_funciona_como_antes(self, mock_smtp_cls):
        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        enviar_email_sistema('destino@teste.com', 'Acesso ao sistema', '<p>Olá</p>')

        mock_server.login.assert_called_once_with('contato@uidsoftware.com.br', 'senha-sistema')
        corpo_enviado = mock_server.sendmail.call_args[0][2]
        self.assertNotIn('Content-Disposition: attachment', corpo_enviado)

    @patch('email_client.services.smtplib.SMTP')
    def test_enviar_email_sistema_com_anexo_repassa_para_enviar_email(self, mock_smtp_cls):
        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        enviar_email_sistema(
            'destino@teste.com', 'Relatório', '<p>Resumo</p>',
            anexos=[('relatorio.pdf', b'%PDF-1.4 fake', 'application/pdf')],
        )

        corpo_enviado = mock_server.sendmail.call_args[0][2]
        self.assertIn('Content-Disposition: attachment; filename="relatorio.pdf"', corpo_enviado)

    def test_sem_senha_configurada_levanta_erro_claro(self):
        with override_settings(SYSTEM_EMAIL_SENHA=''):
            with self.assertRaises(Exception) as ctx:
                enviar_email_sistema('destino@teste.com', 'Assunto', '<p>x</p>')
            self.assertIn('SYSTEM_EMAIL_SENHA', str(ctx.exception))
