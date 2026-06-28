import { useState, useEffect, useCallback, useRef } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { ModalConfirmar } from '../../components/sistema/FinanceiroTable'

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

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
  overflow: 'hidden',
}

const SOCIO_VAZIO = { nome: '', email: '', telefone: '', whatsapp: '', cpf: '', principal: false }

const CLIENTE_VAZIO = {
  nome_empresa: '', segmento: '', cidade: '', estado: '', cnpj_cpf: '',
  dominio_email: '', origem: '', observacoes: '',
  socios: [{ ...SOCIO_VAZIO, principal: true }],
}

function SociosEditor({ socios, onChange }) {
  const adicionar = () => onChange([...socios, { ...SOCIO_VAZIO }])
  const remover = (i) => {
    const novos = socios.filter((_, idx) => idx !== i)
    if (novos.length > 0 && !novos.some(s => s.principal)) novos[0].principal = true
    onChange(novos)
  }
  const atualizar = (i, campo, valor) => {
    onChange(socios.map((s, idx) => idx === i ? { ...s, [campo]: valor } : s))
  }
  const marcarPrincipal = (i) => {
    onChange(socios.map((s, idx) => ({ ...s, principal: idx === i })))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#a78bca', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Sócios
        </label>
        <button type="button" onClick={adicionar}
          style={{ background: 'rgba(6,59,248,0.2)', color: '#6b8fff', border: '1px solid rgba(6,59,248,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
          + Adicionar sócio
        </button>
      </div>
      {socios.map((s, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#e2d9f3' }}>Sócio {i + 1}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" onClick={() => marcarPrincipal(i)}
                style={{
                  background: s.principal ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                  color: s.principal ? '#10b981' : '#6b6b8a',
                  border: s.principal ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer',
                }}>
                {s.principal ? '★ Principal' : '☆ Marcar principal'}
              </button>
              {socios.length > 1 && (
                <button type="button" onClick={() => remover(i)}
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                  ✕
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Nome *</label>
              <input value={s.nome} onChange={e => atualizar(i, 'nome', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Email</label>
              <input type="email" value={s.email} onChange={e => atualizar(i, 'email', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>CPF</label>
              <input value={s.cpf} onChange={e => atualizar(i, 'cpf', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Telefone</label>
              <input value={s.telefone} onChange={e => atualizar(i, 'telefone', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>WhatsApp</label>
              <input value={s.whatsapp} onChange={e => atualizar(i, 'whatsapp', e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ClientesPage() {
  const { usuario, accessToken } = useAuth()
  const isAdmin = usuario?.perfil === 'ADMIN'

  const [clientes, setClientes] = useState([])
  const [modalConfirmar, setModalConfirmar] = useState(null)
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  const [filtros, setFiltros] = useState({ segmento: '', cidade: '', search: '' })
  const [filtrosAtivos, setFiltrosAtivos] = useState({})

  const [modal, setModal] = useState(null)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviandoAcesso, setEnviandoAcesso] = useState(null)
  const [msgAcesso, setMsgAcesso] = useState('')

  const tokenRef = useRef(accessToken)
  useEffect(() => { tokenRef.current = accessToken }, [accessToken])
  const authHeader = () => tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}

  const carregar = useCallback(async (pag = 1, f = filtrosAtivos) => {
    if (!tokenRef.current) return
    setCarregando(true)
    try {
      const params = { page: pag, ...f }
      const res = await api.get('/clientes/', { params, headers: authHeader() })
      setClientes(res.data.results)
      setTotal(res.data.count)
      setTotalPaginas(Math.ceil(res.data.count / 20))
    } finally {
      setCarregando(false)
    }
  }, [filtrosAtivos])

  useEffect(() => {
    if (!accessToken) return
    carregar()
  }, [accessToken])

  const filtrar = () => {
    const f = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''))
    setFiltrosAtivos(f)
    setPagina(1)
    carregar(1, f)
  }

  const limpar = () => {
    setFiltros({ segmento: '', cidade: '', search: '' })
    setFiltrosAtivos({})
    setPagina(1)
    carregar(1, {})
  }

  const abrirNovo = () => {
    setModal({ ...CLIENTE_VAZIO, socios: [{ ...SOCIO_VAZIO, principal: true }] })
    setModoEdicao(false)
    setErro('')
  }

  const abrirEditar = (c) => {
    setModal({
      ...c,
      socios: c.socios?.length ? c.socios : [{ ...SOCIO_VAZIO, principal: true }],
    })
    setModoEdicao(true)
    setErro('')
    setMsgAcesso('')
  }

  const salvar = async () => {
    setSalvando(true)
    setErro('')
    try {
      if (modoEdicao) {
        await api.patch(`/clientes/${modal.id}/`, modal)
      } else {
        await api.post('/clientes/', modal)
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
    setModalConfirmar({ msg: 'Excluir este cliente?', onConfirm: async () => { await api.delete(`/clientes/${id}/`); carregar(pagina) } })
  }

  const enviarAcesso = async (id) => {
    setEnviandoAcesso(id)
    setMsgAcesso('')
    try {
      await api.post(`/clientes/${id}/enviar_acesso/`)
      setMsgAcesso('✅ Acesso enviado com sucesso!')
    } catch (e) {
      setMsgAcesso('❌ ' + (e.response?.data?.erro || 'Erro ao enviar acesso.'))
    } finally {
      setEnviandoAcesso(null)
    }
  }

  const camposEmpresa = [
    { label: 'Nome da empresa *', field: 'nome_empresa' },
    { label: 'Segmento *', field: 'segmento' },
    { label: 'Cidade', field: 'cidade' },
    { label: 'Estado (UF)', field: 'estado' },
    { label: 'CNPJ/CPF', field: 'cnpj_cpf' },
    { label: 'Domínio de email', field: 'dominio_email' },
    { label: 'Origem *', field: 'origem' },
  ]

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Clientes</h1>
            <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>{total} cliente{total !== 1 ? 's' : ''}</p>
          </div>
          {isAdmin && (
            <button onClick={abrirNovo}
              style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ➕ Novo cliente
            </button>
          )}
        </div>

        {/* Filtros */}
        <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 20, overflow: 'visible' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Busca</label>
              <input type="text" style={inputStyle} placeholder="empresa, sócio..." value={filtros.search}
                onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && filtrar()} />
            </div>
            {[{ label: 'Segmento', field: 'segmento' }, { label: 'Cidade', field: 'cidade' }].map(({ label, field }) => (
              <div key={field}>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>{label}</label>
                <input type="text" style={inputStyle} value={filtros[field]}
                  onChange={e => setFiltros(f => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
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
          ) : clientes.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a78bca', padding: 32 }}>Nenhum cliente encontrado</div>
          ) : clientes.map(c => (
            <div key={c.id} style={{ ...cardStyle, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{c.nome_empresa}</div>
              <div style={{ fontSize: 12, color: '#a78bca', marginBottom: 10 }}>{c.socio_principal_nome}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12, marginBottom: 10 }}>
                <span style={{ color: '#6b6b8a' }}>Segmento: <span style={{ color: '#e2d9f3' }}>{c.segmento || '—'}</span></span>
                <span style={{ color: '#6b6b8a' }}>Cidade: <span style={{ color: '#e2d9f3' }}>{c.cidade || '—'}</span></span>
                <span style={{ color: '#6b6b8a' }}>Sócios: <span style={{ color: '#e2d9f3' }}>{c.socios?.length || 0}</span></span>
              </div>
              <button onClick={() => abrirEditar(c)}
                style={{ width: '100%', background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                ✏️ Ver/Editar
              </button>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block" style={cardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Empresa', 'Sócio(s)', 'Segmento', 'Cidade', 'Domínio', 'Ações'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Carregando...</td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Nenhum cliente encontrado</td></tr>
              ) : clientes.map(c => (
                <tr key={c.id}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,59,248,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={tdStyle}>{c.nome_empresa}</td>
                  <td style={tdStyle}>
                    <div>{c.socio_principal_nome || '—'}</div>
                    {c.socios?.length > 1 && (
                      <div style={{ fontSize: 11, color: '#6b6b8a', marginTop: 2 }}>+{c.socios.length - 1} sócio{c.socios.length - 1 > 1 ? 's' : ''}</div>
                    )}
                  </td>
                  <td style={tdStyle}>{c.segmento || '—'}</td>
                  <td style={tdStyle}>{c.cidade || '—'}</td>
                  <td style={tdStyle}>{c.dominio_email || '—'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => abrirEditar(c)}
                      style={{ background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                      ✏️ Ver/Editar
                    </button>
                    {isAdmin && (
                      <button onClick={() => excluir(c.id)}
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                        🗑️ Excluir
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
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 580, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {modoEdicao ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b8fff', marginBottom: 12 }}>Empresa</div>
              {camposEmpresa.map(({ label, field }) => (
                <div key={field} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>{label}</label>
                  <input type="text" value={modal[field] || ''}
                    onChange={e => setModal(m => ({ ...m, [field]: e.target.value }))}
                    style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Observações</label>
                <textarea value={modal.observacoes || ''} rows={3}
                  onChange={e => setModal(m => ({ ...m, observacoes: e.target.value }))}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16, marginBottom: 20 }}>
              <SociosEditor
                socios={modal.socios || []}
                onChange={socios => setModal(m => ({ ...m, socios }))}
              />
            </div>

            {/* Enviar acesso */}
            {modoEdicao && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2d9f3', marginBottom: 6 }}>Acesso ao sistema</div>
                <div style={{ fontSize: 12, color: '#6b6b8a', marginBottom: 10 }}>
                  Envia email com link de acesso para o sócio principal do cliente.
                </div>
                {msgAcesso && <p style={{ fontSize: 12, color: msgAcesso.startsWith('✅') ? '#10b981' : '#f87171', marginBottom: 8 }}>{msgAcesso}</p>}
                <button onClick={() => enviarAcesso(modal.id)} disabled={!!enviandoAcesso}
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', opacity: enviandoAcesso ? 0.6 : 1 }}>
                  {enviandoAcesso === modal.id ? 'Enviando...' : '📧 Enviar acesso'}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                ❌ Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : '💾 Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ModalConfirmar config={modalConfirmar} onClose={() => setModalConfirmar(null)} />
    </SistemaLayout>
  )
}
