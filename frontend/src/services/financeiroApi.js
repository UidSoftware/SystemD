import api from './api'

const f    = (url, params) => api.get(`/financeiro${url}`, { params })
const post = (url, data)   => api.post(`/financeiro${url}`, data)
const patch = (url, data)  => api.patch(`/financeiro${url}`, data)
const del  = (url)         => api.delete(`/financeiro${url}`)

export const financeiroApi = {
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
  marcarRecebido:        (id, d) => patch(`/receitas/${id}/marcar_recebido/`, d),

  // Despesas
  listarDespesas:        (p) => f('/despesas/', p),
  criarDespesa:          (d) => post('/despesas/', d),
  editarDespesa:         (id, d) => patch(`/despesas/${id}/`, d),
  deletarDespesa:        (id) => del(`/despesas/${id}/`),
  marcarPago:            (id, d) => patch(`/despesas/${id}/marcar_pago/`, d),

  // Livro Caixa
  listarLivroCaixa:      (p) => f('/livro-caixa/', p),
  criarLancamento:       (d) => post('/livro-caixa/', d),
  totaisLivroCaixa:      (p) => f('/livro-caixa/totais/', p),
  estornar:              (id, d) => post(`/livro-caixa/${id}/estornar/`, d),

  // Views calculadas
  fluxoCaixa:            (p) => f('/fluxo-caixa/', p),
  dre:                   (p) => f('/dre/', p),
  receitaPorCliente:     (p) => f('/receita-por-cliente/', p),
}
