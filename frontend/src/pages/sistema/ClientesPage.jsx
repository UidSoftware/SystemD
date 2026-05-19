import { useEffect, useState } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const segmentoCores = {
  pilates: '#7c3aed', salao: '#db2777', loja: '#2563eb',
  clinica: '#059669', academia: '#ea580c',
}
function badgeColor(s) { return segmentoCores[s?.toLowerCase()] || '#4b5563' }

const camposVazios = {
  nome_empresa: '', nome_contato: '', email: '', telefone: '',
  whatsapp: '', segmento: '', cidade: '', estado: '', cnpj_cpf: '',
  origem: '', observacoes: '', dominio_email: '', tem_entregas: false,
}

const inputStyle = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#f1f5f9',
  width: '100%',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
}

export default function ClientesPage() {
  const { usuario } = useAuth()
  const isAdmin = usuario?.perfil === 'ADMIN'
  const [clientes, setClientes]     = useState([])
  const [busca, setBusca]           = useState('')
  const [pagina, setPagina]         = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando]     = useState(null)
  const [form, setForm]             = useState(camposVazios)
  const [salvando, setSalvando]     = useState(false)
  const [confirmando, setConfirmando] = useState(null)

  const carregar = async (pg = 1) => {
    try {
      const res = await api.get(`/clientes/?page=${pg}`)
      setClientes(res.data.results)
      setTotalPaginas(Math.ceil(res.data.count / 20))
    } catch {}
  }

  useEffect(() => { carregar(pagina) }, [pagina])

  const clientesFiltrados = clientes.filter(c =>
    c.nome_empresa.toLowerCase().includes(busca.toLowerCase()) ||
    c.segmento.toLowerCase().includes(busca.toLowerCase())
  )

  const abrirNovo = () => { setEditando(null); setForm(camposVazios); setModalAberto(true) }
  const abrirEditar = (c) => { setEditando(c.id); setForm({ ...c }); setModalAberto(true) }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      if (editando) await api.patch(`/clientes/${editando}/`, form)
      else await api.post('/clientes/', form)
      setModalAberto(false)
      carregar(pagina)
    } catch {}
    setSalvando(false)
  }

  const enviarAcesso = async (c) => {
    const acao = c.usuario ? 'Reenviar email de acesso' : 'Criar conta e enviar email'
    if (!window.confirm(`${acao} para "${c.nome_empresa}" (${c.email})?`)) return
    try {
      const res = await api.post(`/clientes/${c.id}/enviar-acesso/`)
      alert(res.data.mensagem)
      carregar()
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao enviar email.')
    }
  }

  const desativar = async (id) => {
    try { await api.delete(`/clientes/${id}/`); carregar(pagina) } catch {}
    setConfirmando(null)
  }

  const camposForm = [
    { label: 'Nome da empresa *', key: 'nome_empresa', required: true, col2: true },
    { label: 'Nome do contato *', key: 'nome_contato', required: true },
    { label: 'E-mail *', key: 'email', required: true, type: 'email' },
    { label: 'Telefone *', key: 'telefone', required: true },
    { label: 'WhatsApp', key: 'whatsapp' },
    { label: 'Segmento *', key: 'segmento', required: true },
    { label: 'Cidade', key: 'cidade' },
    { label: 'UF', key: 'estado' },
    { label: 'CNPJ/CPF', key: 'cnpj_cpf' },
    { label: 'Origem *', key: 'origem', required: true },
    { label: 'Domínio de email', key: 'dominio_email', col2: true, placeholder: 'Ex: empresacliente.com.br' },
  ]

  return (
    <SistemaLayout titulo="Clientes">
      <div style={{ padding: '20px 16px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por nome ou segmento..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          />
          <button onClick={abrirNovo}
            style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Novo cliente
          </button>
        </div>

        {/* Cards — mobile */}
        <div className="md:hidden flex flex-col gap-3">
          {clientesFiltrados.length === 0 ? (
            <p style={{ color: '#6b6b8a', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
              Nenhum cliente encontrado
            </p>
          ) : clientesFiltrados.map(c => (
            <div key={c.id} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{c.nome_empresa}</p>
                  <span style={{
                    background: badgeColor(c.segmento) + '33', color: badgeColor(c.segmento),
                    borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                  }}>{c.segmento}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', margin: '12px 0', fontSize: 13 }}>
                <div><span style={{ color: '#6b6b8a', fontSize: 11 }}>Contato</span><br/><span style={{ color: '#e2d9f3' }}>{c.nome_contato}</span></div>
                <div><span style={{ color: '#6b6b8a', fontSize: 11 }}>Telefone</span><br/><a href={`tel:${c.telefone}`} style={{ color: '#6b8fff', textDecoration: 'none' }}>{c.telefone}</a></div>
                <div><span style={{ color: '#6b6b8a', fontSize: 11 }}>Email</span><br/><span style={{ color: '#e2d9f3', fontSize: 12 }}>{c.email}</span></div>
                {c.cidade && <div><span style={{ color: '#6b6b8a', fontSize: 11 }}>Cidade</span><br/><span style={{ color: '#e2d9f3' }}>{c.cidade}{c.estado ? ` / ${c.estado}` : ''}</span></div>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                <button onClick={() => abrirEditar(c)}
                  style={{ flex: 1, padding: '8px 0', background: 'rgba(6,59,248,0.15)', color: '#6b8fff',
                    border: '1px solid rgba(6,59,248,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Editar
                </button>
                {isAdmin && (
                  <button onClick={() => enviarAcesso(c)}
                    style={{ flex: 1, padding: '8px 0', background: 'rgba(16,185,129,0.12)', color: '#10b981',
                      border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {c.usuario ? '✉ Reenviar' : '+ Acesso'}
                  </button>
                )}
                <button onClick={() => setConfirmando(c.id)}
                  style={{ flex: 1, padding: '8px 0', background: 'rgba(239,68,68,0.1)', color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Desativar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tabela — desktop */}
        <div className="hidden md:block" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['Empresa', 'Segmento', 'Contato', 'Telefone', 'Email', 'Ações'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontWeight: 600,
                    color: '#a78bca', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#6b6b8a' }}>Nenhum cliente encontrado</td></tr>
              ) : clientesFiltrados.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,59,248,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px', color: '#f1f5f9', fontWeight: 600 }}>{c.nome_empresa}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ background: badgeColor(c.segmento) + '33', color: badgeColor(c.segmento),
                      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{c.segmento}</span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#e2d9f3' }}>{c.nome_contato}</td>
                  <td style={{ padding: '14px 20px', color: '#e2d9f3' }}>{c.telefone}</td>
                  <td style={{ padding: '14px 20px', color: '#6b6b8a', fontSize: 12 }}>{c.email}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => abrirEditar(c)} style={{ background: 'none', border: 'none', color: '#6b8fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Editar</button>
                      {isAdmin && (
                        <button onClick={() => enviarAcesso(c)} style={{ background: 'none', border: 'none', color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                          {c.usuario ? 'Enviar acesso' : 'Criar acesso'}
                        </button>
                      )}
                      <button onClick={() => setConfirmando(c.id)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Desativar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(pg => (
              <button key={pg} onClick={() => setPagina(pg)}
                style={{ width: 36, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: pg === pagina ? '#063BF8' : 'rgba(255,255,255,0.06)',
                  color: pg === pagina ? '#fff' : '#a78bca' }}>
                {pg}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal novo/editar */}
      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 640, background: '#12002a',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
            padding: '24px', overflowY: 'auto', maxHeight: '90vh' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {editando ? 'Editar cliente' : 'Novo cliente'}
            </h2>
            <form onSubmit={salvar}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                {camposForm.map(({ label, key, required, type = 'text', col2, placeholder }) => (
                  <div key={key} style={{ gridColumn: col2 ? '1 / -1' : undefined }}>
                    <label style={{ display: 'block', fontSize: 11, color: '#a78bca', marginBottom: 5 }}>{label}</label>
                    <input type={type} value={form[key] || ''}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      required={required} placeholder={placeholder || ''}
                      style={inputStyle} />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#a78bca', marginBottom: 5 }}>Observações</label>
                  <textarea value={form.observacoes}
                    onChange={e => setForm({ ...form, observacoes: e.target.value })}
                    rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                {isAdmin && (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="tem_entregas" checked={!!form.tem_entregas}
                      onChange={e => setForm({ ...form, tem_entregas: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    <label htmlFor="tem_entregas" style={{ fontSize: 14, color: '#f1f5f9', cursor: 'pointer' }}>
                      Acesso ao módulo de Entregas
                    </label>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAberto(false)}
                  style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', color: '#a78bca',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  style={{ padding: '10px 24px', background: '#063BF8', color: '#fff', border: 'none',
                    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar desativar */}
      {confirmando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#12002a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 8 }}>Desativar cliente?</p>
            <p style={{ color: '#a78bca', fontSize: 13, marginBottom: 24 }}>Esta ação pode ser revertida pelo admin.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmando(null)}
                style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.06)', color: '#a78bca',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => desativar(confirmando)}
                style={{ flex: 1, padding: '10px 0', background: '#dc2626', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
