import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import { osApi } from '../../services/osApi'
import { adminApi } from '../../services/adminApi'

const STATUS_CONFIG = {
  LEAD:         { label: 'Lead',               cor: '#6b7280' },
  REUNIAO:      { label: 'Reunião agendada',    cor: '#f59e0b' },
  LEVANTAMENTO: { label: 'Levantamento',        cor: '#f97316' },
  PROPOSTA:     { label: 'Proposta enviada',    cor: '#38bdf8' },
  CONTRATO:     { label: 'Contrato assinado',   cor: '#063BF8' },
  DEV:          { label: 'Em desenvolvimento',  cor: '#3d0361' },
  ENTREGA:      { label: 'Entregue',            cor: '#10b981' },
  MANUTENCAO:   { label: 'Manutenção ativa',    cor: '#059669' },
  CANCELADA:    { label: 'Cancelada',           cor: '#FF0000' },
}

const STATUS_PROX_LABEL = {
  DEV: 'Em desenvolvimento',
}

function BadgeStatus({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cor: '#a78bca' }
  return (
    <span className="px-3 py-1 rounded-full text-sm font-semibold"
      style={{ backgroundColor: cfg.cor + '22', color: cfg.cor }}>
      {cfg.label}
    </span>
  )
}

const PRIORIDADE_COR = { BAIXA: '#10b981', MEDIA: '#f59e0b', ALTA: '#f97316', URGENTE: '#FF0000' }
const CHAMADO_STATUS_COR = { ABERTO: '#063BF8', ATENDIMENTO: '#f59e0b', RESOLVIDO: '#10b981' }

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

// ── Aba Resumo ─────────────────────────────────────────────────────────────
function AbaResumo({ os, onAvancar, onCancelar, usuarios }) {
  const [modalAvancar, setModalAvancar] = useState(false)
  const [modalCancelar, setModalCancelar] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({})
  const [salvandoEdit, setSalvandoEdit] = useState(false)

  const proximoLabel = os.proximo_status
    ? (STATUS_CONFIG[os.proximo_status]?.label || STATUS_PROX_LABEL[os.proximo_status] || os.proximo_status)
    : null

  const handleAvancar = async () => {
    setSalvando(true)
    await onAvancar(descricao)
    setModalAvancar(false)
    setDescricao('')
    setSalvando(false)
  }

  const handleCancelar = async () => {
    setSalvando(true)
    await onCancelar(descricao)
    setModalCancelar(false)
    setDescricao('')
    setSalvando(false)
  }

  const handleEditar = async (e) => {
    e.preventDefault()
    setSalvandoEdit(true)
    try {
      const payload = { ...form }
      if (!payload.responsavel_id) payload.responsavel_id = null
      await osApi.editar(os.id, {
        titulo: payload.titulo,
        descricao: payload.descricao,
        responsavel: payload.responsavel_id || null,
        valor_total: payload.valor_total || null,
        valor_entrada: payload.valor_entrada || null,
        valor_mensal: payload.valor_mensal || null,
        data_inicio: payload.data_inicio || null,
        data_entrega: payload.data_entrega || null,
        observacoes: payload.observacoes,
      })
      setEditando(false)
      onAvancar('__reload__')
    } catch { } finally { setSalvandoEdit(false) }
  }

  const formatMoeda = (v) => v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
  const formatData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'

  return (
    <div className="space-y-6">
      {/* header da OS */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#f1f5f9' }}>{os.titulo}</h2>
          <p className="text-sm" style={{ color: '#a78bca' }}>{os.cliente_nome}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <BadgeStatus status={os.status} />
          {os.status !== 'CANCELADA' && (
            <button onClick={() => { setEditando(true); setForm({ titulo: os.titulo, descricao: os.descricao || '', responsavel_id: os.responsavel_nome ? '' : '', valor_total: os.valor_total || '', valor_entrada: os.valor_entrada || '', valor_mensal: os.valor_mensal || '', data_inicio: os.data_inicio || '', data_entrega: os.data_entrega || '', observacoes: os.observacoes || '' }) }}
              className="px-3 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>
              ✏️ Editar
            </button>
          )}
          {proximoLabel && (
            <button onClick={() => setModalAvancar(true)}
              className="px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: '#063BF8', color: '#fff' }}>
              Avançar → {proximoLabel}
            </button>
          )}
          {os.status !== 'CANCELADA' && (
            <button onClick={() => setModalCancelar(true)}
              className="px-3 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,0,0,0.1)', color: '#FF0000', border: '1px solid #FF000033' }}>
              ❌ Cancelar OS
            </button>
          )}
        </div>
      </div>

      {/* dados */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Responsável', valor: os.responsavel_nome || '—' },
          { label: 'Valor total', valor: formatMoeda(os.valor_total) },
          { label: 'Entrada', valor: formatMoeda(os.valor_entrada) },
          { label: 'Mensalidade', valor: formatMoeda(os.valor_mensal) },
          { label: 'Início', valor: formatData(os.data_inicio) },
          { label: 'Entrega', valor: formatData(os.data_entrega) },
        ].map(({ label, valor }) => (
          <div key={label} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-1" style={{ color: '#a78bca' }}>{label}</p>
            <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{valor}</p>
          </div>
        ))}
      </div>

      {os.descricao && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs mb-2" style={{ color: '#a78bca' }}>Descrição</p>
          <p className="text-sm" style={{ color: '#f1f5f9' }}>{os.descricao}</p>
        </div>
      )}

      {/* Modal Avançar */}
      {modalAvancar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="font-bold mb-3" style={{ color: '#f1f5f9' }}>Avançar para "{proximoLabel}"</h3>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
              placeholder="Observação sobre esta transição (opcional)" style={{ ...inputStyle, resize: 'none' }} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModalAvancar(false)} className="flex-1 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>❌ Cancelar</button>
              <button onClick={handleAvancar} disabled={salvando} className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvando ? 0.6 : 1 }}>
                {salvando ? 'Avançando...' : '✅ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar */}
      {modalCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="font-bold mb-1" style={{ color: '#FF0000' }}>Cancelar OS</h3>
            <p className="text-sm mb-3" style={{ color: '#a78bca' }}>Esta ação não pode ser desfeita.</p>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
              placeholder="Motivo do cancelamento" style={{ ...inputStyle, resize: 'none' }} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModalCancelar(false)} className="flex-1 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>Voltar</button>
              <button onClick={handleCancelar} disabled={salvando} className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: '#FF0000', color: '#fff', opacity: salvando ? 0.6 : 1 }}>
                {salvando ? 'Cancelando...' : '❌ Cancelar OS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="font-bold text-lg mb-4" style={{ color: '#f1f5f9' }}>Editar OS</h3>
            <form onSubmit={handleEditar} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Título</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Responsável</label>
                <select value={form.responsavel_id} onChange={e => setForm(f => ({ ...f, responsavel_id: e.target.value }))} style={inputStyle}>
                  <option value="">Sem responsável</option>
                  {usuarios.filter(u => u.perfil !== 'CLIENTE').map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['valor_total', 'valor_entrada', 'valor_mensal'].map(f => (
                  <div key={f}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>{f.replace('valor_', '').replace('_', ' ')}</label>
                    <input type="number" step="0.01" value={form[f]} onChange={e => setForm(ff => ({ ...ff, [f]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['data_inicio', 'data_entrega'].map(f => (
                  <div key={f}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>{f.replace('data_', 'Data ').replace('_', ' ')}</label>
                    <input type="date" value={form[f]} onChange={e => setForm(ff => ({ ...ff, [f]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditando(false)} className="flex-1 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>❌ Cancelar</button>
                <button type="submit" disabled={salvandoEdit} className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvandoEdit ? 0.6 : 1 }}>
                  {salvandoEdit ? 'Salvando...' : '💾 Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Aba Timeline ────────────────────────────────────────────────────────────
function AbaTimeline({ fases }) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      {fases.length === 0 ? (
        <p className="text-sm" style={{ color: '#a78bca' }}>Nenhuma fase registrada.</p>
      ) : (
        <div className="space-y-6">
          {fases.map((fase, i) => {
            const cfg = STATUS_CONFIG[fase.fase] || { label: fase.fase, cor: '#a78bca' }
            const isLast = i === fases.length - 1
            return (
              <div key={fase.id} className="relative">
                <div className="absolute -left-4 w-3 h-3 rounded-full border-2 border-current"
                  style={{ color: cfg.cor, backgroundColor: isLast ? cfg.cor : '#0a0014', top: '4px' }} />
                <div className="rounded-xl p-4" style={{ backgroundColor: '#1a0a2e', border: `1px solid ${cfg.cor}33` }}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.cor + '22', color: cfg.cor }}>
                      {cfg.label}
                    </span>
                    {fase.responsavel_nome && (
                      <span className="text-xs" style={{ color: '#a78bca' }}>por {fase.responsavel_nome}</span>
                    )}
                    <span className="text-xs ml-auto" style={{ color: '#6b6b8a' }}>
                      {new Date(fase.criado_em).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {fase.descricao && <p className="text-sm mt-1" style={{ color: '#f1f5f9' }}>{fase.descricao}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Aba Contrato ────────────────────────────────────────────────────────────
function AbaContrato({ os, onReload }) {
  const [form, setForm] = useState({ numero: '', valor_total: '', valor_entrada: '', percentual_entrada: 30, valor_mensal: '', data_assinatura: '', observacoes: '' })
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (os.contrato) setForm({ ...os.contrato, data_assinatura: os.contrato.data_assinatura || '' })
  }, [os.contrato])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.numero || !form.valor_total) { setErro('Número e valor total são obrigatórios.'); return }
    setSalvando(true); setErro('')
    try {
      if (os.contrato) await osApi.editarContrato(os.id, os.contrato.id, form)
      else await osApi.criarContrato(os.id, form)
      setEditando(false)
      onReload()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const formatMoeda = (v) => v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
  const formatData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'

  if (!os.contrato && !editando) {
    return (
      <div className="text-center py-16">
        <p className="text-sm mb-4" style={{ color: '#a78bca' }}>Nenhum contrato registrado para esta OS.</p>
        <button onClick={() => setEditando(true)} className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: '#063BF8', color: '#fff' }}>
          Registrar contrato
        </button>
      </div>
    )
  }

  if (editando) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <h3 className="font-semibold" style={{ color: '#f1f5f9' }}>{os.contrato ? 'Editar contrato' : 'Novo contrato'}</h3>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Número *</label>
          <input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
            placeholder="UID-2026-001" style={inputStyle} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Valor total *', field: 'valor_total' },
            { label: 'Entrada (R$)', field: 'valor_entrada' },
            { label: 'Mensalidade', field: 'valor_mensal' },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>{label}</label>
              <input type="number" step="0.01" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>% Entrada</label>
            <input type="number" step="0.01" value={form.percentual_entrada} onChange={e => setForm(f => ({ ...f, percentual_entrada: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Data assinatura</label>
            <input type="date" value={form.data_assinatura} onChange={e => setForm(f => ({ ...f, data_assinatura: e.target.value }))} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Observações</label>
          <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
            rows={3} style={{ ...inputStyle, resize: 'none' }} />
        </div>
        {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={() => setEditando(false)} className="flex-1 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>❌ Cancelar</button>
          <button type="submit" disabled={salvando} className="flex-1 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvando ? 0.6 : 1 }}>
            {salvando ? 'Salvando...' : '💾 Salvar'}
          </button>
        </div>
      </form>
    )
  }

  const c = os.contrato
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold" style={{ color: '#f1f5f9' }}>Contrato {c.numero}</h3>
        <button onClick={() => setEditando(true)} className="px-3 py-1 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>
          ✏️ Editar
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Valor total', valor: formatMoeda(c.valor_total) },
          { label: 'Entrada', valor: formatMoeda(c.valor_entrada) },
          { label: 'Mensalidade', valor: formatMoeda(c.valor_mensal) },
          { label: 'Assinatura', valor: formatData(c.data_assinatura) },
        ].map(({ label, valor }) => (
          <div key={label} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-1" style={{ color: '#a78bca' }}>{label}</p>
            <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{valor}</p>
          </div>
        ))}
      </div>
      {c.observacoes && <p className="text-sm" style={{ color: '#a78bca' }}>{c.observacoes}</p>}
    </div>
  )
}

// ── Aba Chamados ────────────────────────────────────────────────────────────
function AbaChamados({ os, onReload }) {
  const [modalNovo, setModalNovo] = useState(false)
  const [chamadoAberto, setChamadoAberto] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'MEDIA' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const handleCriarChamado = async (e) => {
    e.preventDefault()
    if (!form.titulo || !form.descricao) { setErro('Título e descrição são obrigatórios.'); return }
    setSalvando(true); setErro('')
    try {
      await osApi.criarChamado(os.id, form)
      setModalNovo(false)
      setForm({ titulo: '', descricao: '', prioridade: 'MEDIA' })
      onReload()
    } catch { setErro('Erro ao criar chamado.') } finally { setSalvando(false) }
  }

  const handleEnviarMensagem = async () => {
    if (!mensagem.trim()) return
    setEnviandoMsg(true)
    try {
      await osApi.enviarMensagem(chamadoAberto.id, { mensagem })
      setMensagem('')
      onReload()
    } catch { } finally { setEnviandoMsg(false) }
  }

  const chamados = os.chamados || []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModalNovo(true)} className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: '#063BF8', color: '#fff' }}>
          + Novo chamado
        </button>
      </div>

      {chamados.length === 0 ? (
        <p className="text-center py-12 text-sm" style={{ color: '#a78bca' }}>Nenhum chamado aberto.</p>
      ) : (
        <div className="space-y-3">
          {chamados.map(c => {
            const prCor = PRIORIDADE_COR[c.prioridade] || '#a78bca'
            const stCor = CHAMADO_STATUS_COR[c.status] || '#a78bca'
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
                      <div className="space-y-2 mb-4">
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
                          placeholder="Responder chamado..."
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

      {/* Modal Novo Chamado */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="font-bold text-lg mb-4" style={{ color: '#f1f5f9' }}>Novo chamado</h3>
            <form onSubmit={handleCriarChamado} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Título *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Descrição *</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={4} style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Prioridade</label>
                <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))} style={inputStyle}>
                  {['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalNovo(false); setErro('') }}
                  className="flex-1 py-2 rounded-lg text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>
                  ❌ Cancelar
                </button>
                <button type="submit" disabled={salvando} className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvando ? 0.6 : 1 }}>
                  {salvando ? 'Criando...' : '➕ Criar chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────
export default function OSDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [os, setOs] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState('resumo')
  const [usuarios, setUsuarios] = useState([])

  const carregar = useCallback(() => {
    osApi.detalhe(id).then(r => setOs(r.data)).catch(() => navigate('/sistema/os')).finally(() => setCarregando(false))
  }, [id])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { adminApi.listarUsuarios({ page_size: 100 }).then(r => setUsuarios(r.data.results ?? r.data)).catch(() => {}) }, [])

  const handleAvancar = async (descricao) => {
    if (descricao === '__reload__') { carregar(); return }
    await osApi.avancar(id, { descricao })
    carregar()
  }

  const handleCancelar = async (descricao) => {
    await osApi.cancelar(id, { descricao })
    navigate('/sistema/os')
  }

  if (carregando) return (
    <SistemaLayout titulo="OS">
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </SistemaLayout>
  )

  const abas = [
    { key: 'resumo',    label: 'Resumo' },
    { key: 'timeline',  label: 'Linha do tempo' },
    { key: 'contrato',  label: 'Contrato' },
    { key: 'chamados',  label: `Chamados${os?.chamados?.length ? ` (${os.chamados.length})` : ''}` },
  ]

  return (
    <SistemaLayout titulo={`OS #${id}`}>
      <div className="p-6 max-w-5xl mx-auto">
        {/* breadcrumb */}
        <button onClick={() => navigate('/sistema/os')} className="text-sm mb-4 flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: '#6b8fff' }}>
          ← Ordens de Serviço
        </button>

        {/* tabs */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {abas.map(aba => (
            <button key={aba.key} onClick={() => setAbaAtiva(aba.key)}
              className="px-4 py-2.5 text-sm font-medium transition-colors relative"
              style={{ color: abaAtiva === aba.key ? '#f1f5f9' : '#a78bca' }}>
              {aba.label}
              {abaAtiva === aba.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: '#063BF8' }} />
              )}
            </button>
          ))}
        </div>

        {abaAtiva === 'resumo'   && <AbaResumo   os={os} onAvancar={handleAvancar} onCancelar={handleCancelar} usuarios={usuarios} />}
        {abaAtiva === 'timeline' && <AbaTimeline fases={os?.fases || []} />}
        {abaAtiva === 'contrato' && <AbaContrato os={os} onReload={carregar} />}
        {abaAtiva === 'chamados' && <AbaChamados os={os} onReload={carregar} />}
      </div>
    </SistemaLayout>
  )
}
