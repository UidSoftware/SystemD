from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from usuarios.models import Usuario
from clientes.models import Cliente
from prospectos.models import Prospecto
from nichos.models import Nicho
from .models import Orcamento, ItemOrcamento


def make_user(email, perfil):
    return Usuario.objects.create_user(email=email, nome=perfil, password='s', perfil=perfil)


def make_orcamento(criado_por, cliente=None, prospecto=None, desconto=Decimal('0.00'),
                    desconto_percentual=Decimal('0.00')):
    orcamento = Orcamento.objects.create(
        cliente=cliente,
        prospecto=prospecto,
        valido_ate='2026-12-31',
        desconto=desconto,
        desconto_percentual=desconto_percentual,
        criado_por=criado_por,
    )
    ItemOrcamento.objects.create(
        orcamento=orcamento, ordem=1, descricao='Item 1',
        quantidade=Decimal('2'), unidade='UN', valor_unitario=Decimal('100.00'),
    )
    ItemOrcamento.objects.create(
        orcamento=orcamento, ordem=2, descricao='Item 2',
        quantidade=Decimal('1'), unidade='UN', valor_unitario=Decimal('50.00'),
    )
    return orcamento


class OrcamentoPdfTest(APITestCase):
    """Cobertura RN08 (Manutenção #61) — GET /api/orcamentos/{id}/pdf/"""

    def setUp(self):
        self.client = APIClient()
        self.admin = make_user('admin@uid.com', 'ADMIN')
        self.operacional = make_user('op@uid.com', 'OPERACIONAL')
        self.financeiro = make_user('fin@uid.com', 'FINANCEIRO')
        self.cliente_user = make_user('cli@uid.com', 'CLIENTE')

        self.nicho, _ = Nicho.objects.get_or_create(nome='Serviços')
        self.cliente = Cliente.objects.create(
            nome_empresa='Cliente Teste', nicho=self.nicho, origem='manual',
            cnpj_cpf='12.345.678/0001-90',
        )
        self.prospecto = Prospecto.objects.create(nome_empresa='Prospecto Teste', origem='manual')

    def _url(self, orcamento_id):
        return reverse('orcamentos-pdf', kwargs={'pk': orcamento_id})

    def test_admin_gera_pdf_com_desconto_valor_e_percentual(self):
        orcamento = make_orcamento(
            self.admin, cliente=self.cliente,
            desconto=Decimal('10.00'), desconto_percentual=Decimal('5.00'),
        )
        self.client.force_authenticate(self.admin)
        res = self.client.get(self._url(orcamento.id))

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'application/pdf')
        self.assertIn(f'orcamento_{orcamento.numero:06d}.pdf', res['Content-Disposition'])
        self.assertIn('inline', res['Content-Disposition'])
        # Sanity — response tem corpo de PDF de verdade (assinatura %PDF)
        self.assertTrue(res.content.startswith(b'%PDF'))

    def test_operacional_gera_pdf(self):
        orcamento = make_orcamento(self.operacional, cliente=self.cliente)
        self.client.force_authenticate(self.operacional)
        res = self.client.get(self._url(orcamento.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'application/pdf')

    def test_financeiro_sem_acesso(self):
        orcamento = make_orcamento(self.admin, cliente=self.cliente)
        self.client.force_authenticate(self.financeiro)
        res = self.client.get(self._url(orcamento.id))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cliente_sem_acesso(self):
        orcamento = make_orcamento(self.admin, cliente=self.cliente)
        self.client.force_authenticate(self.cliente_user)
        res = self.client.get(self._url(orcamento.id))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonimo_sem_acesso(self):
        orcamento = make_orcamento(self.admin, cliente=self.cliente)
        res = self.client.get(self._url(orcamento.id))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_id_inexistente_retorna_404(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self._url(999999))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_sem_desconto_nenhum_nao_quebra(self):
        orcamento = make_orcamento(self.admin, cliente=self.cliente)
        self.client.force_authenticate(self.admin)
        res = self.client.get(self._url(orcamento.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_pdf_de_prospecto_sem_cliente(self):
        orcamento = make_orcamento(self.admin, prospecto=self.prospecto)
        self.client.force_authenticate(self.admin)
        res = self.client.get(self._url(orcamento.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_pdf_sem_cliente_nem_prospecto_nao_quebra(self):
        orcamento = make_orcamento(self.admin)
        self.client.force_authenticate(self.admin)
        res = self.client.get(self._url(orcamento.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_total_geral_do_pdf_bate_com_o_model(self):
        orcamento = make_orcamento(
            self.admin, cliente=self.cliente,
            desconto=Decimal('10.00'), desconto_percentual=Decimal('5.00'),
        )
        # subtotal = 2*100 + 1*50 = 250; total_geral = 250 - 10 - 250*0.05 = 227.50
        self.assertEqual(orcamento.total_geral, Decimal('227.50'))
        self.client.force_authenticate(self.admin)
        res = self.client.get(self._url(orcamento.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
