import api from './api'

export const adminApi = {
  // Usuários
  listarUsuarios: (params) => api.get('/auth/usuarios/', { params }),
  criarUsuario:   (data)   => api.post('/auth/usuarios/', data),
  editarUsuario:  (id, data) => api.patch(`/auth/usuarios/${id}/`, data),
  desativarUsuario:(id)    => api.delete(`/auth/usuarios/${id}/`),

  // Setores
  listarSetores:  (params) => api.get('/auth/setores/', { params }),
  criarSetor:     (data)   => api.post('/auth/setores/', data),
  editarSetor:    (id, data) => api.patch(`/auth/setores/${id}/`, data),
  desativarSetor: (id)     => api.delete(`/auth/setores/${id}/`),
}
