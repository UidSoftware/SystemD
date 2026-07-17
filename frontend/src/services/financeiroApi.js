import api from './api'

const f     = (url, params) => api.get(`/financeiro${url}`, { params })
const post  = (url, data)   => api.post(`/financeiro${url}`, data)
const patch = (url, data)   => api.patch(`/financeiro${url}`, data)
const del   = (url)         => api.delete(`/financeiro${url}`)

export const financeiroApi = {
  // Categorias
  listarCategorias:      (p) => f('/categorias/', p),
  criarCategoria:        (d) => post('/categorias/', d),
  editarCategoria:       (id, d) => patch(`/categorias/${id}/`, d),

  // Contas
  listarContas:          (p) => f('/contas/', p),
  criarConta:            (d) => post('/contas/', d),
  editarConta:           (id, d) => patch(`/contas/${id}/`, d),
  deletarConta:          (id) => del(`/contas/${id}/`),

  // Aportes
  listarAportes:         (p) => f('/aportes/', p),
  criarAporte:           (d) => post('/aportes/', d),
  editarAporte:          (id, d) => patch(`/aportes/${id}/`, d),
  deletarAporte:         (id) => del(`/aportes/${id}/`),

  // Receitas
  listarReceitas:        (p) => f('/receitas/', p),
  criarReceita:          (d) => post('/receitas/', d),
  editarReceita:         (id, d) => patch(`/receitas/${id}/`, d),
  deletarReceita:        (id) => del(`/receitas/${id}/`),
  marcarRecebido:        (id, d) => patch(`/receitas/${id}/receber/`, d),
  gerarRecibo:           (id) => api.get(`/financeiro/receitas/${id}/recibo/`, { responseType: 'blob' }),

  // Despesas
  listarDespesas:        (p) => f('/despesas/', p),
  criarDespesa:          (d) => post('/despesas/', d),
  editarDespesa:         (id, d) => patch(`/despesas/${id}/`, d),
  deletarDespesa:        (id) => del(`/despesas/${id}/`),
  marcarPago:            (id, d) => patch(`/despesas/${id}/pagar/`, d),
  estornarDespesa:       (id, d) => post(`/despesas/${id}/estornar/`, d),
  transferir:            (id, d) => post(`/contas/${id}/transferir/`, d),
  listarFornecedores:    (p) => f('/fornecedores/', p),
  criarFornecedor:       (d) => post('/fornecedores/', d),
  editarFornecedor:      (id, d) => patch(`/fornecedores/${id}/`, d),
  deletarFornecedor:     (id) => del(`/fornecedores/${id}/`),

  // Livro Caixa
  listarLivroCaixa:      (p) => f('/livro-caixa/', p),
  criarLancamento:       (d) => post('/livro-caixa/', d),
  totaisLivroCaixa:      (p) => f('/livro-caixa/totais/', p),
  estornar:              (id, d) => post(`/livro-caixa/${id}/estornar/`, d),

  // Conciliação Bancária
  listarConciliacoes:          (p) => f('/conciliacoes/', p),
  detalharConciliacao:         (id) => f(`/conciliacoes/${id}/`),
  processarConciliacao:        (d) => post('/conciliacoes/processar/', d),
  confirmarConciliacao:        (id, d) => post(`/conciliacoes/${id}/confirmar/`, d),
  listarConciliacoesPendentes: () => f('/conciliacoes/pendentes/'),

  // Padrões seguros de conciliação
  listarPadroesSeguros:  (p) => f('/padroes-seguros-conciliacao/', p),
  criarPadraoSeguro:     (d) => post('/padroes-seguros-conciliacao/', d),
  deletarPadraoSeguro:   (id) => del(`/padroes-seguros-conciliacao/${id}/`),

  // Helpers para selects em formularios financeiros
  listarClientesOpts:    (p) => api.get('/clientes/', { params: p }),
  listarOSOpts:          (p) => api.get('/os/', { params: p }),

  // Views calculadas
  dashboard:             ()  => f('/dashboard/'),
  fluxoCaixa:            (p) => f('/fluxo-caixa/', p),
  dre:                   (p) => f('/dre/', p),
  receitaPorCliente:     (p) => f('/receita-por-cliente/', p),
}
