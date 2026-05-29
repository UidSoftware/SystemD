import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { osApi } from '../../../services/osApi'

const STATUS_COR = { ABERTO: '#063BF8', ATENDIMENTO: '#f59e0b', RESOLVIDO: '#10b981' }
const PRIORIDADE_COR = { BAIXA: '#10b981', MEDIA: '#f59e0b', ALTA: '#f97316', URGENTE: '#FF0000' }

export default function SuportePage() {
  const [chamados, setChamados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'MEDIA' })
  const [erro, setErro] = useState('')
  const [chamadoAberto, setChamadoAberto] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)

  const carregar = useCallback(() => {
    osApi.listarChamadosGlobal()
      .then(r => setChamados(r.data.results ?? r.data))
      .catch(() => setChamados([]))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim() || !form.descricao.trim()) { setErro('Título e descrição são obrigatórios.'); return }
    setSalvando(true); setErro('')
    try {
      await osApi.criarChamadoGlobal(form)
      setModalAberto(false)
      setForm({ titulo: '', descricao: '', prioridade: 'MEDIA' })
      carregar()
    } catch { setErro('Erro ao abrir chamado. Tente novamente.') } finally { setSalvando(false) }
  }

  const handleEnviarMensagem = async () => {
    if (!mensagem.trim() || !chamadoAberto) return
    setEnviandoMsg(true)
    try {
      await osApi.enviarMensagem(chamadoAberto.id, { mensagem })
      setMensagem('')
      carregar()
    } catch { } finally { setEnviandoMsg(false) }
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
    <SistemaLayout titulo="Suporte">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm" style={{ color: '#a78bca' }}>Seus chamados de suporte</p>
          <button onClick={() => setModalAberto(true)} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: '#063BF8', color: '#fff' }}>
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
              const stCor = STATUS_COR[c.status] || '#a78bca'
              const prCor = PRIORIDADE_COR[c.prioridade] || '#a78bca'
              const aberto = chamadoAberto?.id === c.id
              return (
                <div key={c.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', backgroundColor: '#1a0a2e' }}>
                  <button onClick={() => setChamadoAberto(aberto ? null : c)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: '#f1f5f9' }}>{c.titulo}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: stCor + '22', color: stCor }}>{c.status_display}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: prCor + '22', color: prCor }}>{c.prioridade_display}</span>
                    </div>
                    <span style={{ color: '#a78bca' }}>{aberto ? '▲' : '▼'}</span>
                  </button>

                  {aberto && (
                    <div className="px-5 pb-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                      <p className="text-sm mt-3 mb-4" style={{ color: '#a78bca' }}>{c.descricao}</p>
                      {c.mensagens?.length > 0 && (
                        <div className="space-y-2 mb-3">
                          <p className="text-xs font-semibold" style={{ color: '#6b8fff' }}>Histórico</p>
                          {c.mensagens.map((m, i) => (
                            <div key={i} className="text-xs p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                              <p className="font-semibold mb-0.5" style={{ color: '#f1f5f9' }}>{m.autor_nome}</p>
                              <p style={{ color: '#a78bca' }}>{m.mensagem}</p>
                              <p className="mt-1" style={{ color: '#6b6b8a' }}>{new Date(m.criado_em).toLocaleString('pt-BR')}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {c.status !== 'RESOLVIDO' && (
                        <div className="flex gap-2">
                          <input value={mensagem} onChange={e => setMensagem(e.target.value)}
                            placeholder="Enviar mensagem..."
                            className="flex-1" style={{ ...inputStyle, fontSize: '0.8rem', padding: '6px 10px' }}
                            onKeyDown={e => e.key === 'Enter' && handleEnviarMensagem()} />
                          <button onClick={handleEnviarMensagem} disabled={enviandoMsg}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: '#063BF8', color: '#fff', opacity: enviandoMsg ? 0.6 : 1 }}>
                            📤 Enviar
                          </button>
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
                  <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Descreva o problema brevemente" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Descrição *</label>
                  <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    rows={4} placeholder="Detalhe o problema..." style={{ ...inputStyle, resize: 'none' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Prioridade</label>
                  <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))} style={inputStyle}>
                    {['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setModalAberto(false); setErro('') }}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>❌ Cancelar</button>
                  <button type="submit" disabled={salvando} className="flex-1 py-2 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvando ? 0.6 : 1 }}>
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
