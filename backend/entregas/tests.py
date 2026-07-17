from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Entrega, StatusEntrega, ConfirmacaoEntrega
from usuarios.models import Usuario
from clientes.models import Cliente


def criar_cliente(**kwargs):
    kwargs.pop('nome_contato', None)
    kwargs.pop('email', None)
    kwargs.pop('telefone', None)
    defaults = {
        'nome_empresa': 'Empresa A',
        'segmento': 'comercio',
        'origem': 'indicacao',
    }
    defaults.update(kwargs)
    return Cliente.objects.create(**defaults)


def criar_entrega(empresa, registrado_por, **kwargs):
    defaults = {
        'data': '2026-05-01',
        'solicitante': 'Solicitante Teste',
        'descricao': 'Entrega teste',
        'status': StatusEntrega.PENDENTE,
    }
    defaults.update(kwargs)
    return Entrega.objects.create(empresa=empresa, registrado_por=registrado_por, **defaults)


class EntregaCRUDTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_user(
            email='admin@uid.com', nome='Admin', password='s', perfil='ADMIN'
        )
        self.operacional = Usuario.objects.create_user(
            email='op@uid.com', nome='Op', password='s', perfil='OPERACIONAL'
        )
        self.empresa_a = criar_cliente(nome_empresa='Empresa A', email='a@empresa.com')
        self.cli_a = Usuario.objects.create_user(
            email='cli_a@uid.com', nome='CLI A', password='s', perfil='CLIENTE'
        )
        self.empresa_a.usuario = self.cli_a
        self.empresa_a.save()
        self.url = reverse('entregas-list')

    def test_admin_cria_entrega(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {
            'empresa': self.empresa_a.id,
            'data': '2026-05-10',
            'solicitante': 'Fulano',
            'descricao': 'Entrega de documentos',
            'status': 'PENDENTE',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        entrega = Entrega.objects.first()
        self.assertEqual(entrega.registrado_por, self.admin)

    def test_operacional_cria_entrega(self):
        self.client.force_authenticate(self.operacional)
        res = self.client.post(self.url, {
            'empresa': self.empresa_a.id,
            'data': '2026-05-10',
            'solicitante': 'Ciclano',
            'status': 'EM_ROTA',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_cliente_nao_pode_criar_entrega(self):
        self.client.force_authenticate(self.cli_a)
        res = self.client.post(self.url, {
            'empresa': self.empresa_a.id,
            'data': '2026-05-10',
            'solicitante': 'X',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_soft_delete(self):
        e = criar_entrega(self.empresa_a, self.admin)
        self.client.force_authenticate(self.admin)
        url = reverse('entregas-detail', args=[e.id])
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        e.refresh_from_db()
        self.assertFalse(e.ativo)


class EntregaMultiTenantTest(TestCase):
    """Isolamento: CLIENTE só vê as entregas da própria empresa"""

    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_user(
            email='admin@uid.com', nome='Admin', password='s', perfil='ADMIN'
        )
        self.empresa_a = criar_cliente(nome_empresa='Empresa A', email='ea@x.com')
        self.empresa_b = criar_cliente(nome_empresa='Empresa B', email='eb@x.com')

        self.cli_a = Usuario.objects.create_user(
            email='cli_a@uid.com', nome='CLI A', password='s', perfil='CLIENTE'
        )
        self.empresa_a.usuario = self.cli_a
        self.empresa_a.save()

        self.cli_b = Usuario.objects.create_user(
            email='cli_b@uid.com', nome='CLI B', password='s', perfil='CLIENTE'
        )
        self.empresa_b.usuario = self.cli_b
        self.empresa_b.save()

        criar_entrega(self.empresa_a, self.admin, solicitante='A1')
        criar_entrega(self.empresa_a, self.admin, solicitante='A2')
        criar_entrega(self.empresa_b, self.admin, solicitante='B1')

        self.url = reverse('entregas-list')

    def test_cliente_a_ve_somente_proprias_entregas(self):
        self.client.force_authenticate(self.cli_a)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 2)

    def test_cliente_b_ve_somente_proprias_entregas(self):
        self.client.force_authenticate(self.cli_b)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)

    def test_admin_ve_todas_as_entregas(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 3)

    def test_admin_filtra_por_empresa(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {'empresa': self.empresa_b.id})
        self.assertEqual(res.data['count'], 1)

    def test_cliente_sem_empresa_vinculada_ve_zero(self):
        sem_empresa = Usuario.objects.create_user(
            email='sem@uid.com', nome='Sem', password='s', perfil='CLIENTE'
        )
        self.client.force_authenticate(sem_empresa)
        res = self.client.get(self.url)
        self.assertEqual(res.data['count'], 0)


class EntregaConfirmacaoTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_user(
            email='admin@uid.com', nome='Admin', password='s', perfil='ADMIN'
        )
        self.empresa = criar_cliente()
        self.cli = Usuario.objects.create_user(
            email='cli@uid.com', nome='CLI', password='s', perfil='CLIENTE'
        )
        self.empresa.usuario = self.cli
        self.empresa.save()

        self.entrega = criar_entrega(self.empresa, self.admin, status=StatusEntrega.ENTREGUE)
        self.url = reverse('entregas-confirmar', args=[self.entrega.id])

    def test_cliente_confirma_entrega(self):
        self.client.force_authenticate(self.cli)
        res = self.client.patch(self.url, {'confirmacao': 'CONFIRMADA'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.entrega.refresh_from_db()
        self.assertEqual(self.entrega.confirmacao, ConfirmacaoEntrega.CONFIRMADA)
        self.assertEqual(self.entrega.confirmado_por, self.cli)

    def test_cliente_nao_confirma_sem_motivo_retorna_400(self):
        self.client.force_authenticate(self.cli)
        res = self.client.patch(self.url, {'confirmacao': 'NAO_CONFIRMADA'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cliente_nao_confirma_com_motivo(self):
        self.client.force_authenticate(self.cli)
        res = self.client.patch(self.url, {
            'confirmacao': 'NAO_CONFIRMADA',
            'confirmacao_motivo': 'Produto chegou avariado',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.entrega.refresh_from_db()
        self.assertEqual(self.entrega.confirmacao, ConfirmacaoEntrega.NAO_CONFIRMADA)
        self.assertEqual(self.entrega.confirmacao_motivo, 'Produto chegou avariado')

    def test_confirmacao_valor_invalido_retorna_400(self):
        self.client.force_authenticate(self.cli)
        res = self.client.patch(self.url, {'confirmacao': 'INVALIDO'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
