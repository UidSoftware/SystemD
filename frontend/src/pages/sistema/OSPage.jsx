import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import { osApi } from '../../services/osApi'
import { adminApi } from '../../services/adminApi'
import api from '../../services/api'

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

const STATUS_LISTA = Object.entries(STATUS_CONFIG)

function BadgeStatus({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cor: '#a78bca' }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: cfg.cor + '22', color: cfg.cor }}>
      {cfg.label}
    </span>
  )
}

const formVazio = {
  cliente: '', titulo: '', descricao: '', responsavel: '',
  valor_total: '', valor_entrada: '', valor_mensal: '',
  data_inicio: '', data_entrega: '', observacoes: '',
}

export default function OSPage() {
  const navigate = useNavigate()
  const [ordens, setOrdens] = useState([])
  const [clientes, setClientes] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = { page: paginaAtual }
    if (busca) params.busca = busca
    if (filtroStatus) params.status = filtroStatus
    osApi.listar(params)
      .then(r => {
        const data = r.data
        setOrdens(data.results ?? data)
        if (data.count) setTotalPaginas(Math.ceil(data.count / 20))
      })
      .catch(() => setOrdens([]))
      .finally(() => setCarregando(false))
  }, [paginaAtual, busca, filtroStatus])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    api.get('/clientes/').then(r => setClientes(r.data.results ?? r.data)).catch(() => {})
    adminApi.listarUsuarios({ page_size: 100 }).then(r => setUsuarios(r.data.results ?? r.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.cliente || !form.titulo) { setErro('Cliente e título são obrigatórios.'); return }
    setSalvando(true)
    setErro('')
    try {
      const payload = { ...form }
      if (!payload.responsavel) delete payload.responsavel
      if (!payload.valor_total) delete payload.valor_total
      if (!payload.valor_entrada) delete payload.valor_entrada
      if (!payload.valor_mensal) delete payload.valor_mensal
      if (!payload.data_inicio) delete payload.data_inicio
      if (!payload.data_entrega) delete payload.data_entrega
      const res = await osApi.criar(payload)
      setModalAberto(false)
      setForm(formVazio)
      navigate(`/sistema/os/${res.data.id}`)
    } catch (e) {
      const data = e.response?.data
      setErro(data ? Object.values(data).flat().join(' ') : 'Erro ao criar OS.')
    } finally {
      setSalvando(false)
    }
  }

  const formatarMoeda = (v) => v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

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
    <SistemaLayout titulo="Ordens de Serviço">
      <div className="p-6">
        {/* barra */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setPaginaAtual(1) }}
            placeholder="Buscar por cliente ou título..."
            className="flex-1 min-w-48"
            style={inputStyle}
          />
          <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPaginaAtual(1) }} style={{ ...inputStyle, width: 'auto' }}>
            <option value="">Todos os status</option>
            {STATUS_LISTA.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => setModalAberto(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
            style={{ backgroundColor: '#063BF8', color: '#fff' }}>
            + Nova OS
          </button>
        </div>

        {/* tabela */}
        {carregando ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ordens.length === 0 ? (
          <div className="text-center py-20" style={{ color: '#a78bca' }}>
            {busca || filtroStatus ? 'Nenhuma OS encontrada com estes filtros.' : 'Nenhuma OS cadastrada.'}
          </div>
        ) : (
          <div className="rounded-xl overflow-auto" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#1a0a2e' }}>
                  {['Cliente', 'Título', 'Status', 'Responsável', 'Valor total', 'Entrega', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: '#a78bca' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordens.map((os, i) => (
                  <tr key={os.id}
                    onClick={() => navigate(`/sistema/os/${os.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(6,59,248,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: '#f1f5f9' }}>{os.cliente_nome}</td>
                    <td className="px-4 py-3 max-w-xs truncate" style={{ color: '#f1f5f9' }}>{os.titulo}</td>
                    <td className="px-4 py-3"><BadgeStatus status={os.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#a78bca' }}>{os.responsavel_nome || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#a78bca' }}>{formatarMoeda(os.valor_total)}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#a78bca' }}>
                      {os.data_entrega ? new Date(os.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: '#6b8fff' }}>Ver →</span>
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

      {/* Modal Nova OS */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="font-bold text-lg mb-5" style={{ color: '#f1f5f9' }}>Nova Ordem de Serviço</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Cliente *</label>
                <select value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} style={inputStyle}>
                  <option value="">Selecione o cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Título *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Sistema de gestão para Estúdio Fluir" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={3} style={{ ...inputStyle, resize: 'none' }} placeholder="Descrição do projeto..." />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Responsável</label>
                <select value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} style={inputStyle}>
                  <option value="">Sem responsável</option>
                  {usuarios.filter(u => u.ativo && u.perfil !== 'CLIENTE').map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Valor total', field: 'valor_total' },
                  { label: 'Entrada', field: 'valor_entrada' },
                  { label: 'Mensalidade', field: 'valor_mensal' },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>{label}</label>
                    <input type="number" step="0.01" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      placeholder="0,00" style={inputStyle} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Data início', field: 'data_inicio' },
                  { label: 'Data entrega', field: 'data_entrega' },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>{label}</label>
                    <input type="date" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={2} style={{ ...inputStyle, resize: 'none' }} />
              </div>
              {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalAberto(false); setErro('') }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvando ? 0.6 : 1 }}>
                  {salvando ? 'Criando...' : 'Criar OS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
