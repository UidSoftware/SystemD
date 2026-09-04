from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Nicho
from usuarios.models import Usuario


class NichoCRUDTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_user(
            email='admin@uid.com', nome='Admin', password='senha123', perfil='ADMIN'
        )
        self.operacional = Usuario.objects.create_user(
            email='op@uid.com', nome='Op', password='senha123', perfil='OPERACIONAL'
        )
        self.nicho = Nicho.objects.create(nome='Pilates')
        self.url = reverse('nichos-list')

    def test_nao_autenticado_retorna_401(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_lista_nichos(self):
        # +1 porque a migration de seed (0002_seed_nichos) já cria os 7
        # nichos canonicos no banco de teste, alem do 'Pilates' do setUp
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 8)

    def test_operacional_cria_nicho(self):
        self.client.force_authenticate(self.operacional)
        res = self.client.post(self.url, {'nome': 'Tecnologia'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Nicho.objects.filter(nome='Tecnologia').exists())

    def test_nome_duplicado_retorna_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {'nome': 'Pilates'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_soft_delete_desativa_nicho(self):
        self.client.force_authenticate(self.admin)
        url = reverse('nichos-detail', args=[self.nicho.id])
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.nicho.refresh_from_db()
        self.assertFalse(self.nicho.ativo)
        res2 = self.client.get(self.url)
        self.assertEqual(res2.data['count'], 7)
