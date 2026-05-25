import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, BadgeStatus, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const STATUS_CFG = {
  PENDENTE:  { label: 'Pendente',  cor: '#f59e0b' },
  PAGO:      { label: 'Pago',      cor: '#10b981' },
  ATRASADO:  { label: 'Atrasado',  cor: '#FF0000' },
  CANCELADO: { label: 'Cancelado', cor: '#6b7280' },
}
const TIPO_CFG = {
  FIXA:      { label: 'Fixa',      cor: '#063BF8' },
  VARIAVEL:  { label: 'Variável',  cor: '#f59e0b' },
  PROLABORE: { label: 'Pró-labore', cor: '#3d0361' },
  IMPOSTO:   { label: 'Imposto',   cor: '#FF0000' },
  OUTRO:     { label: 'Outro',     cor: '#6b7280' },
}

const formVazio = { tipo: 'FIXA', descricao: '', fornecedor: '', valor_bruto: '', desconto: '0', conta: '', vencimento: '', referencia_mes: '', observacoes: '' }
const btnAcao = (cor) => ({ background: `${cor}22`, color: cor, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' })

export default function DespesasPage() {
  const [dados, setDados] = useState([])
  const [contas, setContas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalPagar, setModalPagar] = useState(null)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio)
  const [formPag, setFormPag] = useState({ pagamento: '', conta: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState({ status: '', tipo: '' })

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = {}
    if (filtros.status) params.status = filtros.status
    if (filtros.tipo)   params.tipo   = filtros.tipo
    Promise.all([
      financeiroApi.listarDespesas(params),
      financeiroApi.listarContas(),
    ]).then(([r, c]) => {
      setDados(r.data.results ?? r.data)
      setContas(c.data.results ?? c.data)
    }).catch(() => {}).finally(() => setCarregando(false))
  }, [filtros])

  useEffect(() => { carregar() }, [carregar])

  const abrirNovo = () => { setEditando(null); setForm(formVazio); setErro(''); setModal(true) }
  const abrirEdicao = (d) => {
    setEditando(d)
    setForm({ tipo: d.tipo, descricao: d.descricao, fornecedor: d.fornecedor || '', valor_bruto: d.valor_bruto, desconto: d.desconto || '0', conta: d.conta, vencimento: d.vencimento, referencia_mes: d.referencia_mes || '', observacoes: d.observacoes || '' })
    setErro(''); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.descricao || !form.valor_bruto || !form.conta || !form.vencimento) { setErro('Preencha os campos obrigatórios.'); return }
    setSalvando(true); setErro('')
    try {
      if (editando) await financeiroApi.editarDespesa(editando.id, form)
      else await financeiroApi.criarDespesa(form)
      setModal(false); carregar()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const handleMarcarPago = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await financeiroApi.marcarPago(modalPagar.id, { pagamento: formPag.pagamento || new Date().toISOString().slice(0,10), conta: formPag.conta || modalPagar.conta })
      setModalPagar(null); carregar()
    } catch { } finally { setSalvando(false) }
  }

  const cancelar = async (d) => {
    if (!confirm(`Cancelar despesa "${d.descricao}"?`)) return
    await financeiroApi.editarDespesa(d.id, { status: 'CANCELADO' }); carregar()
  }

  const colunas = [
    { key: 'descricao', label: 'Descrição' },
    { key: 'tipo', label: 'Tipo', render: r => <BadgeStatus status={r.tipo} config={TIPO_CFG} /> },
    { key: 'fornecedor', label: 'Fornecedor', render: r => r.fornecedor || '—', muted: true },
    { key: 'valor_liquido', label: 'Valor', render: r => formatMoeda(r.valor_liquido) },
    { key: 'vencimento', label: 'Vencimento', render: r => formatData(r.vencimento), muted: true },
    { key: 'status', label: 'Status', render: r => <BadgeStatus status={r.status} config={STATUS_CFG} /> },
    {
      key: '_acoes', label: 'Ações',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          {r.status === 'PENDENTE' && <button style={btnAcao('#10b981')} onClick={() => { setModalPagar(r); setFormPag({ pagamento: '', conta: r.conta }) }}>Pagar</button>}
          <button style={btnAcao('#6b8fff')} onClick={() => abrirEdicao(r)}>Editar</button>
          {r.status !== 'CANCELADO' && <button style={btnAcao('#f87171')} onClick={() => cancelar(r)}>Cancelar</button>}
        </div>
      )
    },
  ]

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Despesas</h1>
          <button onClick={abrirNovo} style={{ backgroundColor: '#063BF8', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            + Nova Despesa
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <select style={{ ...inputStyle, width: 160 }} value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
            <option value="">Todos status</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select style={{ ...inputStyle, width: 160 }} value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}>
            <option value="">Todos tipos</option>
            {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados} />}
      </div>

      {modal && (
        <ModalBase titulo={editando ? 'Editar Despesa' : 'Nova Despesa'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Tipo *</label>
              <select style={inputStyle} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Descrição *</label>
              <input style={inputStyle} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: VPS Contabo Maio/2026" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Fornecedor</label>
              <input style={inputStyle} value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Valor bruto (R$) *</label>
                <input style={inputStyle} type="number" step="0.01" value={form.valor_bruto} onChange={e => setForm(f => ({ ...f, valor_bruto: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Desconto (R$)</label>
                <input style={inputStyle} type="number" step="0.01" value={form.desconto} onChange={e => setForm(f => ({ ...f, desconto: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Conta *</label>
                <select style={inputStyle} value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}>
                  <option value="">Selecione</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Vencimento *</label>
                <input style={inputStyle} type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
              </div>
            </div>
            {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
            <BotoesModal onCancel={() => setModal(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}

      {modalPagar && (
        <ModalBase titulo="Marcar como Pago" onClose={() => setModalPagar(null)} maxW="max-w-md">
          <form onSubmit={handleMarcarPago} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, color: '#a78bca' }}>{modalPagar.descricao} — {formatMoeda(modalPagar.valor_liquido)}</p>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Data de pagamento</label>
              <input style={inputStyle} type="date" value={formPag.pagamento} onChange={e => setFormPag(f => ({ ...f, pagamento: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Conta</label>
              <select style={inputStyle} value={formPag.conta} onChange={e => setFormPag(f => ({ ...f, conta: e.target.value }))}>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <BotoesModal onCancel={() => setModalPagar(null)} salvando={salvando} labelConfirmar="Confirmar Pagamento" />
          </form>
        </ModalBase>
      )}
    </SistemaLayout>
  )
}
