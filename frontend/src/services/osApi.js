import api from './api'

export const osApi = {
  listar:          (params) => api.get('/os/', { params }),
  criar:           (data)   => api.post('/os/', data),
  detalhe:         (id)     => api.get(`/os/${id}/`),
  editar:          (id, d)  => api.patch(`/os/${id}/`, d),
  avancar:         (id, d)  => api.post(`/os/${id}/avancar/`, d),
  cancelar:        (id, d)  => api.post(`/os/${id}/cancelar/`, d),
  deletar:         (id)     => api.delete(`/os/${id}/`),

  // Contrato
  getContrato:     (osId)   => api.get(`/os/${osId}/contrato/`),
  criarContrato:   (osId, d) => api.post(`/os/${osId}/contrato/`, d),
  editarContrato:  (osId, id, d) => api.patch(`/os/${osId}/contrato/${id}/`, d),

  // Chamados
  listarChamados:  (osId)   => api.get(`/os/${osId}/chamados/`),
  criarChamado:    (osId, d) => api.post(`/os/${osId}/chamados/`, d),
  editarChamado:   (osId, id, d) => api.patch(`/os/${osId}/chamados/${id}/`, d),

  // Mensagens
  listarMensagens: (chamadoId)    => api.get(`/chamados/${chamadoId}/mensagens/`),
  enviarMensagem:  (chamadoId, d) => api.post(`/chamados/${chamadoId}/mensagens/`, d),

  // Chamados globais (portal cliente)
  listarChamadosGlobal: (params) => api.get('/chamados/', { params }),
  criarChamadoGlobal:   (data)   => api.post('/chamados/', data),
}
