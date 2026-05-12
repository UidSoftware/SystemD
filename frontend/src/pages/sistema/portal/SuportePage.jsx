import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { portalApi } from '../../../services/portalApi'

const statusConfig = {
  'aberto':        { label: 'Aberto',        cor: '#063BF8' },
  'em_atendimento':{ label: 'Em atendimento', cor: '#f59e0b' },
  'resolvido':     { label: 'Resolvido',      cor: '#10b981' },
}

const prioridades = ['Baixa', 'Média', 'Alta', 'Urgente']

export default function SuportePage() {
  const [chamados, setChamados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'Média' })
  const [erro, setErro] = useState('')
  const [chamadoAberto, setChamadoAberto] = useState(null)

  const carregar = () => {
    portalApi.listarChamados()
      .then(r => setChamados(r.data.results ?? r.data))
      .catch(() => setChamados([]))
      .finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim() || !form.descricao.trim()) {
      setErro('Título e descrição são obrigatórios.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      await portalApi.abrirChamado(form)
      setModalAberto(false)
      setForm({ titulo: '', descricao: '', prioridade: 'Média' })
      carregar()
    } catch {
      setErro('Erro ao abrir chamado. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <SistemaLayout titulo="Suporte">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm" style={{ color: '#a78bca' }}>Seus chamados de suporte</p>
          <button
            onClick={() => setModalAberto(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#063BF8', color: '#fff' }}
          >
            + Abrir chamado
          </button>
        </div>

        {carregando ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chamados.length === 0 ? (
          <div className="text-center py-20" style={{ color: '#a78bca' }}>Nenhum chamado aberto.</div>
        ) : (
          <div className="space-y-3">
            {chamados.map(c => {
              const cfg = statusConfig[c.status] || { label: c.status, cor: '#a78bca' }
              const aberto = chamadoAberto?.id === c.id
              return (
                <div key={c.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', backgroundColor: '#1a0a2e' }}>
                  <button
                    onClick={() => setChamadoAberto(aberto ? null : c)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm" style={{ color: '#f1f5f9' }}>{c.titulo}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: cfg.cor + '22', color: cfg.cor }}>
                        {cfg.label}
                      </span>
                    </div>
                    <span style={{ color: '#a78bca' }}>{aberto ? '▲' : '▼'}</span>
                  </button>

                  {aberto && (
                    <div className="px-5 pb-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                      <p className="text-sm mt-3 mb-4" style={{ color: '#a78bca' }}>{c.descricao}</p>
                      {c.mensagens?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold mb-2" style={{ color: '#6b8fff' }}>Histórico</p>
                          {c.mensagens.map((m, i) => (
                            <div key={i} className="text-xs p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                              <p className="font-semibold mb-1" style={{ color: '#f1f5f9' }}>{m.autor}</p>
                              <p style={{ color: '#a78bca' }}>{m.texto}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Modal novo chamado */}
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 className="font-bold text-lg mb-4" style={{ color: '#f1f5f9' }}>Abrir chamado</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Título *</label>
                  <input
                    value={form.titulo}
                    onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}
                    placeholder="Descreva o problema brevemente"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Descrição *</label>
                  <textarea
                    value={form.descricao}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}
                    placeholder="Detalhe o problema..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Prioridade</label>
                  <select
                    value={form.prioridade}
                    onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}
                  >
                    {prioridades.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setModalAberto(false); setErro('') }}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity"
                    style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvando ? 0.6 : 1 }}
                  >
                    {salvando ? 'Enviando...' : 'Abrir chamado'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SistemaLayout>
  )
}
