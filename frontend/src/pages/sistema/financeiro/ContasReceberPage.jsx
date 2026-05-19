import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, BadgeStatus, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'
import api from '../../../services/api'

const STATUS_CFG = {
  pendente:  { label: 'Pendente',  cor: '#f59e0b' },
  recebido:  { label: 'Recebido', cor: '#10b981' },
  vencido:   { label: 'Vencido',   cor: '#FF0000' },
  cancelado: { label: 'Cancelado', cor: '#6b7280' },
}

const TIPOS = ['mensalidade','avaliacao','consultoria','personal','produto','rendimento','outros']
const TIPOS_LABEL = { mensalidade:'Mensalidade', avaliacao:'Avaliação', consultoria:'Consultoria', personal:'Personal', produto:'Produto', rendimento:'Rendimento', outros:'Outros' }

const formVazio = {
  rec_descricao: '', rec_tipo: '', rec_data_emissao: '', rec_data_vencimento: '',
  rec_quantidade: 1, rec_valor_unitario: '', rec_desconto: '0', rec_status: 'pendente',
  rec_forma_recebimento: '', rec_observacoes: '', rec_nome_pagador: '', rec_cliente_id: '',
  conta: '', plano_contas: '',
}

const btnEditar = { background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer', flex: 1 }
const btnCancelar = { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer', flex: 1 }

export default function ContasReceberPage() {
  const [dados, setDados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [contas, setContas] = useState([])
  const [planos, setPlanos] = useState([])
  const [clientes, setClientes] = useState([])

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = { page: pagina }
    if (filtroStatus) params.rec_status = filtroStatus
    if (busca) params.search = busca
    financeiroApi.listarContasReceber(params)
      .then(r => { const d = r.data; setDados(d.results ?? d); if (d.count) setTotalPaginas(Math.ceil(d.count / 20)) })
      .catch(() => setDados([]))
      .finally(() => setCarregando(false))
  }, [pagina, filtroStatus, busca])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    financeiroApi.listarContas().then(r => setContas(r.data.results ?? r.data)).catch(() => {})
    financeiroApi.listarPlanoContas().then(r => setPlanos(r.data.results ?? r.data)).catch(() => {})
    api.get('/clientes/').then(r => setClientes(r.data.results ?? r.data)).catch(() => {})
  }, [])

  const abrirNovo = () => { setEditando(null); setForm(formVazio); setErro(''); setModal(true) }
  const abrirEdicao = (c) => {
    setEditando(c)
    setForm({
      rec_descricao: c.rec_descricao, rec_tipo: c.rec_tipo || '', rec_data_emissao: c.rec_data_emissao?.slice(0, 10) || '',
      rec_data_vencimento: c.rec_data_vencimento?.slice(0, 10) || '', rec_quantidade: c.rec_quantidade,
      rec_valor_unitario: c.rec_valor_unitario, rec_desconto: c.rec_desconto || '0', rec_status: c.rec_status,
      rec_forma_recebimento: c.rec_forma_recebimento || '', rec_observacoes: c.rec_observacoes || '',
      rec_nome_pagador: c.rec_nome_pagador || '', rec_cliente_id: c.rec_cliente_id || '',
      conta: c.conta || '', plano_contas: c.plano_contas || '',
    })
    setErro(''); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.rec_descricao || !form.rec_valor_unitario || !form.rec_data_vencimento) {
      setErro('Descrição, valor e vencimento são obrigatórios.'); return
    }
    setSalvando(true); setErro('')
    try {
      const payload = { ...form }
      const total = (Number(payload.rec_quantidade) * Number(payload.rec_valor_unitario) - Number(payload.rec_desconto || 0)).toFixed(2)
      payload.rec_valor_total = total
      if (!payload.conta) delete payload.conta
      if (!payload.plano_contas) delete payload.plano_contas
      if (!payload.rec_tipo) delete payload.rec_tipo
      if (!payload.rec_cliente_id) delete payload.rec_cliente_id
      if (editando) await financeiroApi.editarContaReceber(editando.rec_id, payload)
      else await financeiroApi.criarContaReceber(payload)
      setModal(false); carregar()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const deletar = async (c) => {
    if (!confirm('Cancelar esta conta a receber?')) return
    await financeiroApi.deletarContaReceber(c.rec_id); carregar()
  }

  const colunas = [
    { key: 'rec_descricao', label: 'Descrição' },
    { key: 'rec_nome_pagador', label: 'Pagador', render: r => r.rec_nome_pagador || '—', muted: true },
    { key: 'rec_data_vencimento', label: 'Vencimento', render: r => formatData(r.rec_data_vencimento), muted: true },
    { key: 'rec_valor_total', label: 'Valor', render: r => <span style={{ color: '#10b981', fontWeight: 600 }}>{formatMoeda(r.rec_valor_total)}</span> },
    { key: 'rec_status', label: 'Status', render: r => <BadgeStatus status={r.rec_status} config={STATUS_CFG} /> },
    { key: '_acoes', label: 'Ações', render: r => (
      <div className="flex gap-2 w-full">
        <button onClick={e => { e.stopPropagation(); abrirEdicao(r) }} style={btnEditar}>Editar</button>
        {r.rec_status !== 'cancelado' && <button onClick={e => { e.stopPropagation(); deletar(r) }} style={btnCancelar}>Cancelar</button>}
      </div>
    )},
  ]

  return (
    <SistemaLayout titulo="Contas a Receber">
      <div className="p-6">
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar por descrição..." className="flex-1 min-w-48" style={inputStyle} />
          <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1) }} style={{ ...inputStyle, width: 'auto' }}>
            <option value="">Todos</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={abrirNovo} className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap" style={{ backgroundColor: '#063BF8', color: '#fff' }}>+ Nova conta a receber</button>
        </div>

        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados.map(d => ({ ...d, id: d.rec_id }))} />}

        {totalPaginas > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPagina(p)} className="w-8 h-8 rounded text-xs font-semibold"
                style={{ backgroundColor: pagina === p ? '#063BF8' : 'rgba(255,255,255,0.06)', color: pagina === p ? '#fff' : '#a78bca' }}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ModalBase titulo={editando ? 'Editar conta a receber' : 'Nova conta a receber'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Descrição *</label>
              <input value={form.rec_descricao} onChange={e => setForm(f => ({ ...f, rec_descricao: e.target.value }))} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Tipo</label>
                <select value={form.rec_tipo} onChange={e => setForm(f => ({ ...f, rec_tipo: e.target.value }))} style={inputStyle}>
                  <option value="">Selecione</option>
                  {TIPOS.map(t => <option key={t} value={t}>{TIPOS_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Status</label>
                <select value={form.rec_status} onChange={e => setForm(f => ({ ...f, rec_status: e.target.value }))} style={inputStyle}>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Cliente</label>
                <select value={form.rec_cliente_id} onChange={e => {
                  const c = clientes.find(c => String(c.id) === e.target.value)
                  setForm(f => ({ ...f, rec_cliente_id: e.target.value, rec_nome_pagador: c?.nome_empresa || f.rec_nome_pagador }))
                }} style={inputStyle}>
                  <option value="">Sem cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Nome pagador</label>
                <input value={form.rec_nome_pagador} onChange={e => setForm(f => ({ ...f, rec_nome_pagador: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Emissão</label>
                <input type="date" value={form.rec_data_emissao} onChange={e => setForm(f => ({ ...f, rec_data_emissao: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Vencimento *</label>
                <input type="date" value={form.rec_data_vencimento} onChange={e => setForm(f => ({ ...f, rec_data_vencimento: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Qtd</label>
                <input type="number" value={form.rec_quantidade} onChange={e => setForm(f => ({ ...f, rec_quantidade: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Valor unit. *</label>
                <input type="number" step="0.01" value={form.rec_valor_unitario} onChange={e => setForm(f => ({ ...f, rec_valor_unitario: e.target.value }))} style={inputStyle} placeholder="0,00" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Desconto</label>
                <input type="number" step="0.01" value={form.rec_desconto} onChange={e => setForm(f => ({ ...f, rec_desconto: e.target.value }))} style={inputStyle} placeholder="0,00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Conta bancária</label>
                <select value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))} style={inputStyle}>
                  <option value="">Sem conta</option>
                  {contas.map(c => <option key={c.cont_id} value={c.cont_id}>{c.cont_nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Plano de contas</label>
                <select value={form.plano_contas} onChange={e => setForm(f => ({ ...f, plano_contas: e.target.value }))} style={inputStyle}>
                  <option value="">Sem plano</option>
                  {planos.map(p => <option key={p.plc_id} value={p.plc_id}>{p.plc_codigo} — {p.plc_nome}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Forma de recebimento</label>
              <input value={form.rec_forma_recebimento} onChange={e => setForm(f => ({ ...f, rec_forma_recebimento: e.target.value }))} style={inputStyle} placeholder="Pix, transferência..." />
            </div>
            {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
            <BotoesModal onCancel={() => setModal(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}
    </SistemaLayout>
  )
}
