import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import { adminApi } from '../../services/adminApi'
import api from '../../services/api'

const PERFIS = [
  { value: 'ADMIN',       label: 'Admin',       cor: '#FF0000' },
  { value: 'OPERACIONAL', label: 'Operacional',  cor: '#063BF8' },
  { value: 'FINANCEIRO',  label: 'Financeiro',   cor: '#10b981' },
  { value: 'CLIENTE',     label: 'Cliente',      cor: '#3d0361' },
]

const formVazio = { nome: '', email: '', perfil: 'OPERACIONAL', setor_id: null, senha: '', ativo: true }

function BadgePerfil({ perfil }) {
  const cfg = PERFIS.find(p => p.value === perfil) || { label: perfil, cor: '#a78bca' }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: cfg.cor + '22', color: cfg.cor }}>
      {cfg.label}
    </span>
  )
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [setores, setSetores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = { page: paginaAtual }
    if (busca) params.busca = busca
    if (filtroPerfil) params.perfil = filtroPerfil
    if (filtroSetor) params.setor = filtroSetor
    adminApi.listarUsuarios(params)
      .then(r => {
        const data = r.data
        setUsuarios(data.results ?? data)
        if (data.count) setTotalPaginas(Math.ceil(data.count / 20))
      })
      .catch(() => setUsuarios([]))
      .finally(() => setCarregando(false))
  }, [paginaAtual, busca, filtroPerfil, filtroSetor])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    adminApi.listarSetores({ page_size: 100 })
      .then(r => setSetores(r.data.results ?? r.data))
      .catch(() => {})
  }, [])

  const abrirNovo = () => {
    setEditando(null)
    setForm(formVazio)
    setErro('')
    setModalAberto(true)
  }

  const abrirEdicao = (u) => {
    setEditando(u)
    setForm({
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      setor_id: u.setor?.id ?? null,
      senha: '',
      ativo: u.ativo,
    })
    setErro('')
    setModalAberto(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    if (!form.nome.trim() || !form.email.trim()) { setErro('Nome e email são obrigatórios.'); return }
    if (!editando && !form.senha) { setErro('Senha inicial é obrigatória.'); return }
    setSalvando(true)
    try {
      const payload = { ...form }
      if (!payload.senha) delete payload.senha
      if (editando) await adminApi.editarUsuario(editando.id, payload)
      else await adminApi.criarUsuario(payload)
      setModalAberto(false)
      carregar()
    } catch (e) {
      const data = e.response?.data
      setErro(data ? Object.values(data).flat().join(' ') : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const desativar = async (u) => {
    if (!confirm(`Desativar "${u.nome}"?`)) return
    await adminApi.desativarUsuario(u.id)
    carregar()
  }

  const enviarAcesso = async (u) => {
    try {
      const res = await api.post('/auth/solicitar-acesso/', { usuario_id: u.id })
      alert(res.data.mensagem)
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao enviar email.')
    }
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f1f5f9',
    borderRadius: '0.5rem',
    padding: '8px 12px',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
  }

  return (
    <SistemaLayout titulo="Usuários">
      <div className="p-6">
        {/* barra de ações */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setPaginaAtual(1) }}
            placeholder="Buscar por nome ou email..."
            className="flex-1 min-w-48"
            style={inputStyle}
          />
          <select value={filtroPerfil} onChange={e => { setFiltroPerfil(e.target.value); setPaginaAtual(1) }} style={{ ...inputStyle, width: 'auto' }}>
            <option value="">Todos os perfis</option>
            {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={filtroSetor} onChange={e => { setFiltroSetor(e.target.value); setPaginaAtual(1) }} style={{ ...inputStyle, width: 'auto' }}>
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <button onClick={abrirNovo} className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
            style={{ backgroundColor: '#063BF8', color: '#fff' }}>
            + Novo usuário
          </button>
        </div>

        {/* tabela */}
        {carregando ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-20" style={{ color: '#a78bca' }}>Nenhum usuário encontrado.</div>
        ) : (
          <div className="rounded-xl overflow-auto" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#1a0a2e' }}>
                  {['Nome', 'Email', 'Perfil', 'Setor', 'Email corp.', 'Status', 'Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: '#a78bca' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => (
                  <tr key={u.id}
                    style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: '#f1f5f9' }}>{u.nome}</td>
                    <td className="px-4 py-3" style={{ color: '#a78bca' }}>{u.email}</td>
                    <td className="px-4 py-3"><BadgePerfil perfil={u.perfil} /></td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#a78bca' }}>{u.setor?.nome || '—'}</td>
                    <td className="px-4 py-3" style={{ color: '#a78bca' }}>{u.email_corporativo || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: u.ativo ? '#10b98122' : '#FF000022', color: u.ativo ? '#10b981' : '#FF0000' }}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => abrirEdicao(u)} className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: '#6b8fff' }}>Editar</button>
                        {u.ativo && <button onClick={() => enviarAcesso(u)} className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: '#10b981' }}>Enviar acesso</button>}
                        {u.ativo && <button onClick={() => desativar(u)} className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: '#f87171' }}>Desativar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* paginação */}
        {totalPaginas > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPaginaAtual(p)}
                className="w-8 h-8 rounded text-xs font-semibold"
                style={{ backgroundColor: paginaAtual === p ? '#063BF8' : 'rgba(255,255,255,0.06)', color: paginaAtual === p ? '#fff' : '#a78bca' }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="font-bold text-lg mb-5" style={{ color: '#f1f5f9' }}>
              {editando ? 'Editar usuário' : 'Novo usuário'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'Nome *', field: 'nome', type: 'text', placeholder: 'Nome completo' },
                { label: 'Email * (login)', field: 'email', type: 'email', placeholder: 'email@dominio.com' },
                { label: editando ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial *', field: 'senha', type: 'password', placeholder: '••••••••' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>{label}</label>
                  <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder} style={inputStyle} />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Perfil *</label>
                <select value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))} style={inputStyle}>
                  {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Setor</label>
                <select value={form.setor_id ?? ''} onChange={e => setForm(f => ({ ...f, setor_id: e.target.value || null }))} style={inputStyle}>
                  <option value="">Sem setor</option>
                  {setores.filter(s => s.ativo).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold" style={{ color: '#a78bca' }}>Ativo</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                  className="w-10 h-5 rounded-full transition-colors relative"
                  style={{ backgroundColor: form.ativo ? '#063BF8' : 'rgba(255,255,255,0.1)' }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: form.ativo ? '22px' : '2px' }} />
                </button>
              </div>

              {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAberto(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvando ? 0.6 : 1 }}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
