from decimal import Decimal

from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.test import APITestCase

from usuarios.models import Usuario
from produtos.models import Combo, ItemCombo, Produto


def make_user(email, perfil):
    return Usuario.objects.create_user(email=email, nome=perfil, password='s', perfil=perfil)


def make_produto(nome='Produto Teste', preco=Decimal('100.00')):
    return Produto.objects.create(nome=nome, tipo='SERVICO', preco_padrao=preco)


class ComboAPITest(APITestCase):

    def setUp(self):
        self.admin = make_user('admin_combo@uid.com', 'ADMIN')
        self.op = make_user('op_combo@uid.com', 'OPERACIONAL')
        self.fin = make_user('fin_combo@uid.com', 'FINANCEIRO')
        self.cliente = make_user('cliente_combo@uid.com', 'CLIENTE')
        self.p1 = make_produto('Site Institucional', Decimal('450.00'))
        self.p2 = make_produto('Hospedagem 1 ano', Decimal('180.00'))
        self.url = '/api/combos/'

    # RF01/RF02 — criar combo com 2+ itens, valor_total bate com a soma
    def test_criar_combo_com_itens_calcula_valor_total(self):
        self.client.force_authenticate(self.admin)
        payload = {
            'nome': 'Combo Site + Hospedagem',
            'descricao': 'Pacote completo',
            'itens': [
                {'produto': self.p1.id, 'quantidade': '1', 'valor_unitario': '450.00'},
                {'produto': self.p2.id, 'quantidade': '1', 'valor_unitario': '180.00'},
            ],
        }
        res = self.client.post(self.url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(Decimal(res.data['valor_total']), Decimal('630.00'))
        self.assertEqual(len(res.data['itens']), 2)
        combo = Combo.objects.get(pk=res.data['id'])
        self.assertEqual(combo.criado_por, self.admin)
        self.assertTrue(combo.ativo)

    # RN01 — sem itens -> 400
    def test_criar_combo_sem_itens_retorna_400(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url, {'nome': 'Combo vazio', 'itens': []}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # RN02 — quantidade 0 -> 400
    def test_criar_item_quantidade_zero_retorna_400(self):
        self.client.force_authenticate(self.admin)
        payload = {
            'nome': 'Combo qtd invalida',
            'itens': [{'produto': self.p1.id, 'quantidade': '0', 'valor_unitario': '450.00'}],
        }
        res = self.client.post(self.url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_criar_item_quantidade_negativa_retorna_400(self):
        self.client.force_authenticate(self.admin)
        payload = {
            'nome': 'Combo qtd negativa',
            'itens': [{'produto': self.p1.id, 'quantidade': '-1', 'valor_unitario': '450.00'}],
        }
        res = self.client.post(self.url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # RF07 — editar combo (itens substituídos)
    def test_editar_combo_substitui_itens(self):
        self.client.force_authenticate(self.admin)
        combo = Combo.objects.create(nome='Combo Original', criado_por=self.admin)
        ItemCombo.objects.create(combo=combo, produto=self.p1, quantidade=1, valor_unitario=Decimal('450.00'))

        payload = {
            'nome': 'Combo Editado',
            'itens': [{'produto': self.p2.id, 'quantidade': '2', 'valor_unitario': '180.00'}],
        }
        res = self.client.patch(f'{self.url}{combo.id}/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        combo.refresh_from_db()
        self.assertEqual(combo.nome, 'Combo Editado')
        self.assertEqual(combo.itens.count(), 1)
        self.assertEqual(combo.itens.first().produto, self.p2)
        self.assertEqual(combo.valor_total, Decimal('360.00'))

    # RN03/RN09 — soft delete
    def test_desativar_combo_e_soft_delete(self):
        self.client.force_authenticate(self.admin)
        combo = Combo.objects.create(nome='Combo a desativar', criado_por=self.admin)
        ItemCombo.objects.create(combo=combo, produto=self.p1, quantidade=1, valor_unitario=Decimal('450.00'))

        res = self.client.delete(f'{self.url}{combo.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        combo.refresh_from_db()
        self.assertFalse(combo.ativo)

        res = self.client.get(self.url)
        ids = [c['id'] for c in res.data['results']] if 'results' in res.data else [c['id'] for c in res.data]
        self.assertNotIn(combo.id, ids)

    # Desativar produto referenciado nao afeta combo existente
    def test_desativar_produto_nao_afeta_combo_existente(self):
        self.client.force_authenticate(self.admin)
        combo = Combo.objects.create(nome='Combo com produto desativado', criado_por=self.admin)
        ItemCombo.objects.create(combo=combo, produto=self.p1, quantidade=1, valor_unitario=Decimal('450.00'))

        self.p1.ativo = False
        self.p1.save()

        res = self.client.get(f'{self.url}{combo.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['itens'][0]['produto_nome'], 'Site Institucional')

    # RN06 — exclusão física de produto referenciado é protegida
    def test_excluir_fisicamente_produto_referenciado_da_protected_error(self):
        combo = Combo.objects.create(nome='Combo protegido', criado_por=self.admin)
        ItemCombo.objects.create(combo=combo, produto=self.p1, quantidade=1, valor_unitario=Decimal('450.00'))
        with self.assertRaises(ProtectedError):
            self.p1.delete()

    # RN05 — valor_unitario e snapshot, nao recalcula com base no preco_padrao atual
    def test_valor_unitario_e_snapshot_nao_muda_com_reajuste_produto(self):
        self.client.force_authenticate(self.admin)
        combo = Combo.objects.create(nome='Combo snapshot', criado_por=self.admin)
        item = ItemCombo.objects.create(combo=combo, produto=self.p1, quantidade=1, valor_unitario=Decimal('450.00'))

        self.p1.preco_padrao = Decimal('999.00')
        self.p1.save()

        item.refresh_from_db()
        self.assertEqual(item.valor_unitario, Decimal('450.00'))
        self.assertEqual(combo.valor_total, Decimal('450.00'))

    # Permissões — ADMIN e OPERACIONAL têm acesso
    def test_operacional_pode_criar_combo(self):
        self.client.force_authenticate(self.op)
        payload = {
            'nome': 'Combo Operacional',
            'itens': [{'produto': self.p1.id, 'quantidade': '1', 'valor_unitario': '450.00'}],
        }
        res = self.client.post(self.url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    # Permissões — FINANCEIRO e CLIENTE bloqueados em qualquer verbo
    def test_financeiro_sem_acesso(self):
        self.client.force_authenticate(self.fin)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.post(self.url, {'nome': 'x', 'itens': []}, format='json').status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_cliente_sem_acesso(self):
        self.client.force_authenticate(self.cliente)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)

    def test_anonimo_sem_acesso(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
