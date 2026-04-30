import api from './api'

export const emailApi = {
  inbox:     (page = 1) => api.get(`/email/inbox/?page=${page}`),
  detalhe:   (uid)      => api.get(`/email/${uid}/`),
  enviar:    (data)     => api.post('/email/enviar/', data),
  responder: (uid, data)=> api.post(`/email/${uid}/responder/`, data),
  deletar:   (uid)      => api.delete(`/email/${uid}/deletar/`),
  pastas:    ()         => api.get('/email/pastas/'),
}
