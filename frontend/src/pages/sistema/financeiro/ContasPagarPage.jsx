import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, BadgeStatus, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const STATUS_CFG = {
  pendente:  { label: 'Pendente',  cor: '#f59e0b' },
  pago:      { label: 'Pago',      cor: '#10b981' },
  vencido:   { label: 'Vencido',   cor: '#FF0000' },
  cancelado: { label: 'Cancelado', cor: '#6b7280' },
}

const TIPOS = ['aluguel','prolabore','material','marketing','servico','taxa','outros']
const TIPOS_LABEL = { aluguel:'Aluguel', prolabore:'Pró-labore', material:'Material', marketing:'Marketing', servico:'Serviço Terceiro', taxa:'Taxa Bancária', outros:'Outros' }

const formVazio = {
  pag_descricao: '', cpa_tipo: '', pag_data_emissao: '', pag_data_vencimento: '',
  pag_quantidade: 1, pag_valor_unitario: '', pag_status: 'pendente',
  pag_forma_pagamento: '', pag_observacoes: '', cpa_nome_credor: '',
  conta: '', plano_contas: '', forn: '',
}

const btnEditar = { background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer', flex: 1 }
const btnCancelar = { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer', flex: 1 }

export default function ContasPagarPage() {
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
  const [fornecedores, setFornecedores] = useState([])

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = { page: pagina }
    if (filtroStatus) params.pag_status = filtroStatus
    if (busca) params.search = busca
    financeiroApi.listarContasPagar(params)
      .then(r => { const d = r.data; setDados(d.results ?? d); if (d.count) setTotalPaginas(Math.ceil(d.count / 20)) })
      .catch(() => setDados([]))
      .finally(() => setCarregando(false))
  }, [pagina, filtroStatus, busca])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    financeiroApi.listarContas().then(r => setContas(r.data.results ?? r.data)).catch(() => {})
    financeiroApi.listarPlanoContas().then(r => setPlanos(r.data.results ?? r.data)).catch(() => {})
    financeiroApi.listarFornecedores({ page_size: 100 }).then(r => setFornecedores(r.data.results ?? r.data)).catch(() => {})
  }, [])

  const abrirNovo = () => { setEditando(null); setForm(formVazio); setErro(''); setModal(true) }
  const abrirEdicao = (c) => {
    setEditando(c)
    setForm({
      pag_descricao: c.pag_descricao, cpa_tipo: c.cpa_tipo || '', pag_data_emissao: c.pag_data_emissao?.slice(0, 10) || '',
      pag_data_vencimento: c.pag_data_vencimento?.slice(0, 10) || '', pag_quantidade: c.pag_quantidade,
      pag_valor_unitario: c.pag_valor_unitario, pag_status: c.pag_status,
      pag_forma_pagamento: c.pag_forma_pagamento || '', pag_observacoes: c.pag_observacoes || '',
      cpa_nome_credor: c.cpa_nome_credor || '', conta: c.conta || '', plano_contas: c.plano_contas || '', forn: c.forn || '',
    })
    setErro(''); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.pag_descricao || !form.pag_valor_unitario || !form.pag_data_vencimento) {
      setErro('Descrição, valor e vencimento são obrigatórios.'); return
    }
    setSalvando(true); setErro('')
    try {
      const payload = { ...form }
      const total = (Number(payload.pag_quantidade) * Number(payload.pag_valor_unitario)).toFixed(2)
      payload.pag_valor_total = total
      if (!payload.conta) delete payload.conta
      if (!payload.plano_contas) delete payload.plano_contas
      if (!payload.forn) delete payload.forn
      if (!payload.cpa_tipo) delete payload.cpa_tipo
      if (editando) await financeiroApi.editarContaPagar(editando.pag_id, payload)
      else await financeiroApi.criarContaPagar(payload)
      setModal(false); carregar()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const deletar = async (c) => {
    if (!confirm('Cancelar esta conta?')) return
    await financeiroApi.deletarContaPagar(c.pag_id); carregar()
  }

  const colunas = [
    { key: 'pag_descricao', label: 'Descrição' },
    { key: 'cpa_nome_credor', label: 'Credor', render: r => r.cpa_nome_credor || r.forn_nome || '—', muted: true },
    { key: 'pag_data_vencimento', label: 'Vencimento', render: r => formatData(r.pag_data_vencimento), muted: true },
    { key: 'pag_valor_total', label: 'Valor', render: r => formatMoeda(r.pag_valor_total) },
    { key: 'pag_status', label: 'Status', render: r => <BadgeStatus status={r.pag_status} config={STATUS_CFG} /> },
    { key: '_acoes', label: 'Ações', render: r => (
      <div className="flex gap-2 w-full">
        <button onClick={e => { e.stopPropagation(); abrirEdicao(r) }} style={btnEditar}>Editar</button>
        {r.pag_status !== 'cancelado' && <button onClick={e => { e.stopPropagation(); deletar(r) }} style={btnCancelar}>Cancelar</button>}
      </div>
    )},
  ]

  return (
    <SistemaLayout titulo="Contas a Pagar">
      <div className="p-6">
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar por descrição..." className="flex-1 min-w-48" style={inputStyle} />
          <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1) }} style={{ ...inputStyle, width: 'auto' }}>
            <option value="">Todos</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={abrirNovo} className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap" style={{ backgroundColor: '#063BF8', color: '#fff' }}>+ Nova conta a pagar</button>
        </div>

        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados.map(d => ({ ...d, id: d.pag_id }))} />}

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
        <ModalBase titulo={editando ? 'Editar conta a pagar' : 'Nova conta a pagar'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Descrição *</label>
              <input value={form.pag_descricao} onChange={e => setForm(f => ({ ...f, pag_descricao: e.target.value }))} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Tipo</label>
                <select value={form.cpa_tipo} onChange={e => setForm(f => ({ ...f, cpa_tipo: e.target.value }))} style={inputStyle}>
                  <option value="">Selecione</option>
                  {TIPOS.map(t => <option key={t} value={t}>{TIPOS_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Status</label>
                <select value={form.pag_status} onChange={e => setForm(f => ({ ...f, pag_status: e.target.value }))} style={inputStyle}>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Nome do credor</label>
              <input value={form.cpa_nome_credor} onChange={e => setForm(f => ({ ...f, cpa_nome_credor: e.target.value }))} style={inputStyle} placeholder="Nome do credor (opcional)" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Fornecedor</label>
              <select value={form.forn} onChange={e => setForm(f => ({ ...f, forn: e.target.value }))} style={inputStyle}>
                <option value="">Sem fornecedor</option>
                {fornecedores.map(f => <option key={f.forn_id} value={f.forn_id}>{f.forn_nome_empresa}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Emissão</label>
                <input type="date" value={form.pag_data_emissao} onChange={e => setForm(f => ({ ...f, pag_data_emissao: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Vencimento *</label>
                <input type="date" value={form.pag_data_vencimento} onChange={e => setForm(f => ({ ...f, pag_data_vencimento: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Qtd</label>
                <input type="number" value={form.pag_quantidade} onChange={e => setForm(f => ({ ...f, pag_quantidade: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Valor unitário *</label>
                <input type="number" step="0.01" value={form.pag_valor_unitario} onChange={e => setForm(f => ({ ...f, pag_valor_unitario: e.target.value }))} style={inputStyle} placeholder="0,00" />
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
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Forma de pagamento</label>
              <input value={form.pag_forma_pagamento} onChange={e => setForm(f => ({ ...f, pag_forma_pagamento: e.target.value }))} style={inputStyle} placeholder="Pix, boleto, débito..." />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Observações</label>
              <textarea value={form.pag_observacoes} onChange={e => setForm(f => ({ ...f, pag_observacoes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
            <BotoesModal onCancel={() => setModal(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}
    </SistemaLayout>
  )
}
