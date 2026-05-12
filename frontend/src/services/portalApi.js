import api from './api'

export const portalApi = {
  listarProjetos:  () => api.get('/os/?cliente=me'),
  listarChamados:  () => api.get('/suporte/?cliente=me'),
  abrirChamado:    (data) => api.post('/suporte/', data),
  listarFaturas:   () => api.get('/financeiro/faturas/?cliente=me'),
}
