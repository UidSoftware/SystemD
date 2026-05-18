import { useState, useEffect, useCallback, useRef } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_BADGE = {
  PENDENTE:  { bg: 'rgba(234,179,8,0.15)',   color: '#eab308' },
  EM_ROTA:   { bg: 'rgba(6,59,248,0.15)',     color: '#6b8fff' },
  ENTREGUE:  { bg: 'rgba(16,185,129,0.15)',   color: '#10b981' },
  DEVOLVIDO: { bg: 'rgba(249,115,22,0.15)',   color: '#f97316' },
  CANCELADO: { bg: 'rgba(239,68,68,0.15)',    color: '#f87171' },
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
  empresa: '', data: '', hora: '', solicitante: '',
  unidade: '', de: '', para: '',
  descricao: '', motoboy: '', status: 'PENDENTE', observacoes: '',
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
  const [unidades, setUnidades] = useState([])

  const [filtros, setFiltros] = useState({ data_inicio: '', data_fim: '', status: '', empresa: '' })
  const [filtrosAtivos, setFiltrosAtivos] = useState({})

  const [modal, setModal] = useState(null)
  const [editandoId, setEditandoId] = useState(null)
  const [modalMotivo, setModalMotivo] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [modalUnidades, setModalUnidades] = useState(false)
  const [unidadeForm, setUnidadeForm] = useState({ nome: '', ativo: true })
  const [editandoUnidade, setEditandoUnidade] = useState(null)
  const [salvandoUnidade, setSalvandoUnidade] = useState(false)
  const [erroUnidade, setErroUnidade] = useState('')

  const tokenRef = useRef(accessToken)
  useEffect(() => { tokenRef.current = accessToken }, [accessToken])
  const authHeader = () => tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}

  const carregar = useCallback(async (pag = 1, f = filtrosAtivos) => {
    if (!tokenRef.current) return
    setCarregando(true)
    try {
      const res = await api.get('/entregas/', { params: { page: pag, ...f }, headers: authHeader() })
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
    api.get('/unidades/', { params: { ativas: 1 }, headers: authHeader() })
      .then(r => setUnidades(r.data.results ?? r.data))
      .catch(() => {})
    if (isInterno) {
      api.get('/clientes/', { params: { ativo: true, page_size: 200 }, headers: authHeader() })
        .then(r => setClientes(r.data.results ?? r.data))
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
    setFiltros({ data_inicio: '', data_fim: '', status: '', empresa: '' })
    setFiltrosAtivos({})
    setPagina(1)
    carregar(1, {})
  }

  const abrirNovo = () => {
    setEditandoId(null)
    setModal({ ...ENTREGA_VAZIA })
    setErro('')
  }

  const abrirEdicao = (e) => {
    setEditandoId(e.id)
    setModal({
      empresa: e.empresa,
      data: e.data,
      hora: e.hora?.slice(0, 5) ?? '',
      solicitante: e.solicitante,
      unidade: e.unidade,
      de: e.de,
      para: e.para,
      descricao: e.descricao,
      motoboy: e.motoboy,
      status: e.status,
      observacoes: e.observacoes,
    })
    setErro('')
  }

  const salvar = async () => {
    const { empresa, data, solicitante, unidade, de, para, motoboy } = modal
    if (!empresa || !data || !solicitante || !unidade || !de || !para || !motoboy) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      if (editandoId) {
        await api.patch(`/entregas/${editandoId}/`, modal, { headers: authHeader() })
      } else {
        await api.post('/entregas/', modal, { headers: authHeader() })
      }
      setModal(null)
      setEditandoId(null)
      carregar(pagina)
    } catch (err) {
      const d = err.response?.data
      setErro(d ? Object.values(d).flat().join(' ') : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (e) => {
    if (!confirm(`Excluir entrega de "${e.solicitante}" em ${e.data}?`)) return
    try {
      await api.delete(`/entregas/${e.id}/`, { headers: authHeader() })
      carregar(pagina)
    } catch {
      alert('Erro ao excluir.')
    }
  }

  const confirmar = async (entrega) => {
    await api.patch(`/entregas/${entrega.id}/confirmar/`, { confirmacao: 'CONFIRMADA' }, { headers: authHeader() })
    carregar(pagina)
  }

  const naoConfirmar = async () => {
    if (!motivo.trim()) return
    await api.patch(`/entregas/${modalMotivo.id}/confirmar/`, { confirmacao: 'NAO_CONFIRMADA', confirmacao_motivo: motivo }, { headers: authHeader() })
    setModalMotivo(null)
    setMotivo('')
    carregar(pagina)
  }

  const recarregarUnidades = () =>
    api.get('/unidades/', { params: { ativas: 1 }, headers: authHeader() })
      .then(r => setUnidades(r.data.results ?? r.data))
      .catch(() => {})

  const abrirNovaUnidade = () => {
    setEditandoUnidade(null)
    setUnidadeForm({ nome: '', ativo: true })
    setErroUnidade('')
  }

  const editarUnidade = (u) => {
    setEditandoUnidade(u)
    setUnidadeForm({ nome: u.nome, ativo: u.ativo })
    setErroUnidade('')
  }

  const salvarUnidade = async () => {
    if (!unidadeForm.nome.trim()) { setErroUnidade('Nome é obrigatório.'); return }
    setSalvandoUnidade(true)
    setErroUnidade('')
    try {
      if (editandoUnidade) {
        await api.patch(`/unidades/${editandoUnidade.id}/`, unidadeForm, { headers: authHeader() })
      } else {
        await api.post('/unidades/', unidadeForm, { headers: authHeader() })
      }
      setEditandoUnidade(null)
      setUnidadeForm({ nome: '', ativo: true })
      api.get('/unidades/', { headers: authHeader() })
        .then(r => setUnidades(r.data.results ?? r.data))
        .catch(() => {})
    } catch (err) {
      const d = err.response?.data
      setErroUnidade(d ? Object.values(d).flat().join(' ') : 'Erro ao salvar.')
    } finally {
      setSalvandoUnidade(false)
    }
  }

  const desativarUnidade = async (u) => {
    if (!confirm(`Desativar "${u.nome}"?`)) return
    await api.delete(`/unidades/${u.id}/`, { headers: authHeader() })
    api.get('/unidades/', { headers: authHeader() })
      .then(r => setUnidades(r.data.results ?? r.data))
      .catch(() => {})
  }

  const exportar = async (tipo) => {
    const params = new URLSearchParams({ ...filtrosAtivos })
    const res = await api.get(`/entregas/exportar/${tipo}/?${params.toString()}`, { responseType: 'blob', headers: authHeader() })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([res.data]))
    link.download = `entregas.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`
    link.click()
  }

  const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    overflow: 'hidden',
  }

  const colunasInterno = ['Data', 'Hora', 'Solicitante', 'Unidade', 'De', 'Para', 'Descrição', 'Motoboy', 'Status', 'Empresa', 'Ações']
  const colunasCliente = ['Data', 'Hora', 'Solicitante', 'Unidade', 'De', 'Para', 'Descrição', 'Motoboy', 'Status', 'Confirmação']

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 28px', maxWidth: 1500, margin: '0 auto' }}>

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
              <>
                <button onClick={() => { setModalUnidades(true); abrirNovaUnidade() }}
                  style={{ background: 'rgba(107,143,255,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                  ⊡ Unidades
                </button>
                <button onClick={abrirNovo}
                  style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  + Nova entrega
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 20, overflow: 'visible' }}>
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
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Status</label>
              <select style={inputStyle} value={filtros.status}
                onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
                <option value="">Todos</option>
                {[['PENDENTE','Pendente'],['EM_ROTA','Em rota'],['ENTREGUE','Entregue'],['DEVOLVIDO','Devolvido'],['CANCELADO','Cancelado']].map(([v,l]) => (
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

        <p style={{ fontSize: 13, fontWeight: 700, color: total > 0 ? '#6b8fff' : '#a78bca', marginBottom: 16 }}>
          {total > 0 ? `${total} entrega${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}` : 'Nenhuma entrega encontrada'}
        </p>

        {/* Tabela */}
        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr>
                {(isInterno ? colunasInterno : colunasCliente).map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={11} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Carregando...</td></tr>
              ) : entregas.length === 0 ? (
                <tr><td colSpan={11} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Nenhuma entrega encontrada</td></tr>
              ) : entregas.map(e => {
                const stBadge = STATUS_BADGE[e.status] || STATUS_BADGE.PENDENTE
                const confBadge = CONF_BADGE[e.confirmacao] || CONF_BADGE.PENDENTE
                return (
                  <tr key={e.id}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(6,59,248,0.06)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>{e.data ? e.data.split('-').reverse().join('/') : '—'}</td>
                    <td style={tdStyle}>{e.hora ? e.hora.slice(0, 5) : '—'}</td>
                    <td style={tdStyle}>{e.solicitante}</td>
                    <td style={tdStyle}>{e.unidade_nome}</td>
                    <td style={tdStyle}>{e.de_nome}</td>
                    <td style={tdStyle}>{e.para_nome}</td>
                    <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.descricao || '—'}</td>
                    <td style={tdStyle}>{e.motoboy}</td>
                    <td style={tdStyle}>
                      <span style={{ background: stBadge.bg, color: stBadge.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                        {e.status_display}
                      </span>
                    </td>
                    {isInterno ? (
                      <>
                        <td style={tdStyle}>{e.empresa_nome}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => abrirEdicao(e)}
                              style={{ background: 'none', border: 'none', color: '#6b8fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                              Editar
                            </button>
                            {isAdmin && (
                              <button onClick={() => excluir(e)}
                                style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <td style={tdStyle}>
                        {e.status === 'ENTREGUE' && e.confirmacao === 'PENDENTE' ? (
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
                            style={{ background: confBadge.bg, color: confBadge.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                            {confBadge.label}
                          </span>
                        )}
                      </td>
                    )}
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

      {/* Modal cadastro / edição */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 560, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {editandoId ? 'Editar Entrega' : 'Nova Entrega'}
            </h2>

            {/* Empresa */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Empresa *</label>
              <select value={modal.empresa} onChange={e => setModal(m => ({ ...m, empresa: e.target.value }))} style={inputStyle}>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
              </select>
            </div>

            {/* Data + Hora */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Data *</label>
                <input type="date" value={modal.data} onChange={e => setModal(m => ({ ...m, data: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Hora</label>
                <input type="time" value={modal.hora} onChange={e => setModal(m => ({ ...m, hora: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            {/* Solicitante */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Solicitante *</label>
              <input value={modal.solicitante} onChange={e => setModal(m => ({ ...m, solicitante: e.target.value }))}
                placeholder="Nome do solicitante" style={inputStyle} />
            </div>

            {/* Unidade */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Unidade *</label>
              <select value={modal.unidade} onChange={e => setModal(m => ({ ...m, unidade: e.target.value }))} style={inputStyle}>
                <option value="">Selecione a unidade</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>

            {/* De + Para */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>De *</label>
                <select value={modal.de} onChange={e => setModal(m => ({ ...m, de: e.target.value }))} style={inputStyle}>
                  <option value="">Selecione a origem</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Para *</label>
                <select value={modal.para} onChange={e => setModal(m => ({ ...m, para: e.target.value }))} style={inputStyle}>
                  <option value="">Selecione o destino</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Motoboy */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Motoboy *</label>
              <input value={modal.motoboy} onChange={e => setModal(m => ({ ...m, motoboy: e.target.value }))}
                placeholder="Nome do motoboy" style={inputStyle} />
            </div>

            {/* Status */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Status</label>
              <select value={modal.status} onChange={e => setModal(m => ({ ...m, status: e.target.value }))} style={inputStyle}>
                {[['PENDENTE','Pendente'],['EM_ROTA','Em rota'],['ENTREGUE','Entregue'],['DEVOLVIDO','Devolvido'],['CANCELADO','Cancelado']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Descrição</label>
              <textarea value={modal.descricao || ''} rows={3}
                onChange={e => setModal(m => ({ ...m, descricao: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* Observações */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Observações</label>
              <textarea value={modal.observacoes || ''} rows={2}
                onChange={e => setModal(m => ({ ...m, observacoes: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {erro && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>{erro}</p>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(null); setEditandoId(null) }}
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

      {/* Modal Unidades */}
      {modalUnidades && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, margin: 0 }}>Unidades</h2>
              <button onClick={() => setModalUnidades(false)}
                style={{ background: 'none', border: 'none', color: '#a78bca', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* Form nova / editar unidade */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input value={unidadeForm.nome}
                onChange={e => setUnidadeForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome da unidade"
                style={{ ...inputStyle, flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && salvarUnidade()}
              />
              <button onClick={salvarUnidade} disabled={salvandoUnidade}
                style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: salvandoUnidade ? 0.6 : 1 }}>
                {editandoUnidade ? 'Salvar' : '+ Adicionar'}
              </button>
              {editandoUnidade && (
                <button onClick={() => { setEditandoUnidade(null); setUnidadeForm({ nome: '', ativo: true }) }}
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>
                  ✕
                </button>
              )}
            </div>
            {erroUnidade && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{erroUnidade}</p>}

            {/* Lista */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {unidades.length === 0 ? (
                <p style={{ color: '#a78bca', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nenhuma unidade cadastrada.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {unidades.map((u, i) => (
                      <tr key={u.id} style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <td style={{ padding: '8px 4px', color: '#f1f5f9' }}>{u.nome}</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button onClick={() => editarUnidade(u)}
                              style={{ background: 'none', border: 'none', color: '#6b8fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                              Editar
                            </button>
                            <button onClick={() => desativarUnidade(u)}
                              style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                              Desativar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
