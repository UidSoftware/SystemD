import { useState, useEffect, useCallback, useRef } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_BADGE = {
  PENDENTE:   { bg: 'rgba(234,179,8,0.15)',   color: '#eab308' },
  EM_ROTA:    { bg: 'rgba(6,59,248,0.15)',     color: '#6b8fff' },
  ENTREGUE:   { bg: 'rgba(16,185,129,0.15)',   color: '#10b981' },
  DEVOLVIDO:  { bg: 'rgba(249,115,22,0.15)',   color: '#f97316' },
  CANCELADO:  { bg: 'rgba(239,68,68,0.15)',    color: '#f87171' },
}

const CONF_BADGE = {
  PENDENTE:       { bg: 'rgba(234,179,8,0.12)',  color: '#eab308', label: 'Pendente' },
  CONFIRMADA:     { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Confirmada' },
  NAO_CONFIRMADA: { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', label: 'Não confirmada' },
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#f1f5f9',
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: '#a78bca',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 14px',
  fontSize: 13,
  color: '#e2e8f0',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  whiteSpace: 'nowrap',
}

const ENTREGA_VAZIA = {
  empresa: '', data: '', hora: '', origem: '', destino: '',
  descricao: '', status: 'PENDENTE', observacoes: '',
}

export default function EntregasPage() {
  const { usuario, accessToken } = useAuth()
  const isCliente = usuario?.perfil === 'CLIENTE'
  const isAdmin = usuario?.perfil === 'ADMIN'
  const isInterno = !isCliente

  const [entregas, setEntregas] = useState([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [clientes, setClientes] = useState([])

  const [filtros, setFiltros] = useState({ data_inicio: '', data_fim: '', origem: '', destino: '', status: '', empresa: '' })
  const [filtrosAtivos, setFiltrosAtivos] = useState({})

  const [modal, setModal] = useState(null)
  const [modalMotivo, setModalMotivo] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const tokenRef = useRef(accessToken)
  useEffect(() => { tokenRef.current = accessToken }, [accessToken])
  const authHeader = () => tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}

  const carregar = useCallback(async (pag = 1, f = filtrosAtivos) => {
    if (!tokenRef.current) return
    setCarregando(true)
    try {
      const params = { page: pag, ...f }
      const res = await api.get('/entregas/', { params, headers: authHeader() })
      setEntregas(res.data.results)
      setTotal(res.data.count)
      setTotalPaginas(Math.ceil(res.data.count / 20))
    } finally {
      setCarregando(false)
    }
  }, [filtrosAtivos])

  useEffect(() => {
    if (!accessToken) return
    carregar()
    if (isInterno) {
      api.get('/clientes/', { params: { ativo: true, page_size: 200 }, headers: authHeader() })
        .then(r => setClientes(r.data.results || r.data))
        .catch(() => {})
    }
  }, [accessToken])

  const filtrar = () => {
    const f = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''))
    setFiltrosAtivos(f)
    setPagina(1)
    carregar(1, f)
  }

  const limpar = () => {
    setFiltros({ data_inicio: '', data_fim: '', origem: '', destino: '', status: '', empresa: '' })
    setFiltrosAtivos({})
    setPagina(1)
    carregar(1, {})
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      await api.post('/entregas/', modal)
      setModal(null)
      carregar(pagina)
    } finally {
      setSalvando(false)
    }
  }

  const confirmar = async (entrega) => {
    await api.patch(`/entregas/${entrega.id}/confirmar/`, { confirmacao: 'CONFIRMADA' })
    carregar(pagina)
  }

  const naoConfirmar = async () => {
    if (!motivo.trim()) return
    await api.patch(`/entregas/${modalMotivo.id}/confirmar/`, { confirmacao: 'NAO_CONFIRMADA', confirmacao_motivo: motivo })
    setModalMotivo(null)
    setMotivo('')
    carregar(pagina)
  }

  const exportar = async (tipo) => {
    const params = new URLSearchParams({ ...filtrosAtivos })
    const url = `/entregas/exportar/${tipo}/?${params.toString()}`
    const res = await api.get(url, { responseType: 'blob' })
    const blob = new Blob([res.data])
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `entregas.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`
    link.click()
  }

  const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    overflow: 'hidden',
  }

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Entregas</h1>
            {isCliente && usuario && (
              <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>{usuario.nome}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => exportar('pdf')}
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
              Exportar PDF
            </button>
            <button onClick={() => exportar('excel')}
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
              Exportar Excel
            </button>
            {isInterno && (
              <button onClick={() => setModal({ ...ENTREGA_VAZIA })}
                style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + Nova entrega
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Data início</label>
              <input type="date" style={inputStyle} value={filtros.data_inicio}
                onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Data fim</label>
              <input type="date" style={inputStyle} value={filtros.data_fim}
                onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Origem</label>
              <input type="text" style={inputStyle} value={filtros.origem}
                onChange={e => setFiltros(f => ({ ...f, origem: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Destino</label>
              <input type="text" style={inputStyle} value={filtros.destino}
                onChange={e => setFiltros(f => ({ ...f, destino: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Status</label>
              <select style={inputStyle} value={filtros.status}
                onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
                <option value="">Todos</option>
                {Object.entries({ PENDENTE: 'Pendente', EM_ROTA: 'Em rota', ENTREGUE: 'Entregue', DEVOLVIDO: 'Devolvido', CANCELADO: 'Cancelado' }).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {isInterno && (
              <div>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Empresa</label>
                <select style={inputStyle} value={filtros.empresa}
                  onChange={e => setFiltros(f => ({ ...f, empresa: e.target.value }))}>
                  <option value="">Todas</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button onClick={filtrar}
                style={{ flex: 1, background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Filtrar
              </button>
              <button onClick={limpar}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 13, cursor: 'pointer' }}>
                Limpar
              </button>
            </div>
          </div>
        </div>

        {/* Contador */}
        <p style={{ fontSize: 13, fontWeight: 700, color: total > 0 ? '#6b8fff' : '#a78bca', marginBottom: 16 }}>
          {total > 0 ? `${total} entrega${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''} neste período` : 'Nenhuma entrega encontrada neste período'}
        </p>

        {/* Tabela */}
        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                {['Data', 'Hora', 'Origem', 'Destino', 'Descrição', 'Status', 'Confirmação', ...(isInterno ? ['Empresa'] : [])].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Carregando...</td></tr>
              ) : entregas.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Nenhuma entrega encontrada</td></tr>
              ) : entregas.map(e => {
                const stBadge = STATUS_BADGE[e.status] || STATUS_BADGE.PENDENTE
                const confBadge = CONF_BADGE[e.confirmacao] || CONF_BADGE.PENDENTE
                return (
                  <tr key={e.id}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(6,59,248,0.06)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>{e.data}</td>
                    <td style={tdStyle}>{e.hora ? e.hora.slice(0, 5) : '—'}</td>
                    <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.origem}</td>
                    <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.destino}</td>
                    <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.descricao || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ background: stBadge.bg, color: stBadge.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                        {e.status_display}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {e.status === 'ENTREGUE' && isCliente ? (
                        e.confirmacao === 'PENDENTE' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => confirmar(e)}
                              style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                              ✓ Confirmar
                            </button>
                            <button onClick={() => { setModalMotivo(e); setMotivo('') }}
                              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                              ✗ Não confirmar
                            </button>
                          </div>
                        ) : (
                          <span title={e.confirmacao_motivo || undefined}
                            style={{ background: confBadge.bg, color: confBadge.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, cursor: e.confirmacao_motivo ? 'help' : 'default' }}>
                            {confBadge.label}
                          </span>
                        )
                      ) : (
                        <span style={{ background: confBadge.bg, color: confBadge.color, borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>
                          {confBadge.label}
                        </span>
                      )}
                    </td>
                    {isInterno && <td style={tdStyle}>{e.empresa_nome}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => { setPagina(p); carregar(p) }}
                  style={{ background: p === pagina ? '#063BF8' : 'rgba(255,255,255,0.06)', color: p === pagina ? '#fff' : '#a78bca', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 13 }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal cadastro */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 520, padding: 28 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Nova Entrega</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Empresa *</label>
              <select value={modal.empresa} onChange={e => setModal(m => ({ ...m, empresa: e.target.value }))} style={inputStyle}>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
              </select>
            </div>

            {[
              { label: 'Data *', field: 'data', type: 'date' },
              { label: 'Hora', field: 'hora', type: 'time' },
              { label: 'Origem *', field: 'origem' },
              { label: 'Destino *', field: 'destino' },
            ].map(({ label, field, type }) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>{label}</label>
                <input type={type || 'text'} value={modal[field] || ''}
                  onChange={e => setModal(m => ({ ...m, [field]: e.target.value }))} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Status *</label>
              <select value={modal.status} onChange={e => setModal(m => ({ ...m, status: e.target.value }))} style={inputStyle}>
                {Object.entries({ PENDENTE: 'Pendente', EM_ROTA: 'Em rota', ENTREGUE: 'Entregue', DEVOLVIDO: 'Devolvido', CANCELADO: 'Cancelado' }).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Descrição</label>
              <textarea value={modal.descricao || ''} rows={3}
                onChange={e => setModal(m => ({ ...m, descricao: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Observações</label>
              <textarea value={modal.observacoes || ''} rows={2}
                onChange={e => setModal(m => ({ ...m, observacoes: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal motivo não confirmação */}
      {modalMotivo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 420, padding: 28 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Por que a entrega não foi confirmada?</h2>
            <p style={{ color: '#a78bca', fontSize: 13, marginBottom: 16 }}>Informe o motivo para registrar a não confirmação.</p>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={4} placeholder="Descreva o problema..."
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalMotivo(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={naoConfirmar} disabled={!motivo.trim()}
                style={{ background: '#f87171', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: motivo.trim() ? 1 : 0.5 }}>
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
