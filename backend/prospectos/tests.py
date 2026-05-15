from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Prospecto
from usuarios.models import Usuario
from clientes.models import Cliente


def criar_prospecto(**kwargs):
    defaults = {
        'nome_empresa': 'Empresa Teste',
        'nome_contato': 'Contato',
        'email': 'contato@empresa.com',
        'origem': 'manual',
    }
    defaults.update(kwargs)
    return Prospecto.objects.create(**defaults)


class ProspectoCRUDTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_user(
            email='admin@uid.com', nome='Admin', password='s', perfil='ADMIN'
        )
        self.operacional = Usuario.objects.create_user(
            email='op@uid.com', nome='Op', password='s', perfil='OPERACIONAL'
        )
        self.cliente_user = Usuario.objects.create_user(
            email='cli@uid.com', nome='Cli', password='s', perfil='CLIENTE'
        )
        self.url = reverse('prospectos-list')

    def test_admin_cria_prospecto(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {
            'nome_empresa': 'Nova Empresa',
            'nome_contato': 'João',
            'email': 'joao@nova.com',
            'origem': 'indicacao',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Prospecto.objects.count(), 1)

    def test_operacional_cria_prospecto(self):
        self.client.force_authenticate(self.operacional)
        res = self.client.post(self.url, {
            'nome_empresa': 'Outra',
            'nome_contato': 'Ana',
            'email': 'ana@outra.com',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_cliente_nao_acessa_prospectos(self):
        self.client.force_authenticate(self.cliente_user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_nao_autenticado_retorna_401(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_soft_delete_desativa_prospecto(self):
        p = criar_prospecto()
        self.client.force_authenticate(self.admin)
        url = reverse('prospectos-detail', args=[p.id])
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        p.refresh_from_db()
        self.assertFalse(p.ativo)

    def test_prospecto_desativado_some_da_listagem(self):
        criar_prospecto(ativo=False)
        criar_prospecto(nome_empresa='Ativo', email='ativo@x.com')
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.data['count'], 1)

    def test_editar_prospecto(self):
        p = criar_prospecto()
        self.client.force_authenticate(self.admin)
        url = reverse('prospectos-detail', args=[p.id])
        res = self.client.patch(url, {'segmento': 'pilates'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        p.refresh_from_db()
        self.assertEqual(p.segmento, 'pilates')


class ProspectoConverterTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_user(
            email='admin@uid.com', nome='Admin', password='s', perfil='ADMIN'
        )
        self.operacional = Usuario.objects.create_user(
            email='op@uid.com', nome='Op', password='s', perfil='OPERACIONAL'
        )
        self.prospecto = criar_prospecto(
            nome_empresa='Studio Fluir',
            email='studio@fluir.com',
            telefone='34999990000',
            segmento='pilates',
            cidade='Uberlândia',
            estado='MG',
            origem='indicacao',
        )
        self.url = reverse('prospectos-converter', args=[self.prospecto.id])

    def test_admin_converte_prospecto_em_cliente(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.prospecto.refresh_from_db()
        self.assertTrue(self.prospecto.convertido)
        self.assertIsNotNone(self.prospecto.convertido_em)
        self.assertTrue(Cliente.objects.filter(nome_empresa='Studio Fluir').exists())

    def test_operacional_nao_pode_converter(self):
        self.client.force_authenticate(self.operacional)
        res = self.client.post(self.url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_converter_prospecto_ja_convertido_retorna_400(self):
        self.prospecto.convertido = True
        self.prospecto.save()
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
