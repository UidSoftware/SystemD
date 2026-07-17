from datetime import date
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from usuarios.models import Usuario
from financeiro.models import Aporte, Categoria, Conta, ConciliacaoExtrato, ItemConciliacao, PadraoSeguroConciliacao, Receita, Despesa, LivroCaixa


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

    def test_estorno_marca_lancamento_original_e_o_proprio_como_estornados(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self._url(), self._payload(), format='json')
        original = LivroCaixa.objects.get(origem='DESPESA', origem_id=self.despesa.id)
        estorno = LivroCaixa.objects.get(origem='ESTORNO', origem_id=self.despesa.id)
        self.assertTrue(original.estornado)
        self.assertTrue(estorno.estornado)
        self.assertEqual(estorno.estorno_de_id, original.id)

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
# Dashboard — estorno não pode inflar receita/despesa do mês (lançamento "lavagem")
# ──────────────────────────────────────────────────────────────────────────────

class DashboardEstornoTest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@uid.com', 'ADMIN')
        self.conta = make_conta(saldo_inicial=Decimal('500.00'))
        self.url = reverse('dashboard')

    def test_despesa_paga_e_estornada_no_mes_nao_infla_dashboard(self):
        self.client.force_authenticate(self.admin)
        hoje = date.today()
        despesa = make_despesa(self.conta, status='PAGO', valor=Decimal('97.90'))
        despesa.pagamento = hoje
        despesa.save(update_fields=['pagamento'])  # dispara signal: cria LivroCaixa SAIDA origem=DESPESA
        url_estornar = reverse('despesas-estornar-despesa', args=[despesa.id])
        res = self.client.post(
            url_estornar,
            {'data_estorno': str(hoje), 'motivo': 'Pagamento Duplicado'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        res = self.client.get(self.url, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(res.data['despesa_mes'])), Decimal('0'))
        self.assertEqual(Decimal(str(res.data['receita_mes'])), Decimal('0'))
        self.assertEqual(Decimal(str(res.data['resultado_mes'])), Decimal('0'))


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


# ──────────────────────────────────────────────────────────────────────────────
# PadraoSeguroConciliacao — CRUD
# ──────────────────────────────────────────────────────────────────────────────

class PadraoSeguroConciliacaoTest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@uid.com', 'ADMIN')
        self.fin   = make_user('fin@uid.com',   'FINANCEIRO')
        self.op    = make_user('op@uid.com',    'OPERACIONAL')
        self.url   = reverse('padroes-seguros-conciliacao-list')

    def test_padrao_seguro_create(self):
        """POST /api/financeiro/padroes-seguros-conciliacao/ cria padrão."""
        self.client.force_authenticate(self.admin)
        payload = {'descricao_padrao': 'PIX RECEBIDO CLIENTE', 'tipo': 'ENTRADA'}
        res = self.client.post(self.url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            PadraoSeguroConciliacao.objects.filter(
                descricao_padrao='PIX RECEBIDO CLIENTE', tipo='ENTRADA',
            ).exists()
        )
        # criado_por deve ser preenchido automaticamente
        padrao = PadraoSeguroConciliacao.objects.get(descricao_padrao='PIX RECEBIDO CLIENTE')
        self.assertEqual(padrao.criado_por, self.admin)

    def test_padrao_seguro_create_financeiro(self):
        """Perfil FINANCEIRO também pode criar padrões."""
        self.client.force_authenticate(self.fin)
        payload = {'descricao_padrao': 'PAGAMENTO FORNECEDOR', 'tipo': 'SAIDA'}
        res = self.client.post(self.url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_padrao_seguro_create_operacional_bloqueado(self):
        """Perfil OPERACIONAL não pode criar padrões."""
        self.client.force_authenticate(self.op)
        payload = {'descricao_padrao': 'ALGUM PADRAO', 'tipo': 'ENTRADA'}
        res = self.client.post(self.url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_padrao_seguro_list(self):
        """GET /api/financeiro/padroes-seguros-conciliacao/ lista padrões ativos."""
        PadraoSeguroConciliacao.objects.create(
            descricao_padrao='PIX ENTRADA',
            tipo='ENTRADA',
            ativo=True,
            criado_por=self.admin,
        )
        PadraoSeguroConciliacao.objects.create(
            descricao_padrao='PIX SAIDA INATIVO',
            tipo='SAIDA',
            ativo=False,
            criado_por=self.admin,
        )
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        descricoes = [p['descricao_padrao'] for p in res.data['results']]
        self.assertIn('PIX ENTRADA', descricoes)
        # Padrão inativo não deve aparecer (queryset filtra ativo=True)
        self.assertNotIn('PIX SAIDA INATIVO', descricoes)

    def test_padrao_seguro_delete_soft(self):
        """DELETE seta ativo=False (soft delete) em vez de destruir o registro."""
        padrao = PadraoSeguroConciliacao.objects.create(
            descricao_padrao='BOLETO PAGAMENTO',
            tipo='SAIDA',
            ativo=True,
            criado_por=self.admin,
        )
        self.client.force_authenticate(self.admin)
        url_detail = reverse('padroes-seguros-conciliacao-detail', args=[padrao.id])
        res = self.client.delete(url_detail)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        # Registro ainda existe no banco
        padrao.refresh_from_db()
        self.assertFalse(padrao.ativo)


# ──────────────────────────────────────────────────────────────────────────────
# ConciliacaoViewSet — endpoint /pendentes/
# ──────────────────────────────────────────────────────────────────────────────

class ConciliacaoPendentesTest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin@uid.com', 'ADMIN')
        self.conta = make_conta()
        self.url   = reverse('conciliacoes-pendentes')

    def _criar_conciliacao_com_item(self, descricao, tipo, valor, status_item, confirmado=False):
        conc = ConciliacaoExtrato.objects.create(
            conta=self.conta,
            arquivo='/tmp/extrato.pdf',
            periodo=date.today().replace(day=1),
            status='COM_DIVERGENCIAS',
            total_banco=valor,
            total_sistema=Decimal('0'),
            divergencias=1,
            criado_por=self.admin,
        )
        item = ItemConciliacao.objects.create(
            conciliacao=conc,
            data_banco=date.today(),
            descricao_banco=descricao,
            valor=valor,
            tipo=tipo,
            status=status_item,
            confirmado=confirmado,
        )
        return conc, item

    def test_conciliacao_pendentes_endpoint_retorna_estrutura_correta(self):
        """GET /api/financeiro/conciliacoes/pendentes/ retorna grupos com estrutura correta."""
        self._criar_conciliacao_com_item(
            'PIX RECEBIDO XPTO', 'ENTRADA', Decimal('150.00'), 'FALTANDO_SISTEMA',
        )
        self._criar_conciliacao_com_item(
            'PIX RECEBIDO XPTO', 'ENTRADA', Decimal('150.00'), 'FALTANDO_SISTEMA',
        )
        self._criar_conciliacao_com_item(
            'PAGAMENTO BOLETO ABC', 'SAIDA', Decimal('89.90'), 'FALTANDO_SISTEMA',
        )
        # Item já confirmado não deve aparecer
        self._criar_conciliacao_com_item(
            'CONCILIADO OK', 'ENTRADA', Decimal('50.00'), 'FALTANDO_SISTEMA', confirmado=True,
        )

        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Deve retornar lista (não paginada)
        self.assertIsInstance(res.data, list)

        # 2 grupos: PIX RECEBIDO XPTO e PAGAMENTO BOLETO ABC
        descricoes = [g['descricao'] for g in res.data]
        self.assertIn('PIX RECEBIDO XPTO', descricoes)
        self.assertIn('PAGAMENTO BOLETO ABC', descricoes)
        self.assertNotIn('CONCILIADO OK', descricoes)

        # Verifica estrutura do grupo
        grupo_pix = next(g for g in res.data if g['descricao'] == 'PIX RECEBIDO XPTO')
        self.assertIn('tipo', grupo_pix)
        self.assertIn('total_ocorrencias', grupo_pix)
        self.assertIn('valor_total', grupo_pix)
        self.assertIn('itens', grupo_pix)
        self.assertEqual(grupo_pix['total_ocorrencias'], 2)
        self.assertEqual(Decimal(str(grupo_pix['valor_total'])), Decimal('300.00'))
        self.assertEqual(len(grupo_pix['itens']), 2)

    def test_conciliacao_pendentes_sem_auth_retorna_401(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_conciliacao_pendentes_vazio_retorna_lista_vazia(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])


# ──────────────────────────────────────────────────────────────────────────────
# parse_btg — regressão: coluna Saldo não pode ser lida como valor da transação
# ──────────────────────────────────────────────────────────────────────────────

class ParseBtgTest(APITestCase):

    def test_captura_valor_da_transacao_nao_o_saldo(self):
        """
        Extrato real do BTG tem duas colunas numéricas por lançamento:
        Entradas/Saídas (valor da transação) e Saldo (acumulado). O parser
        precisa capturar a primeira, nunca a segunda.
        """
        from financeiro.parsers import parse_btg

        texto = (
            ' 09/07/2026                       Valor de Rendimento Remunera+                                                   0,01                                       204,23\n'
            ' 03/07/2026                       Valor de Rendimento Remunera+                                                   0,01                                       204,22\n'
        )
        resultado = parse_btg(texto, ano=2026)

        self.assertEqual(len(resultado), 2)
        for item in resultado:
            self.assertEqual(item['valor'], Decimal('0.01'))
            self.assertEqual(item['tipo'], 'ENTRADA')

    def test_linha_de_saida_com_duas_colunas(self):
        from financeiro.parsers import parse_btg

        texto = ' 10/06/2026                       Debito Conta Corrente - Aplicacao                                                -200,00                                     4,09\n'
        resultado = parse_btg(texto, ano=2026)

        self.assertEqual(len(resultado), 1)
        self.assertEqual(resultado[0]['valor'], Decimal('200.00'))
        self.assertEqual(resultado[0]['tipo'], 'SAIDA')

    def test_linha_com_apenas_uma_coluna_numerica(self):
        """Formato antigo/alternativo sem coluna de saldo continua funcionando."""
        from financeiro.parsers import parse_btg

        texto = ' 15/06/2026                       Transferencia Enviada                                                            -50,00\n'
        resultado = parse_btg(texto, ano=2026)

        self.assertEqual(len(resultado), 1)
        self.assertEqual(resultado[0]['valor'], Decimal('50.00'))
        self.assertEqual(resultado[0]['tipo'], 'SAIDA')

    def test_linhas_de_saldo_sao_ignoradas(self):
        from financeiro.parsers import parse_btg

        texto = (
            ' 14/07/2026                       Saldo de fechamento                                                                                                        204,23\n'
            ' 01/07/2026                       Saldo de abertura                                                                                                          204,21\n'
        )
        resultado = parse_btg(texto, ano=2026)
        self.assertEqual(resultado, [])


# ──────────────────────────────────────────────────────────────────────────────
# LivroCaixa — regressão: cadeia de saldo correta mesmo com inserção fora de ordem
# ──────────────────────────────────────────────────────────────────────────────

class LivroCaixaOrdemCronologicaTest(APITestCase):

    def test_aportes_criados_fora_de_ordem_geram_cadeia_cronologica_correta(self):
        """
        _ultimo_saldo() usa o lançamento de maior data já existente. Se vários
        lançamentos históricos forem criados em lote fora de ordem cronológica
        (ex: conciliar_extrato processando um extrato do mais recente pro mais
        antigo), a cadeia de saldo_anterior/saldo_atual não pode se corromper.
        """
        conta = make_conta(saldo_inicial=Decimal('100.00'))

        # Cria em ordem DECRESCENTE de data (o cenário que corrompia a cadeia)
        Aporte.objects.create(conta=conta, tipo='CAPITAL_SOCIAL', descricao='dia 29', valor=Decimal('10.00'), data=date(2026, 6, 29))
        Aporte.objects.create(conta=conta, tipo='CAPITAL_SOCIAL', descricao='dia 23', valor=Decimal('20.00'), data=date(2026, 6, 23))
        Aporte.objects.create(conta=conta, tipo='CAPITAL_SOCIAL', descricao='dia 17', valor=Decimal('30.00'), data=date(2026, 6, 17))

        lancamentos = list(LivroCaixa.objects.filter(conta=conta).order_by('data', 'criado_em'))
        self.assertEqual(len(lancamentos), 3)

        saldo = Decimal('100.00')
        for lc in lancamentos:
            self.assertEqual(lc.saldo_anterior, saldo)
            saldo += lc.valor
            self.assertEqual(lc.saldo_atual, saldo)

        self.assertEqual(saldo, Decimal('160.00'))


# ──────────────────────────────────────────────────────────────────────────────
# conciliar_extrato --auto — Aporte vs Receita Financeira
# ──────────────────────────────────────────────────────────────────────────────

class ConciliarExtratoClassificacaoTest(APITestCase):
    """
    Rendimento de conta remunerada é receita financeira, não aporte de sócio.
    Um vira Patrimônio Líquido (nunca entra no DRE), o outro é receita de
    verdade (entra no DRE, separado da receita operacional). Confundir os
    dois distorce o resultado do negócio no relatório.
    """

    def test_padrao_receita_financeira_cria_receita_nao_aporte(self):
        from financeiro.management.commands.conciliar_extrato import Command

        conta = make_conta(nome='BTG')
        PadraoSeguroConciliacao.objects.create(
            descricao_padrao='rendimento remunera', tipo='ENTRADA',
            natureza='RECEITA_FINANCEIRA', ativo=True,
        )
        conc = ConciliacaoExtrato.objects.create(
            conta=conta, arquivo='x.pdf', periodo=date(2026, 8, 1), status='PENDENTE',
        )
        item = {
            'data_banco': date(2026, 8, 5),
            'descricao_banco': 'Valor de Rendimento Remunera+',
            'valor': Decimal('0.01'),
            'tipo': 'ENTRADA',
        }
        ItemConciliacao.objects.create(
            conciliacao=conc, data_banco=item['data_banco'],
            descricao_banco=item['descricao_banco'], valor=item['valor'],
            tipo=item['tipo'], status='FALTANDO_SISTEMA',
        )

        Command()._auto_processar([item], conta, conc)

        self.assertFalse(Aporte.objects.filter(descricao__icontains='Rendimento').exists())
        receita = Receita.objects.get(descricao__icontains='Rendimento')
        self.assertEqual(receita.tipo, 'RECEITA_FINANCEIRA')
        self.assertEqual(receita.status, 'RECEBIDO')
        self.assertEqual(receita.valor_bruto, Decimal('0.01'))

    def test_padrao_aporte_continua_criando_aporte(self):
        from financeiro.management.commands.conciliar_extrato import Command

        conta = make_conta(nome='BTG')
        PadraoSeguroConciliacao.objects.create(
            descricao_padrao='aporte teste padrao', tipo='ENTRADA',
            natureza='APORTE', ativo=True,
        )
        conc = ConciliacaoExtrato.objects.create(
            conta=conta, arquivo='x.pdf', periodo=date(2026, 8, 1), status='PENDENTE',
        )
        item = {
            'data_banco': date(2026, 8, 5),
            'descricao_banco': 'Aporte Teste Padrao Recebido',
            'valor': Decimal('50.00'),
            'tipo': 'ENTRADA',
        }
        ItemConciliacao.objects.create(
            conciliacao=conc, data_banco=item['data_banco'],
            descricao_banco=item['descricao_banco'], valor=item['valor'],
            tipo=item['tipo'], status='FALTANDO_SISTEMA',
        )

        Command()._auto_processar([item], conta, conc)

        self.assertTrue(Aporte.objects.filter(descricao__icontains='Aporte Teste Padrao').exists())
        self.assertFalse(Receita.objects.filter(descricao__icontains='Aporte Teste Padrao').exists())


# ──────────────────────────────────────────────────────────────────────────────
# DRE — Receita Operacional separada de Receita Financeira
# ──────────────────────────────────────────────────────────────────────────────

class DreReceitaFinanceiraTest(APITestCase):

    def test_receita_financeira_nao_entra_em_receita_operacional(self):
        admin = make_user('admin@uid.com', 'ADMIN')
        conta = make_conta()

        Receita.objects.create(
            descricao='Mensalidade cliente', tipo='MENSALIDADE', status='RECEBIDO',
            conta=conta, valor_bruto=Decimal('300.00'),
            vencimento=date(2026, 8, 5), recebimento=date(2026, 8, 5),
        )
        Receita.objects.create(
            descricao='Rendimento aplicacao', tipo='RECEITA_FINANCEIRA', status='RECEBIDO',
            conta=conta, valor_bruto=Decimal('0.05'),
            vencimento=date(2026, 8, 10), recebimento=date(2026, 8, 10),
        )

        self.client.force_authenticate(admin)
        res = self.client.get(reverse('dre'), {'ano': 2026})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        mes_ago = res.data['meses'][7]  # agosto = index 7
        self.assertEqual(Decimal(str(mes_ago['receita_operacional'])), Decimal('300.00'))
        self.assertEqual(Decimal(str(mes_ago['receita_financeira'])), Decimal('0.05'))
        self.assertEqual(Decimal(str(mes_ago['receita_bruta'])), Decimal('300.05'))
