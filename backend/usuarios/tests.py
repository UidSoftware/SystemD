from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Usuario, UsuarioEmailConfig


class MinhaEmailConfigTest(TestCase):
    """Self-service: usuário conecta a própria caixa de email (aba Email).
    Nunca configura email de outro usuário -- sempre opera em request.user."""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('minha_email_config')
        self.contador_interno = Usuario.objects.create_user(
            email='contador@uidsoftware.com.br', nome='Contador',
            password='s', perfil='CONTABILIDADE', externo=False,
        )
        self.contador_externo = Usuario.objects.create_user(
            email='documento@contadordireto.com.br', nome='Contador Direto',
            password='s', perfil='CONTABILIDADE', externo=True,
        )
        self.cliente = Usuario.objects.create_user(
            email='cliente@x.com', nome='Cliente', password='s', perfil='CLIENTE',
        )
        self.admin = Usuario.objects.create_user(
            email='admin@uid.com', nome='Admin', password='s', perfil='ADMIN',
        )

    def test_nao_autenticado_retorna_401(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_sem_config_retorna_configurado_false(self):
        self.client.force_authenticate(self.contador_interno)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['configurado'])

    def test_contador_interno_conecta_o_proprio_email(self):
        self.client.force_authenticate(self.contador_interno)
        res = self.client.post(self.url, {
            'email_conta': 'contador@uidsoftware.com.br',
            'email_senha': 'senha-da-caixa',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        config = UsuarioEmailConfig.objects.get(usuario=self.contador_interno)
        self.assertEqual(config.email_conta, 'contador@uidsoftware.com.br')
        self.assertEqual(config.email_senha, 'senha-da-caixa')
        self.assertTrue(config.ativo)

    def test_conectar_email_invalido_retorna_400(self):
        self.client.force_authenticate(self.contador_interno)
        res = self.client.post(self.url, {'email_conta': 'nao-e-email', 'email_senha': 'x'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reconectar_atualiza_config_existente_sem_duplicar(self):
        self.client.force_authenticate(self.contador_interno)
        self.client.post(self.url, {'email_conta': 'contador@uidsoftware.com.br', 'email_senha': 'primeira'}, format='json')
        self.client.post(self.url, {'email_conta': 'contador@uidsoftware.com.br', 'email_senha': 'segunda'}, format='json')
        self.assertEqual(UsuarioEmailConfig.objects.filter(usuario=self.contador_interno).count(), 1)
        config = UsuarioEmailConfig.objects.get(usuario=self.contador_interno)
        self.assertEqual(config.email_senha, 'segunda')

    def test_contador_externo_nao_pode_conectar_email(self):
        """Decisão 03/09/2026: módulo Email nunca é liberado pra parceiro
        externo, mesmo tendo o mesmo perfil CONTABILIDADE."""
        self.client.force_authenticate(self.contador_externo)
        res = self.client.post(self.url, {
            'email_conta': 'documento@contadordireto.com.br',
            'email_senha': 'x',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(UsuarioEmailConfig.objects.filter(usuario=self.contador_externo).exists())

    def test_cliente_nao_pode_conectar_email(self):
        self.client.force_authenticate(self.cliente)
        res = self.client.post(self.url, {'email_conta': 'x@x.com', 'email_senha': 'x'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_desconecta_o_proprio_email(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.url, {'email_conta': 'admin@uidsoftware.com.br', 'email_senha': 'x'}, format='json')
        res = self.client.delete(self.url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UsuarioEmailConfig.objects.filter(usuario=self.admin).exists())
