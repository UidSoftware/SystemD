import { useState, useEffect, useCallback, useRef } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

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
}

const tdStyle = {
  padding: '10px 14px',
  fontSize: 13,
  color: '#e2e8f0',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
}

const labelStyle = { fontSize: 11, color: '#6b6b8a' }
const valueStyle = { fontSize: 13, color: '#e2d9f3' }

const PROSPECTO_VAZIO = {
  lead: null,
  nome_empresa: '', nome_contato: '', email: '', telefone: '',
  whatsapp: '', segmento: '', cidade: '', estado: '', cnpj_cpf: '',
  origem: '', observacoes: '', responsavel: null,
}

export default function ProspectosPage() {
  const { usuario, accessToken } = useAuth()
  const isAdmin = usuario?.perfil === 'ADMIN'

  const [prospectos, setProspectos] = useState([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [usuarios, setUsuarios] = useState([])

  const [filtros, setFiltros] = useState({ segmento: '', cidade: '', responsavel: '', convertido: '' })
  const [filtrosAtivos, setFiltrosAtivos] = useState({})

  const [modal, setModal] = useState(null)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [modalConverter, setModalConverter] = useState(null)
  const [dadosConverter, setDadosConverter] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const tokenRef = useRef(accessToken)
  useEffect(() => { tokenRef.current = accessToken }, [accessToken])
  const authHeader = () => tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}

  const carregar = useCallback(async (pag = 1, f = filtrosAtivos) => {
    if (!tokenRef.current) return
    setCarregando(true)
    try {
      const params = { page: pag, ...f }
      const res = await api.get('/prospectos/', { params, headers: authHeader() })
      setProspectos(res.data.results)
      setTotal(res.data.count)
      setTotalPaginas(Math.ceil(res.data.count / 20))
    } finally {
      setCarregando(false)
    }
  }, [filtrosAtivos])

  useEffect(() => {
    if (!accessToken) return
    carregar()
    api.get('/auth/usuarios/', { headers: authHeader() }).then(r => setUsuarios(r.data.results || r.data)).catch(() => {})
  }, [accessToken])

  const filtrar = () => {
    const f = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''))
    setFiltrosAtivos(f)
    setPagina(1)
    carregar(1, f)
  }

  const limpar = () => {
    setFiltros({ segmento: '', cidade: '', responsavel: '', convertido: '' })
    setFiltrosAtivos({})
    setPagina(1)
    carregar(1, {})
  }

  const abrirNovo = () => { setModal({ ...PROSPECTO_VAZIO }); setModoEdicao(false); setErro('') }
  const abrirEditar = (p) => { setModal({ ...p }); setModoEdicao(true); setErro('') }

  const salvar = async () => {
    setSalvando(true)
    setErro('')
    try {
      if (modoEdicao) {
        await api.patch(`/prospectos/${modal.id}/`, modal)
      } else {
        await api.post('/prospectos/', modal)
      }
      setModal(null)
      carregar(pagina)
    } catch (e) {
      setErro('Erro ao salvar. Verifique os campos obrigatórios.')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id) => {
    if (!window.confirm('Excluir este prospecto?')) return
    await api.delete(`/prospectos/${id}/`)
    carregar(pagina)
  }

  const abrirConverter = (p) => {
    setDadosConverter({
      nome_empresa: p.nome_empresa,
      nome_contato: p.nome_contato,
      email: p.email,
      telefone: p.telefone || '',
      whatsapp: p.whatsapp || '',
      segmento: p.segmento || '',
      cidade: p.cidade || '',
      estado: p.estado || '',
      cnpj_cpf: p.cnpj_cpf || '',
      origem: p.origem || '',
      observacoes: p.observacoes || '',
    })
    setModalConverter(p)
    setModal(null)
  }

  const confirmarConverter = async () => {
    if (!modalConverter) return
    setSalvando(true)
    try {
      await api.post(`/prospectos/${modalConverter.id}/converter/`, dadosConverter)
      setModalConverter(null)
      carregar(pagina)
    } finally {
      setSalvando(false)
    }
  }

  const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    overflow: 'hidden',
  }

  const campos = [
    { label: 'Nome da empresa *', field: 'nome_empresa' },
    { label: 'Nome do contato *', field: 'nome_contato' },
    { label: 'Email *', field: 'email', type: 'email' },
    { label: 'Telefone', field: 'telefone' },
    { label: 'WhatsApp', field: 'whatsapp' },
    { label: 'Segmento', field: 'segmento' },
    { label: 'Cidade', field: 'cidade' },
    { label: 'Estado (UF)', field: 'estado' },
    { label: 'CNPJ/CPF', field: 'cnpj_cpf' },
    { label: 'Origem', field: 'origem' },
  ]

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Prospectos</h1>
            <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>{total} prospecto{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={abrirNovo}
            style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Novo prospecto
          </button>
        </div>

        {/* Filtros */}
        <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 20, overflow: 'visible' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Segmento', field: 'segmento' },
              { label: 'Cidade', field: 'cidade' },
            ].map(({ label, field }) => (
              <div key={field}>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>{label}</label>
                <input type="text" style={inputStyle} value={filtros[field]}
                  onChange={e => setFiltros(f => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Convertido</label>
              <select style={inputStyle} value={filtros.convertido}
                onChange={e => setFiltros(f => ({ ...f, convertido: e.target.value }))}>
                <option value="">Todos</option>
                <option value="false">Não convertido</option>
                <option value="true">Convertido</option>
              </select>
            </div>
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

        {/* Mobile cards */}
        <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {carregando ? (
            <div style={{ textAlign: 'center', color: '#a78bca', padding: 32 }}>Carregando...</div>
          ) : prospectos.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a78bca', padding: 32 }}>Nenhum prospecto encontrado</div>
          ) : prospectos.map(p => (
            <div key={p.id} style={{ ...cardStyle, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{p.nome_empresa}</div>
                  <div style={{ fontSize: 12, color: '#a78bca', marginTop: 2 }}>{p.nome_contato}</div>
                </div>
                {p.convertido
                  ? <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>Convertido</span>
                  : <span style={{ background: 'rgba(6,59,248,0.12)', color: '#6b8fff', borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>Ativo</span>
                }
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 10 }}>
                <div>
                  <div style={labelStyle}>Segmento</div>
                  <div style={valueStyle}>{p.segmento || '—'}</div>
                </div>
                <div>
                  <div style={labelStyle}>Cidade</div>
                  <div style={valueStyle}>{p.cidade || '—'}</div>
                </div>
                <div>
                  <div style={labelStyle}>Email</div>
                  <div style={{ ...valueStyle, wordBreak: 'break-all' }}>{p.email}</div>
                </div>
                {p.telefone && (
                  <div>
                    <div style={labelStyle}>Telefone</div>
                    <div style={valueStyle}>{p.telefone}</div>
                  </div>
                )}
                {p.responsavel_nome && (
                  <div>
                    <div style={labelStyle}>Responsável</div>
                    <div style={valueStyle}>{p.responsavel_nome}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => abrirEditar(p)}
                  style={{ flex: 1, background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                  Ver/Editar
                </button>
                {isAdmin && !p.convertido && (
                  <button onClick={() => abrirConverter(p)}
                    style={{ flex: 1, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                    → Cliente
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => excluir(p.id)}
                    style={{ flex: 1, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 8 }}>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => { setPagina(p); carregar(p) }}
                  style={{ background: p === pagina ? '#063BF8' : 'rgba(255,255,255,0.06)', color: p === pagina ? '#fff' : '#a78bca', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 13 }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block" style={cardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Empresa', 'Contato', 'Email', 'Segmento', 'Cidade', 'Responsável', 'Status', 'Ações'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Carregando...</td></tr>
              ) : prospectos.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Nenhum prospecto encontrado</td></tr>
              ) : prospectos.map(p => (
                <tr key={p.id}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,59,248,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={tdStyle}>{p.nome_empresa}</td>
                  <td style={tdStyle}>{p.nome_contato}</td>
                  <td style={tdStyle}>{p.email}</td>
                  <td style={tdStyle}>{p.segmento || '—'}</td>
                  <td style={tdStyle}>{p.cidade || '—'}</td>
                  <td style={tdStyle}>{p.responsavel_nome || '—'}</td>
                  <td style={tdStyle}>
                    {p.convertido
                      ? <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>Convertido</span>
                      : <span style={{ background: 'rgba(6,59,248,0.12)', color: '#6b8fff', borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>Ativo</span>
                    }
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => abrirEditar(p)}
                      style={{ background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                      Ver/Editar
                    </button>
                    {isAdmin && !p.convertido && (
                      <button onClick={() => abrirConverter(p)}
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                        → Cliente
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => excluir(p.id)}
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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

      {/* Modal cadastro/edição */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 540, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {modoEdicao ? 'Editar Prospecto' : 'Novo Prospecto'}
            </h2>

            {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

            {campos.map(({ label, field, type }) => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>{label}</label>
                <input type={type || 'text'} value={modal[field] || ''}
                  onChange={e => setModal(m => ({ ...m, [field]: e.target.value }))}
                  style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Responsável</label>
              <select value={modal.responsavel || ''} onChange={e => setModal(m => ({ ...m, responsavel: e.target.value || null }))}
                style={inputStyle}>
                <option value="">Sem responsável</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Observações</label>
              <textarea value={modal.observacoes || ''} rows={3}
                onChange={e => setModal(m => ({ ...m, observacoes: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {isAdmin && modoEdicao && !modal.convertido && (
              <div style={{ marginBottom: 20 }}>
                <button onClick={() => abrirConverter(modal)}
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                  Converter em Cliente
                </button>
              </div>
            )}

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

      {/* Modal converter em cliente */}
      {modalConverter && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Converter em Cliente</h2>
            <p style={{ color: '#a78bca', fontSize: 13, marginBottom: 20 }}>Revise os dados. O Cliente será criado com essas informações.</p>

            {campos.map(({ label, field, type }) => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>{label}</label>
                <input type={type || 'text'} value={dadosConverter[field] || ''}
                  onChange={e => setDadosConverter(d => ({ ...d, [field]: e.target.value }))}
                  style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Observações</label>
              <textarea value={dadosConverter.observacoes || ''} rows={3}
                onChange={e => setDadosConverter(d => ({ ...d, observacoes: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalConverter(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarConverter} disabled={salvando}
                style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Convertendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
