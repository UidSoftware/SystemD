from datetime import date
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from usuarios.models import Usuario
from financeiro.models import Categoria, Conta, Receita, Despesa, LivroCaixa


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def make_user(email, perfil):
    return Usuario.objects.create_user(email=email, nome=perfil, password='s', perfil=perfil)


def make_conta(nome='Caixa', saldo_inicial=Decimal('0.00')):
    return Conta.objects.create(
        nome=nome, tipo='CAIXA', saldo_inicial=saldo_inicial,
        criado_por=Usuario.objects.filter(perfil='ADMIN').first(),
    )


def make_receita(conta, status='PENDENTE', valor=Decimal('100.00')):
    admin = Usuario.objects.filter(perfil='ADMIN').first()
    return Receita.objects.create(
        descricao='Receita teste', tipo='CONSULTORIA', status=status,
        valor_bruto=valor, desconto=Decimal('0.00'), valor_liquido=valor,
        conta=conta, vencimento=date.today(), criado_por=admin,
    )


def make_despesa(conta, status='PENDENTE', valor=Decimal('50.00')):
    admin = Usuario.objects.filter(perfil='ADMIN').first()
    return Despesa.objects.create(
        descricao='Despesa teste', tipo='VARIAVEL', status=status,
        valor_bruto=valor, desconto=Decimal('0.00'), valor_liquido=valor,
        conta=conta, vencimento=date.today(), criado_por=admin,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Categoria
# ──────────────────────────────────────────────────────────────────────────────

class CategoriaTest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@uid.com', 'ADMIN')
        self.fin = make_user('fin@uid.com', 'FINANCEIRO')
        self.op = make_user('op@uid.com', 'OPERACIONAL')
        self.url = reverse('categorias-list')

    def test_admin_cria_categoria_entrada(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {'nome': 'SaaS', 'tipo': 'ENTRADA'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Categoria.objects.filter(nome='SaaS', tipo='ENTRADA').exists())

    def test_financeiro_cria_categoria(self):
        self.client.force_authenticate(self.fin)
        res = self.client.post(self.url, {'nome': 'Infra', 'tipo': 'SAIDA'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_operacional_nao_pode_criar_categoria(self):
        self.client.force_authenticate(self.op)
        res = self.client.post(self.url, {'nome': 'X', 'tipo': 'ENTRADA'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_filtro_por_tipo_entrada(self):
        Categoria.objects.create(nome='A', tipo='ENTRADA')
        Categoria.objects.create(nome='B', tipo='SAIDA')
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url, {'tipo': 'ENTRADA'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        nomes = [c['nome'] for c in res.data['results']]
        self.assertIn('A', nomes)
        self.assertNotIn('B', nomes)

    def test_nome_tipo_unique_together(self):
        Categoria.objects.create(nome='SaaS', tipo='ENTRADA')
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {'nome': 'SaaS', 'tipo': 'ENTRADA'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mesmo_nome_tipos_diferentes_permitido(self):
        Categoria.objects.create(nome='Outros', tipo='ENTRADA')
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {'nome': 'Outros', 'tipo': 'SAIDA'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_sem_auth_retorna_401(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


# ──────────────────────────────────────────────────────────────────────────────
# Receita — endpoint /receber/
# ──────────────────────────────────────────────────────────────────────────────

class ReceitaReceberTest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@uid.com', 'ADMIN')
        self.fin = make_user('fin@uid.com', 'FINANCEIRO')
        self.op = make_user('op@uid.com', 'OPERACIONAL')
        self.conta = make_conta()
        self.receita = make_receita(self.conta)

    def _url(self):
        return reverse('receitas-marcar-recebido', args=[self.receita.id])

    def test_admin_marca_receita_recebida(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self._url(), {'recebimento': str(date.today())}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.receita.refresh_from_db()
        self.assertEqual(self.receita.status, 'RECEBIDO')
        self.assertEqual(self.receita.recebimento, date.today())

    def test_financeiro_pode_marcar_recebida(self):
        self.client.force_authenticate(self.fin)
        res = self.client.patch(self._url(), {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_operacional_nao_pode_marcar_recebida(self):
        self.client.force_authenticate(self.op)
        res = self.client.patch(self._url(), {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_receber_gera_livro_caixa_entrada(self):
        self.client.force_authenticate(self.admin)
        self.client.patch(self._url(), {}, format='json')
        lc = LivroCaixa.objects.filter(conta=self.conta, tipo='ENTRADA', origem='RECEITA').first()
        self.assertIsNotNone(lc)
        self.assertEqual(lc.valor, self.receita.valor_liquido)

    def test_receber_atualiza_saldo_da_conta(self):
        self.conta.saldo_inicial = Decimal('200.00')
        self.conta.save()
        self.client.force_authenticate(self.admin)
        self.client.patch(self._url(), {}, format='json')
        lc = LivroCaixa.objects.filter(conta=self.conta, origem='RECEITA').first()
        self.assertEqual(lc.saldo_atual, Decimal('300.00'))

    def test_receber_com_conta_diferente(self):
        outra_conta = make_conta('Outra')
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self._url(), {'conta': outra_conta.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.receita.refresh_from_db()
        self.assertEqual(self.receita.conta, outra_conta)

    def test_receber_conta_inexistente_retorna_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self._url(), {'conta': 9999}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────────────────────────────────────
# Despesa — endpoint /pagar/
# ──────────────────────────────────────────────────────────────────────────────

class DespesaPagarTest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@uid.com', 'ADMIN')
        self.fin = make_user('fin@uid.com', 'FINANCEIRO')
        self.conta = make_conta(saldo_inicial=Decimal('500.00'))
        self.despesa = make_despesa(self.conta)

    def _url(self):
        return reverse('despesas-marcar-pago', args=[self.despesa.id])

    def test_admin_marca_despesa_paga(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self._url(), {'pagamento': str(date.today())}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.despesa.refresh_from_db()
        self.assertEqual(self.despesa.status, 'PAGO')

    def test_pagar_gera_livro_caixa_saida(self):
        self.client.force_authenticate(self.admin)
        self.client.patch(self._url(), {}, format='json')
        lc = LivroCaixa.objects.filter(conta=self.conta, tipo='SAIDA', origem='DESPESA').first()
        self.assertIsNotNone(lc)
        self.assertEqual(lc.valor, self.despesa.valor_liquido)

    def test_pagar_debita_saldo(self):
        self.client.force_authenticate(self.admin)
        self.client.patch(self._url(), {}, format='json')
        lc = LivroCaixa.objects.filter(conta=self.conta, origem='DESPESA').first()
        self.assertEqual(lc.saldo_atual, Decimal('450.00'))

    def test_pagar_forma_pagamento_invalida_retorna_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self._url(), {'forma_pagamento': 'INVALIDA'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pagar_conta_inexistente_retorna_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(self._url(), {'conta': 9999}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────────────────────────────────────
# Despesa — endpoint /estornar/
# ──────────────────────────────────────────────────────────────────────────────

class DespesaEstornarTest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@uid.com', 'ADMIN')
        self.fin = make_user('fin@uid.com', 'FINANCEIRO')
        self.conta = make_conta(saldo_inicial=Decimal('500.00'))
        self.despesa = make_despesa(self.conta, status='PAGO')
        # Cria saldo inicial no LivroCaixa
        LivroCaixa.objects.create(
            conta=self.conta, tipo='SAIDA', origem='DESPESA',
            origem_id=self.despesa.id, descricao='Despesa teste',
            valor=self.despesa.valor_liquido, data=date.today(),
            saldo_anterior=Decimal('500.00'), saldo_atual=Decimal('450.00'),
            criado_por=self.admin,
        )

    def _url(self):
        return reverse('despesas-estornar-despesa', args=[self.despesa.id])

    def _payload(self, **kwargs):
        return {'data_estorno': str(date.today()), 'motivo': 'Cobrança indevida', **kwargs}

    def test_admin_estorna_despesa_paga(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self._url(), self._payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.despesa.refresh_from_db()
        self.assertTrue(self.despesa.estornado)
        self.assertEqual(self.despesa.motivo_estorno, 'Cobrança indevida')

    def test_estorno_gera_lancamento_entrada_no_livro_caixa(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self._url(), self._payload(), format='json')
        lc = LivroCaixa.objects.filter(conta=self.conta, tipo='ENTRADA', origem='ESTORNO').first()
        self.assertIsNotNone(lc)
        self.assertEqual(lc.valor, self.despesa.valor_liquido)

    def test_estorno_credita_saldo(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self._url(), self._payload(), format='json')
        lc = LivroCaixa.objects.filter(origem='ESTORNO').first()
        self.assertEqual(lc.saldo_atual, Decimal('500.00'))

    def test_financeiro_nao_pode_estornar(self):
        self.client.force_authenticate(self.fin)
        res = self.client.post(self._url(), self._payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_estornar_despesa_pendente_retorna_400(self):
        despesa_pendente = make_despesa(self.conta, status='PENDENTE')
        url = reverse('despesas-estornar-despesa', args=[despesa_pendente.id])
        self.client.force_authenticate(self.admin)
        res = self.client.post(url, self._payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_estornar_despesa_ja_estornada_retorna_400(self):
        self.despesa.estornado = True
        self.despesa.save()
        self.client.force_authenticate(self.admin)
        res = self.client.post(self._url(), self._payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_estornar_sem_motivo_retorna_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self._url(), {'data_estorno': str(date.today()), 'motivo': ''}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_estornar_data_invalida_retorna_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self._url(), {'motivo': 'ok', 'data_estorno': 'naoehdata'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_estornar_conta_inexistente_retorna_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self._url(), self._payload(conta=9999), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────────────────────────────────────
# DRE — não pode contar despesas estornadas
# ──────────────────────────────────────────────────────────────────────────────

class DreEstornoTest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@uid.com', 'ADMIN')
        self.conta = make_conta()
        self.url = reverse('dre')

    def test_despesa_estornada_nao_entra_no_total_despesas(self):
        self.client.force_authenticate(self.admin)
        Despesa.objects.create(
            descricao='VPS', tipo='FIXA', status='PAGO',
            valor_bruto=Decimal('97.90'), desconto=Decimal('0.00'), valor_liquido=Decimal('97.90'),
            conta=self.conta, vencimento=date(2026, 7, 4), pagamento=date(2026, 6, 1),
            estornado=True, criado_por=self.admin,
        )
        Despesa.objects.create(
            descricao='VPS', tipo='FIXA', status='PAGO',
            valor_bruto=Decimal('97.90'), desconto=Decimal('0.00'), valor_liquido=Decimal('97.90'),
            conta=self.conta, vencimento=date(2026, 6, 4), pagamento=date(2026, 6, 1),
            estornado=False, criado_por=self.admin,
        )
        res = self.client.get(self.url, {'ano': 2026}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        junho = res.data['meses'][5]
        self.assertEqual(Decimal(str(junho['despesas_fixas'])), Decimal('97.90'))
        self.assertEqual(Decimal(str(junho['total_despesas'])), Decimal('97.90'))


# ──────────────────────────────────────────────────────────────────────────────
# LivroCaixa — imutabilidade
# ──────────────────────────────────────────────────────────────────────────────

class LivroCaixaImutavelTest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@uid.com', 'ADMIN')
        self.conta = make_conta()
        self.lancamento = LivroCaixa.objects.create(
            conta=self.conta, tipo='ENTRADA', origem='MANUAL',
            descricao='Teste', valor=Decimal('100.00'), data=date.today(),
            saldo_anterior=Decimal('0.00'), saldo_atual=Decimal('100.00'),
            criado_por=self.admin,
        )

    def test_put_retorna_405(self):
        self.client.force_authenticate(self.admin)
        url = reverse('livro-caixa-detail', args=[self.lancamento.id])
        res = self.client.put(url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_patch_retorna_405(self):
        self.client.force_authenticate(self.admin)
        url = reverse('livro-caixa-detail', args=[self.lancamento.id])
        res = self.client.patch(url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_retorna_405(self):
        self.client.force_authenticate(self.admin)
        url = reverse('livro-caixa-detail', args=[self.lancamento.id])
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_get_lista_permitido(self):
        self.client.force_authenticate(self.admin)
        url = reverse('livro-caixa-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
