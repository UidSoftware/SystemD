import api from './api'

const f = (url, params) => api.get(`/financeiro${url}`, { params })
const post = (url, data) => api.post(`/financeiro${url}`, data)
const patch = (url, data) => api.patch(`/financeiro${url}`, data)
const del = (url) => api.delete(`/financeiro${url}`)

export const financeiroApi = {
  // Contas bancárias
  listarContas:         (p) => f('/contas/', p),
  criarConta:           (d) => post('/contas/', d),
  editarConta:          (id, d) => patch(`/contas/${id}/`, d),
  deletarConta:         (id) => del(`/contas/${id}/`),

  // Plano de Contas
  listarPlanoContas:    (p) => f('/plano-contas/', p),
  criarPlanoContas:     (d) => post('/plano-contas/', d),
  editarPlanoContas:    (id, d) => patch(`/plano-contas/${id}/`, d),
  deletarPlanoContas:   (id) => del(`/plano-contas/${id}/`),

  // Fornecedores
  listarFornecedores:   (p) => f('/fornecedores/', p),
  criarFornecedor:      (d) => post('/fornecedores/', d),
  editarFornecedor:     (id, d) => patch(`/fornecedores/${id}/`, d),
  deletarFornecedor:    (id) => del(`/fornecedores/${id}/`),

  // Serviços
  listarServicos:       (p) => f('/servicos-produtos/', p),
  criarServico:         (d) => post('/servicos-produtos/', d),
  editarServico:        (id, d) => patch(`/servicos-produtos/${id}/`, d),
  deletarServico:       (id) => del(`/servicos-produtos/${id}/`),

  // Produtos
  listarProdutos:       (p) => f('/produtos/', p),
  criarProduto:         (d) => post('/produtos/', d),
  editarProduto:        (id, d) => patch(`/produtos/${id}/`, d),
  deletarProduto:       (id) => del(`/produtos/${id}/`),
  alertasEstoque:       () => f('/produtos/alertas-estoque/'),

  // Contas a Pagar
  listarContasPagar:    (p) => f('/contas-pagar/', p),
  criarContaPagar:      (d) => post('/contas-pagar/', d),
  editarContaPagar:     (id, d) => patch(`/contas-pagar/${id}/`, d),
  deletarContaPagar:    (id) => del(`/contas-pagar/${id}/`),

  // Contas a Receber
  listarContasReceber:  (p) => f('/contas-receber/', p),
  criarContaReceber:    (d) => post('/contas-receber/', d),
  editarContaReceber:   (id, d) => patch(`/contas-receber/${id}/`, d),
  deletarContaReceber:  (id) => del(`/contas-receber/${id}/`),

  // Planos
  listarPlanos:         (p) => f('/planos-pagamentos/', p),
  criarPlano:           (d) => post('/planos-pagamentos/', d),
  editarPlano:          (id, d) => patch(`/planos-pagamentos/${id}/`, d),
  deletarPlano:         (id) => del(`/planos-pagamentos/${id}/`),

  // Cliente-Plano
  listarClientePlanos:  (p) => f('/cliente-plano/', p),
  criarClientePlano:    (d) => post('/cliente-plano/', d),
  editarClientePlano:   (id, d) => patch(`/cliente-plano/${id}/`, d),
  deletarClientePlano:  (id) => del(`/cliente-plano/${id}/`),

  // Livro Caixa
  listarLivroCaixa:     (p) => f('/livro-caixa/', p),
  criarLancamento:      (d) => post('/livro-caixa/', d),
  totaisLivroCaixa:     (p) => f('/livro-caixa/totais/', p),

  // Folha de Pagamento
  listarFolha:          (p) => f('/folha-pagamento/', p),
  criarFolha:           (d) => post('/folha-pagamento/', d),
  editarFolha:          (id, d) => patch(`/folha-pagamento/${id}/`, d),
  deletarFolha:         (id) => del(`/folha-pagamento/${id}/`),

  // Pedidos
  listarPedidos:        (p) => f('/pedidos/', p),
  criarPedido:          (d) => post('/pedidos/', d),
  confirmarPedido:      (id) => post(`/pedidos/${id}/confirmar/`),
  deletarPedido:        (id) => del(`/pedidos/${id}/`),

  // Transferência
  transferir:           (d) => post('/transferencia/', d),

  // Gerar mensalidades
  gerarMensalidades:    (d) => post('/gerar-mensalidades/', d),

  // Relatórios
  dre:                  (p) => f('/relatorios/dre/', p),
  fluxoCaixa:           (p) => f('/relatorios/fluxo-caixa/', p),
  extrato:              (p) => f('/relatorios/extrato/', p),
}
