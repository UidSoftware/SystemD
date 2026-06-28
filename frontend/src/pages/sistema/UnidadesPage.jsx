import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import { entregasApi } from '../../services/entregasApi'
import { ModalConfirmar } from '../../components/sistema/FinanceiroTable'

const formVazio = { nome: '', ativo: true }

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

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState([])
  const [modalConfirmar, setModalConfirmar] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    entregasApi.listarUnidades()
      .then(r => setUnidades(r.data.results ?? r.data))
      .catch(() => setUnidades([]))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const abrirNovo = () => {
    setEditando(null)
    setForm(formVazio)
    setErro('')
    setModalAberto(true)
  }

  const abrirEdicao = (u) => {
    setEditando(u)
    setForm({ nome: u.nome, ativo: u.ativo })
    setErro('')
    setModalAberto(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSalvando(true)
    setErro('')
    try {
      if (editando) await entregasApi.editarUnidade(editando.id, form)
      else await entregasApi.criarUnidade(form)
      setModalAberto(false)
      carregar()
    } catch (err) {
      const data = err.response?.data
      setErro(data ? Object.values(data).flat().join(' ') : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = (u) => setModalConfirmar({ msg: `Desativar a unidade "${u.nome}"?`, onConfirm: async () => { try { await entregasApi.excluirUnidade(u.id); carregar() } catch { alert('Erro ao desativar unidade.') } } })

  return (
    <SistemaLayout titulo="Unidades">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex justify-end mb-5">
          <button onClick={abrirNovo} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: '#063BF8', color: '#fff' }}>
            ➕ Nova unidade
          </button>
        </div>

        {carregando ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : unidades.length === 0 ? (
          <div className="text-center py-20" style={{ color: '#a78bca' }}>Nenhuma unidade cadastrada.</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {unidades.map(u => (
                <div key={u.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{u.nome}</div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: u.ativo ? '#10b98122' : '#FF000022', color: u.ativo ? '#10b981' : '#FF0000' }}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => abrirEdicao(u)}
                      style={{ flex: 1, background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                      ✏️ Editar
                    </button>
                    {u.ativo && (
                      <button onClick={() => excluir(u)}
                        style={{ flex: 1, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                        🗑️ Desativar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#1a0a2e' }}>
                    {['Nome', 'Status', 'Ações'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: '#a78bca' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unidades.map((u, i) => (
                    <tr key={u.id}
                      style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#f1f5f9' }}>{u.nome}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: u.ativo ? '#10b98122' : '#FF000022', color: u.ativo ? '#10b981' : '#FF0000' }}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <button onClick={() => abrirEdicao(u)} className="text-xs font-medium hover:opacity-70" style={{ color: '#6b8fff' }}>✏️ Editar</button>
                          {u.ativo && <button onClick={() => excluir(u)} className="text-xs font-medium hover:opacity-70" style={{ color: '#f87171' }}>🗑️ Desativar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="font-bold text-lg mb-5" style={{ color: '#f1f5f9' }}>
              {editando ? 'Editar unidade' : 'Nova unidade'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Matriz" style={inputStyle} />
              </div>
              {editando && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold" style={{ color: '#a78bca' }}>Ativo</label>
                  <button type="button" onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                    className="w-10 h-5 rounded-full transition-colors relative"
                    style={{ backgroundColor: form.ativo ? '#063BF8' : 'rgba(255,255,255,0.1)' }}>
                    <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: form.ativo ? '22px' : '2px' }} />
                  </button>
                </div>
              )}
              {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAberto(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>
                  ❌ Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvando ? 0.6 : 1 }}>
                  {salvando ? 'Salvando...' : '💾 Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ModalConfirmar config={modalConfirmar} onClose={() => setModalConfirmar(null)} />
    </SistemaLayout>
  )
}
