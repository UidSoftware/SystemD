from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Lead
from usuarios.models import Usuario


class LeadPublicoTest(TestCase):
    """POST público /api/leads/ — qualquer um pode enviar"""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('leads-list')
        self.payload = {
            'nome': 'João Silva',
            'email': 'joao@exemplo.com',
            'telefone': '34999990000',
            'empresa': 'Empresa Teste',
            'mensagem': 'Preciso de um sistema.',
            'origem': 'vitrine_contato',
        }

    def test_criar_lead_sucesso(self):
        res = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['mensagem'], 'Solicitação recebida com sucesso!')
        self.assertEqual(Lead.objects.count(), 1)

    def test_lead_criado_nao_lido_por_padrao(self):
        self.client.post(self.url, self.payload, format='json')
        lead = Lead.objects.first()
        self.assertFalse(lead.lido)
        self.assertFalse(lead.convertido)

    def test_criar_lead_sem_email_retorna_400(self):
        res = self.client.post(self.url, {**self.payload, 'email': ''}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_criar_lead_sem_mensagem_retorna_400(self):
        res = self.client.post(self.url, {**self.payload, 'mensagem': ''}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_listar_leads_sem_auth_retorna_403(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class LeadGestaoTest(TestCase):
    """Gestão de leads — ADMIN/OPERACIONAL"""

    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_user(
            email='admin@uid.com', nome='Admin', password='senha123', perfil='ADMIN'
        )
        self.operacional = Usuario.objects.create_user(
            email='op@uid.com', nome='Op', password='senha123', perfil='OPERACIONAL'
        )
        self.lead = Lead.objects.create(
            nome='Maria', email='maria@ex.com', mensagem='Oi', origem='vitrine_contato'
        )
        self.url = reverse('leads-list')
        self.detail_url = reverse('leads-detail', args=[self.lead.id])

    def test_admin_lista_leads(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)

    def test_operacional_lista_leads(self):
        self.client.force_authenticate(self.operacional)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_admin_marca_lead_como_lido(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self.detail_url, {'lido': True}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.lead.refresh_from_db()
        self.assertTrue(self.lead.lido)

    def test_admin_adiciona_observacoes_internas(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self.detail_url, {'observacoes_internas': 'Cliente promissor'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.observacoes_internas, 'Cliente promissor')

    def test_delete_lead_nao_permitido(self):
        self.client.force_authenticate(self.admin)
        res = self.client.delete(self.detail_url)
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_filtro_por_lido(self):
        Lead.objects.create(nome='X', email='x@x.com', mensagem='m', origem='o', lido=True)
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {'lido': 'false'})
        self.assertEqual(res.data['count'], 1)

    def test_converter_lead_em_prospecto(self):
        self.client.force_authenticate(self.admin)
        url = reverse('leads-converter', args=[self.lead.id])
        res = self.client.post(url, {
            'nome_empresa': 'Empresa Maria',
            'nome_contato': 'Maria',
            'email': 'maria@ex.com',
            'origem': 'vitrine_contato',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.lead.refresh_from_db()
        self.assertTrue(self.lead.convertido)

    def test_converter_lead_ja_convertido_retorna_400(self):
        self.lead.convertido = True
        self.lead.save()
        self.client.force_authenticate(self.admin)
        url = reverse('leads-converter', args=[self.lead.id])
        res = self.client.post(url, {
            'nome_empresa': 'X', 'nome_contato': 'X', 'email': 'x@x.com'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
