import { useState, useEffect, useCallback, useRef } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const badge = {
  LIDO: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Lido' },
  NAO_LIDO: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: 'Não lido' },
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
}

const tdStyle = {
  padding: '10px 14px',
  fontSize: 13,
  color: '#e2e8f0',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
}

const labelStyle = { fontSize: 11, color: '#6b6b8a' }
const valueStyle = { fontSize: 13, color: '#e2d9f3' }

export default function LeadsPage() {
  const { usuario, accessToken } = useAuth()
  const [leads, setLeads] = useState([])
  const [total, setTotal] = useState(0)
  const [naoLidos, setNaoLidos] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  const [filtros, setFiltros] = useState({ data_inicio: '', data_fim: '', lido: '', origem: '' })
  const [filtrosAtivos, setFiltrosAtivos] = useState({})

  const [modalLead, setModalLead] = useState(null)
  const [modalConverter, setModalConverter] = useState(null)
  const [dadosConverter, setDadosConverter] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [novosLeads, setNovosLeads] = useState(0)

  const totalRef = useRef(0)
  const tokenRef = useRef(accessToken)
  useEffect(() => { tokenRef.current = accessToken }, [accessToken])

  const authHeader = () => tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}

  const carregar = useCallback(async (pag = 1, f = filtrosAtivos, silencioso = false) => {
    if (!tokenRef.current) return
    if (!silencioso) setCarregando(true)
    try {
      const params = { page: pag, ...f }
      const res = await api.get('/leads/', { params, headers: authHeader() })
      setLeads(res.data.results)
      setTotal(res.data.count)
      setTotalPaginas(Math.ceil(res.data.count / 20))
      totalRef.current = res.data.count
    } finally {
      if (!silencioso) setCarregando(false)
    }
  }, [filtrosAtivos])

  const carregarNaoLidos = useCallback(async () => {
    if (!tokenRef.current) return
    const res = await api.get('/leads/', { params: { lido: 'false' }, headers: authHeader() })
    setNaoLidos(res.data.count)
  }, [])

  useEffect(() => {
    if (!accessToken) return
    const poll = async () => {
      try {
        const res = await api.get('/leads/', { params: { page: 1 }, headers: authHeader() })
        const novoTotal = res.data.count
        if (novoTotal > totalRef.current && totalRef.current > 0) {
          setNovosLeads(novoTotal - totalRef.current)
        }
      } catch {}
    }
    const intervalo = setInterval(poll, 30000)
    return () => clearInterval(intervalo)
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    carregar(1)
    carregarNaoLidos()
  }, [accessToken])

  const filtrar = () => {
    setFiltrosAtivos({ ...filtros })
    setPagina(1)
    carregar(1, filtros)
    carregarNaoLidos()
  }

  const limpar = () => {
    const vazio = { data_inicio: '', data_fim: '', lido: '', origem: '' }
    setFiltros(vazio)
    setFiltrosAtivos({})
    setPagina(1)
    carregar(1, {})
  }

  const salvarLead = async () => {
    if (!modalLead) return
    setSalvando(true)
    try {
      await api.patch(`/leads/${modalLead.id}/`, modalLead)
      setModalLead(null)
      carregar(pagina)
      carregarNaoLidos()
    } finally {
      setSalvando(false)
    }
  }

  const abrirConverter = (lead) => {
    setDadosConverter({
      nome_empresa: lead.empresa || '',
      nome_contato: lead.nome,
      email: lead.email,
      telefone: lead.telefone || '',
      origem: lead.origem || '',
      observacoes: lead.observacoes_internas || '',
    })
    setModalConverter(lead)
    setModalLead(null)
  }

  const confirmarConverter = async () => {
    if (!modalConverter) return
    setSalvando(true)
    try {
      await api.post(`/leads/${modalConverter.id}/converter/`, dadosConverter)
      setModalConverter(null)
      carregar(pagina)
      carregarNaoLidos()
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

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: novosLeads > 0 ? 12 : 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Leads</h1>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#10b981',
                  boxShadow: '0 0 6px #10b981',
                  animation: 'pulse 2s infinite',
                  display: 'inline-block',
                }} />
                ao vivo
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>
              {naoLidos > 0 && (
                <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', borderRadius: 20, padding: '2px 10px', fontWeight: 600, marginRight: 8 }}>
                  {naoLidos} não {naoLidos === 1 ? 'lido' : 'lidos'}
                </span>
              )}
              {total} lead{total !== 1 ? 's' : ''} no total
            </p>
          </div>
        </div>

        {/* Banner novos leads */}
        {novosLeads > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          }}>
            <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>
              🔔 {novosLeads} novo{novosLeads > 1 ? 's' : ''} lead{novosLeads > 1 ? 's' : ''} chegou{novosLeads > 1 ? 'ram' : ''}!
            </span>
            <button onClick={() => { setNovosLeads(0); carregar(1); carregarNaoLidos() }}
              style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Ver agora
            </button>
          </div>
        )}

        {/* Filtros */}
        <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 20, overflow: 'visible' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
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
              <select style={inputStyle} value={filtros.lido}
                onChange={e => setFiltros(f => ({ ...f, lido: e.target.value }))}>
                <option value="">Todos</option>
                <option value="true">Lido</option>
                <option value="false">Não lido</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Origem</label>
              <input type="text" style={inputStyle} placeholder="Ex: vitrine_contato" value={filtros.origem}
                onChange={e => setFiltros(f => ({ ...f, origem: e.target.value }))} />
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
        <div className="md:hidden flex flex-col gap-3">
          {carregando ? (
            <div style={{ textAlign: 'center', color: '#a78bca', padding: 32 }}>Carregando...</div>
          ) : leads.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a78bca', padding: 32 }}>Nenhum lead encontrado</div>
          ) : leads.map(lead => (
            <div key={lead.id} style={{ ...cardStyle, padding: 16, background: lead.lido ? 'rgba(255,255,255,0.03)' : 'rgba(239,68,68,0.05)' }}
              onClick={() => setModalLead({ ...lead })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!lead.lido && <span style={{ background: '#f87171', color: '#fff', borderRadius: 4, fontSize: 9, fontWeight: 700, padding: '1px 5px' }}>NOVO</span>}
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{lead.nome}</span>
                  </div>
                  {lead.empresa && <div style={{ fontSize: 12, color: '#a78bca', marginTop: 2 }}>{lead.empresa}</div>}
                </div>
                <span style={{ background: lead.lido ? badge.LIDO.bg : badge.NAO_LIDO.bg, color: lead.lido ? badge.LIDO.color : badge.NAO_LIDO.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {lead.lido ? 'Lido' : 'Não lido'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 10 }}>
                <div>
                  <div style={labelStyle}>Data</div>
                  <div style={valueStyle}>{new Date(lead.criado_em).toLocaleDateString('pt-BR')}</div>
                </div>
                <div>
                  <div style={labelStyle}>Email</div>
                  <div style={{ ...valueStyle, wordBreak: 'break-all' }}>{lead.email}</div>
                </div>
                {lead.telefone && (
                  <div>
                    <div style={labelStyle}>Telefone</div>
                    <div style={valueStyle}>{lead.telefone}</div>
                  </div>
                )}
                {lead.origem && (
                  <div>
                    <div style={labelStyle}>Origem</div>
                    <div style={valueStyle}>{lead.origem}</div>
                  </div>
                )}
              </div>
              {lead.mensagem && (
                <div style={{ fontSize: 12, color: '#a78bca', marginBottom: 10, lineHeight: 1.4 }}>
                  {lead.mensagem.length > 80 ? lead.mensagem.slice(0, 80) + '…' : lead.mensagem}
                </div>
              )}
              {lead.convertido && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ background: 'rgba(6,59,248,0.15)', color: '#6b8fff', borderRadius: 20, padding: '2px 8px', fontSize: 10 }}>Convertido</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setModalLead({ ...lead })}
                  style={{ flex: 1, background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                  Ver
                </button>
                {!lead.convertido && (
                  <button onClick={() => abrirConverter(lead)}
                    style={{ flex: 1, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                    🔄 Converter
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
        <div className="hidden md:block" style={{ ...cardStyle, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
            <thead>
              <tr>
                {['Data', 'Nome', 'Empresa', 'Email', 'Mensagem', 'Status', 'Ações'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Carregando...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Nenhum lead encontrado</td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id}
                  style={{ background: lead.lido ? 'transparent' : 'rgba(239,68,68,0.04)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,59,248,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = lead.lido ? 'transparent' : 'rgba(239,68,68,0.04)'}
                  onClick={() => setModalLead({ ...lead })}
                >
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{new Date(lead.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    {!lead.lido && <span style={{ background: '#f87171', color: '#fff', borderRadius: 4, fontSize: 9, fontWeight: 700, padding: '1px 5px', marginRight: 6 }}>NOVO</span>}
                    {lead.nome}
                    {lead.telefone && <div style={{ fontSize: 11, color: '#6b6b8a', marginTop: 2 }}>{lead.telefone}</div>}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{lead.empresa || <span style={{ color: '#6b6b8a' }}>—</span>}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{lead.email}</td>
                  <td style={{ ...tdStyle, maxWidth: 280 }}>
                    <span style={{ color: '#e2e8f0', fontSize: 13 }}>
                      {lead.mensagem?.length > 80 ? lead.mensagem.slice(0, 80) + '…' : lead.mensagem}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <span style={{ background: lead.lido ? badge.LIDO.bg : badge.NAO_LIDO.bg, color: lead.lido ? badge.LIDO.color : badge.NAO_LIDO.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                      {lead.lido ? 'Lido' : 'Não lido'}
                    </span>
                    {lead.convertido && <span style={{ display: 'block', marginTop: 4, background: 'rgba(6,59,248,0.15)', color: '#6b8fff', borderRadius: 20, padding: '2px 8px', fontSize: 10, width: 'fit-content' }}>Convertido</span>}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setModalLead({ ...lead })}
                      style={{ background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                      Ver
                    </button>
                    {!lead.convertido && (
                      <button onClick={() => abrirConverter(lead)}
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                        🔄 Converter
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação */}
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

      {/* Modal detalhe/edição */}
      {modalLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 540, padding: 28 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Lead — {modalLead.nome}</h2>

            {[
              { label: 'Nome', field: 'nome' },
              { label: 'Email', field: 'email' },
              { label: 'Telefone', field: 'telefone' },
              { label: 'Empresa', field: 'empresa' },
              { label: 'Origem', field: 'origem' },
            ].map(({ label, field }) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>{label}</label>
                <input value={modalLead[field] || ''} onChange={e => setModalLead(m => ({ ...m, [field]: e.target.value }))}
                  style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Mensagem</label>
              <textarea value={modalLead.mensagem || ''} readOnly rows={3}
                style={{ ...inputStyle, resize: 'vertical', opacity: 0.7 }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Observações internas</label>
              <textarea value={modalLead.observacoes_internas || ''} rows={3}
                onChange={e => setModalLead(m => ({ ...m, observacoes_internas: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <input type="checkbox" id="lido" checked={!!modalLead.lido}
                onChange={e => setModalLead(m => ({ ...m, lido: e.target.checked }))} />
              <label htmlFor="lido" style={{ color: '#f1f5f9', fontSize: 13 }}>Marcar como lido</label>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {!modalLead.convertido && (
                <button onClick={() => abrirConverter(modalLead)}
                  style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                  Converter em Prospecto
                </button>
              )}
              <button onClick={() => setModalLead(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                ❌ Cancelar
              </button>
              <button onClick={salvarLead} disabled={salvando}
                style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : '💾 Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal converter */}
      {modalConverter && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Converter em Prospecto</h2>
            <p style={{ color: '#a78bca', fontSize: 13, marginBottom: 20 }}>Revise os dados antes de confirmar</p>

            {[
              { label: 'Nome da empresa *', field: 'nome_empresa' },
              { label: 'Nome do contato *', field: 'nome_contato' },
              { label: 'Email *', field: 'email' },
              { label: 'Telefone', field: 'telefone' },
              { label: 'WhatsApp', field: 'whatsapp' },
              { label: 'Segmento', field: 'segmento' },
              { label: 'Cidade', field: 'cidade' },
              { label: 'Estado (UF)', field: 'estado' },
              { label: 'CNPJ/CPF', field: 'cnpj_cpf' },
              { label: 'Origem', field: 'origem' },
            ].map(({ label, field }) => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>{label}</label>
                <input value={dadosConverter[field] || ''} onChange={e => setDadosConverter(d => ({ ...d, [field]: e.target.value }))}
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
                ❌ Cancelar
              </button>
              <button onClick={confirmarConverter} disabled={salvando}
                style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Convertendo...' : '✅ Confirmar conversão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
