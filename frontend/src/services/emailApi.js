import api from './api'

export const emailApi = {
  inbox:         (page = 1, pasta = 'INBOX') => api.get(`/email/inbox/?page=${page}&pasta=${encodeURIComponent(pasta)}`),
  detalhe:       (uid, pasta = 'INBOX')       => api.get(`/email/${uid}/?pasta=${encodeURIComponent(pasta)}`),
  enviar:        (data)                        => api.post('/email/enviar/', data),
  responder:     (uid, data, pasta = 'INBOX')  => api.post(`/email/${uid}/responder/?pasta=${encodeURIComponent(pasta)}`, data),
  deletar:       (uid, pasta = 'INBOX')        => api.delete(`/email/${uid}/deletar/?pasta=${encodeURIComponent(pasta)}`),
  arquivar:      (uid, pasta = 'INBOX')        => api.post(`/email/${uid}/arquivar/?pasta=${encodeURIComponent(pasta)}`),
  downloadAnexo: (uid, indice = 0, pasta = 'INBOX') => api.get(
    `/email/${uid}/anexo/?indice=${indice}&pasta=${encodeURIComponent(pasta)}`,
    { responseType: 'blob' }
  ),
  pastas:        ()                            => api.get('/email/pastas/'),
}
