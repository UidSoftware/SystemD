from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Cliente
from usuarios.models import Usuario


class ClienteTemEntregasTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_user(
            email='admin@uid.com', nome='Admin', password='s', perfil='ADMIN'
        )
        self.url = reverse('cliente-list')

    def test_cliente_criado_sem_tem_entregas_por_padrao(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {
            'nome_empresa': 'Empresa X',
            'nome_contato': 'Contato',
            'email': 'x@empresa.com',
            'telefone': '34999990000',
            'segmento': 'comercio',
            'origem': 'indicacao',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertFalse(Cliente.objects.first().tem_entregas)

    def test_admin_ativa_tem_entregas(self):
        cliente = Cliente.objects.create(
            nome_empresa='Studio', nome_contato='Ana', email='ana@studio.com',
            telefone='34999990000', segmento='pilates', origem='indicacao',
        )
        self.client.force_authenticate(self.admin)
        url = reverse('cliente-detail', args=[cliente.id])
        res = self.client.patch(url, {'tem_entregas': True}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        cliente.refresh_from_db()
        self.assertTrue(cliente.tem_entregas)

    def test_me_retorna_tem_entregas_true_para_cliente_com_flag(self):
        cliente = Cliente.objects.create(
            nome_empresa='Studio', nome_contato='Ana', email='ana@studio.com',
            telefone='34999990000', segmento='pilates', origem='indicacao',
            tem_entregas=True,
        )
        usuario_cliente = Usuario.objects.create_user(
            email='cli@studio.com', nome='Ana', password='s', perfil='CLIENTE'
        )
        cliente.usuario = usuario_cliente
        cliente.save()

        self.client.force_authenticate(usuario_cliente)
        res = self.client.get(reverse('me'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['tem_entregas'])

    def test_me_retorna_tem_entregas_false_para_admin(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(reverse('me'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['tem_entregas'])
