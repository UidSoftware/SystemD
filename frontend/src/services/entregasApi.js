import api from './api'

export const entregasApi = {
  listarUnidades:  (params) => api.get('/unidades/', { params }),
  criarUnidade:    (data)   => api.post('/unidades/', data),
  editarUnidade:   (id, data) => api.patch(`/unidades/${id}/`, data),
  excluirUnidade:  (id)     => api.delete(`/unidades/${id}/`),

  listar:  (params) => api.get('/entregas/', { params }),
  criar:   (data)   => api.post('/entregas/', data),
  editar:  (id, data) => api.patch(`/entregas/${id}/`, data),
  excluir: (id)     => api.delete(`/entregas/${id}/`),
}
