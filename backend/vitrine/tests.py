from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Lead


class LeadAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('lead-create')
        self.payload = {
            'nome': 'João Silva',
            'email': 'joao@exemplo.com',
            'telefone': '34999990000',
            'empresa': 'Empresa Teste',
            'mensagem': 'Preciso de um sistema.',
            'origem': 'vitrine_contato',
        }

    def test_criar_lead_sucesso(self):
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['mensagem'], 'Solicitação recebida com sucesso!')
        self.assertEqual(Lead.objects.count(), 1)

    def test_criar_lead_sem_email(self):
        payload = {**self.payload, 'email': ''}
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_criar_lead_sem_mensagem(self):
        payload = {**self.payload, 'mensagem': ''}
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
