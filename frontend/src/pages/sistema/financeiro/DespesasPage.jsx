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
  FIXA:      { label: 'Fixa',       cor: '#063BF8' },
  VARIAVEL:  { label: 'Variavel',   cor: '#f59e0b' },
  PROLABORE: { label: 'Pro-labore', cor: '#3d0361' },
  IMPOSTO:   { label: 'Imposto',    cor: '#FF0000' },
  OUTRO:     { label: 'Outro',      cor: '#6b7280' },
}
const FREQUENCIA_OPTS = [
  { value: 'MENSAL',    label: 'Mensal' },
  { value: 'SEMANAL',   label: 'Semanal' },
  { value: 'QUINZENAL', label: 'Quinzenal' },
  { value: 'ANUAL',     label: 'Anual' },
]
const FORMA_PAGAMENTO_OPTS = [
  { value: 'PIX',            label: 'PIX' },
  { value: 'TED_DOC',        label: 'TED/DOC' },
  { value: 'BOLETO',         label: 'Boleto' },
  { value: 'CARTAO_DEBITO',  label: 'Cartao de Debito' },
  { value: 'CARTAO_CREDITO', label: 'Cartao de Credito' },
  { value: 'DINHEIRO',       label: 'Dinheiro' },
  { value: 'OUTRO',          label: 'Outro' },
]

const formVazio = {
  tipo: 'FIXA', descricao: '', fornecedor: '',
  categoria: '',
  valor_bruto: '', desconto: '0', conta: '',
  vencimento: '', referencia_mes: '', observacoes: '',
  recorrente: false, frequencia: 'MENSAL', quantidade: 1,
}
const btnAcao = (cor) => ({
  background: `${cor}22`, color: cor, border: 'none', borderRadius: 8,
  padding: '5px 10px', fontSize: 12, cursor: 'pointer',
})

export default function DespesasPage() {
  const [dados, setDados]                     = useState([])
  const [contas, setContas]                   = useState([])
  const [fornecedores, setFornecedores]       = useState([])
  const [categorias, setCategorias]           = useState([])
  const [carregando, setCarregando]           = useState(true)
  const [modal, setModal]                     = useState(false)
  const [modalPagar, setModalPagar]           = useState(null)
  const [modalEstorno, setModalEstorno]       = useState(false)
  const [despesasParaEstornar, setDespesasParaEstornar] = useState([])
  const [despesaEstorno, setDespesaEstorno]   = useState(null)
  const [formEstorno, setFormEstorno]         = useState({ data_estorno: '', conta: '', motivo: '', observacoes: '' })
  const [editando, setEditando]               = useState(null)
  const [form, setForm]                       = useState(formVazio)
  const [formPag, setFormPag]                 = useState({ pagamento: '', conta: '', forma_pagamento: '' })
  const [salvando, setSalvando]               = useState(false)
  const [erro, setErro]                       = useState('')
  const [filtros, setFiltros]                 = useState({ status: '', tipo: '' })
  const [novaCategoria, setNovaCategoria]     = useState('')
  const [salvandoCategoria, setSalvandoCategoria] = useState(false)
  const [mostrarNovaCategoria, setMostrarNovaCategoria] = useState(false)

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = {}
    if (filtros.status) params.status = filtros.status
    if (filtros.tipo)   params.tipo   = filtros.tipo
    Promise.all([
      financeiroApi.listarDespesas(params),
      financeiroApi.listarContas(),
      financeiroApi.listarFornecedores(),
      financeiroApi.listarCategorias({ tipo: 'SAIDA' }),
    ]).then(([r, c, forn, cat]) => {
      setDados(r.data.results ?? r.data)
      setContas(c.data.results ?? c.data)
      setFornecedores(Array.isArray(forn.data) ? forn.data : (forn.data.results ?? []))
      setCategorias(cat.data.results ?? cat.data)
    }).catch(() => {}).finally(() => setCarregando(false))
  }, [filtros])

  useEffect(() => { carregar() }, [carregar])

  const abrirNovo = () => { setEditando(null); setForm(formVazio); setErro(''); setMostrarNovaCategoria(false); setModal(true) }
  const abrirEdicao = (d) => {
    setEditando(d)
    setForm({
      tipo: d.tipo, descricao: d.descricao, fornecedor: d.fornecedor || '',
      categoria: d.categoria || '',
      valor_bruto: d.valor_bruto, desconto: d.desconto || '0',
      conta: d.conta, vencimento: d.vencimento,
      referencia_mes: d.referencia_mes ? d.referencia_mes.slice(0, 7) : '',
      observacoes: d.observacoes || '',
      recorrente: d.recorrente || false,
      frequencia: d.frequencia || 'MENSAL',
      quantidade: d.quantidade || 1,
    })
    setErro(''); setMostrarNovaCategoria(false); setModal(true)
  }

  const abrirEstorno = async () => {
    try {
      const res = await financeiroApi.listarDespesas({ status: 'PAGO', estornado: false })
      setDespesasParaEstornar(res.data.results ?? res.data)
      setDespesaEstorno(null)
      setFormEstorno({ data_estorno: new Date().toISOString().slice(0, 10), conta: contas[0]?.id || '', motivo: '', observacoes: '' })
      setModalEstorno(true)
    } catch { }
  }

  const handleEstornar = async (e) => {
    e.preventDefault()
    if (!despesaEstorno) { setErro('Selecione uma despesa.'); return }
    if (!formEstorno.motivo.trim()) { setErro('Motivo é obrigatório.'); return }
    setSalvando(true); setErro('')
    try {
      await financeiroApi.estornarDespesa(despesaEstorno.id, {
        data_estorno: formEstorno.data_estorno || new Date().toISOString().slice(0, 10),
        conta: formEstorno.conta || despesaEstorno.conta,
        motivo: formEstorno.motivo,
        observacoes: formEstorno.observacoes,
      })
      setModalEstorno(false); carregar()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao estornar.')
    } finally { setSalvando(false) }
  }

  const salvarNovaCategoria = async () => {
    if (!novaCategoria.trim()) return
    setSalvandoCategoria(true)
    try {
      const res = await financeiroApi.criarCategoria({ nome: novaCategoria.trim(), tipo: 'SAIDA' })
      const nova = res.data
      setCategorias(prev => [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome)))
      setForm(f => ({ ...f, categoria: nova.id }))
      setNovaCategoria('')
      setMostrarNovaCategoria(false)
    } catch { } finally { setSalvandoCategoria(false) }
  }

  const valorLiquidoCalc = (parseFloat(form.valor_bruto) || 0) - (parseFloat(form.desconto) || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.descricao || !form.valor_bruto || !form.conta || !form.vencimento) {
      setErro('Preencha os campos obrigatorios.'); return
    }
    if (form.recorrente && !form.frequencia) {
      setErro('Selecione a frequencia para despesa recorrente.'); return
    }
    if (form.recorrente && (parseInt(form.quantidade) < 1 || parseInt(form.quantidade) > 60)) {
      setErro('Quantidade deve ser entre 1 e 60.'); return
    }
    setSalvando(true); setErro('')
    const payload = {
      ...form,
      categoria: form.categoria || null,
      referencia_mes: form.referencia_mes ? form.referencia_mes + '-01' : null,
      recorrente: form.recorrente,
      frequencia: form.recorrente ? form.frequencia : '',
      quantidade: form.recorrente ? parseInt(form.quantidade) : 1,
    }
    try {
      if (editando) await financeiroApi.editarDespesa(editando.id, payload)
      else await financeiroApi.criarDespesa(payload)
      setModal(false); carregar()
    } catch (err) {
      setErro(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const handleMarcarPago = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await financeiroApi.marcarPago(modalPagar.id, {
        pagamento: formPag.pagamento || new Date().toISOString().slice(0, 10),
        conta: formPag.conta || modalPagar.conta,
        forma_pagamento: formPag.forma_pagamento,
      })
      setModalPagar(null); carregar()
    } catch { } finally { setSalvando(false) }
  }

  const cancelar = async (d) => {
    if (!confirm('Cancelar despesa "' + d.descricao + '"?')) return
    await financeiroApi.editarDespesa(d.id, { status: 'CANCELADO' }); carregar()
  }

  const labelFrequencia = (freq) => FREQUENCIA_OPTS.find(o => o.value === freq)?.label ?? freq

  const colunas = [
    { key: 'descricao',     label: 'Descricao' },
    { key: 'tipo',          label: 'Tipo',       render: r => <BadgeStatus status={r.tipo} config={TIPO_CFG} /> },
    { key: 'fornecedor',    label: 'Fornecedor', render: r => r.fornecedor || '—', muted: true },
    { key: 'categoria_nome',label: 'Categoria',  render: r => r.categoria_nome || '—', muted: true },
    { key: 'valor_liquido', label: 'Valor',      render: r => formatMoeda(r.valor_liquido) },
    { key: 'vencimento',    label: 'Vencimento', render: r => formatData(r.vencimento), muted: true },
    {
      key: 'recorrente', label: 'Recorrencia',
      render: r => r.recorrente
        ? <span style={{ fontSize: 11, background: 'rgba(6,59,248,0.15)', color: '#6b8fff', borderRadius: 6, padding: '2px 7px' }}>
            {labelFrequencia(r.frequencia)}
          </span>
        : <span style={{ color: '#6b6b8a', fontSize: 12 }}>{'—'}</span>,
      muted: true,
    },
    { key: 'status', label: 'Status', render: r => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <BadgeStatus status={r.status} config={STATUS_CFG} />
        {r.estornado && <span style={{ fontSize: 10, background: 'rgba(167,139,202,0.2)', color: '#a78bca', borderRadius: 4, padding: '1px 5px' }}>Estornada</span>}
      </span>
    )},
    {
      key: '_acoes', label: 'Acoes',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          {(r.status === 'PENDENTE' || r.status === 'ATRASADO') && !r.estornado && (
            <button
              style={{ ...btnAcao('#063BF8'), border: '1px solid #063BF8' }}
              title="Confirmar pagamento"
              onClick={() => { setModalPagar(r); setFormPag({ pagamento: '', conta: r.conta, forma_pagamento: '' }) }}>
              $
            </button>
          )}
          {!r.estornado && <button style={btnAcao('#6b8fff')} onClick={() => abrirEdicao(r)} title="Editar">✏️</button>}
          {r.status !== 'CANCELADO' && !r.estornado && (
            <button style={btnAcao('#f87171')} onClick={() => cancelar(r)} title="Cancelar">🗑️</button>
          )}
        </div>
      ),
    },
  ]

  const previewRecorrencia = () => {
    if (!form.recorrente || parseInt(form.quantidade) < 2) return null
    const label = FREQUENCIA_OPTS.find(o => o.value === form.frequencia)?.label ?? ''
    return (
      <div style={{ marginTop: 10, background: 'rgba(6,59,248,0.08)', border: '1px solid rgba(6,59,248,0.2)', borderRadius: 8, padding: '8px 12px' }}>
        <span style={{ fontSize: 12, color: '#6b8fff' }}>
          Serao criados {form.quantidade} lancamentos. 1 vencimento em {form.vencimento || '(data nao informada)'}, os demais calculados automaticamente ({label}).
        </span>
      </div>
    )
  }

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Contas a Pagar</h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={abrirEstorno} style={{ background: 'transparent', color: '#a78bca', border: '1px solid rgba(61,3,97,0.6)', borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Estorno
            </button>
            <button onClick={abrirNovo} style={{ backgroundColor: '#063BF8', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Nova Despesa
            </button>
          </div>
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
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Descricao *</label>
              <input style={inputStyle} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: VPS Contabo Maio/2026" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Fornecedor</label>
              <input
                style={inputStyle}
                list="lista-fornecedores"
                value={form.fornecedor}
                onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))}
                placeholder="Digite ou selecione um fornecedor"
                autoComplete="off"
              />
              <datalist id="lista-fornecedores">
                {fornecedores.map(forn => <option key={forn.id} value={forn.forn_nome} />)}
              </datalist>
            </div>
            {/* Categoria com mini-form inline */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <label style={{ fontSize: 12, color: '#a78bca' }}>Categoria</label>
                <button type="button"
                  onClick={() => setMostrarNovaCategoria(v => !v)}
                  style={{ fontSize: 11, background: 'rgba(6,59,248,0.1)', color: '#6b8fff', border: '1px solid rgba(6,59,248,0.2)', borderRadius: 5, padding: '1px 7px', cursor: 'pointer' }}>
                  + Nova
                </button>
              </div>
              <select style={inputStyle} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {mostrarNovaCategoria && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="Nome da categoria..."
                    value={novaCategoria}
                    onChange={e => setNovaCategoria(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); salvarNovaCategoria() } }}
                  />
                  <button type="button" onClick={salvarNovaCategoria} disabled={salvandoCategoria}
                    style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 7, padding: '0 12px', cursor: 'pointer', fontSize: 12 }}>
                    {salvandoCategoria ? '...' : 'Salvar'}
                  </button>
                </div>
              )}
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
            <div style={{ background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.15)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#a78bca' }}>Valor liquido</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#f87171' }}>{formatMoeda(valorLiquidoCalc)}</span>
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
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Mes de referencia</label>
              <input style={inputStyle} type="month" value={form.referencia_mes} onChange={e => setForm(f => ({ ...f, referencia_mes: e.target.value }))} />
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Observacoes</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observacoes adicionais..." />
            </div>

            {/* Bloco recorrencia */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={form.recorrente}
                  onChange={e => setForm(f => ({ ...f, recorrente: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#063BF8', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: '#e2d9f3', fontWeight: 500 }}>Despesa recorrente</span>
              </label>

              {form.recorrente && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Frequencia *</label>
                    <select
                      style={inputStyle}
                      value={form.frequencia}
                      onChange={e => setForm(f => ({ ...f, frequencia: e.target.value }))}
                    >
                      {FREQUENCIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Qtd de parcelas *</label>
                    <input
                      style={inputStyle}
                      type="number"
                      min="2"
                      max="60"
                      value={form.quantidade}
                      onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {previewRecorrencia()}
            </div>

            {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
            <BotoesModal onCancel={() => setModal(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}

      {modalPagar && (
        <ModalBase titulo="Confirmar Pagamento" onClose={() => setModalPagar(null)} maxW="max-w-md">
          <form onSubmit={handleMarcarPago} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, color: '#a78bca' }}>{modalPagar.descricao} — {formatMoeda(modalPagar.valor_liquido)}</p>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Data de pagamento</label>
              <input style={inputStyle} type="date" value={formPag.pagamento} onChange={e => setFormPag(f => ({ ...f, pagamento: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Forma de pagamento</label>
              <select style={inputStyle} value={formPag.forma_pagamento} onChange={e => setFormPag(f => ({ ...f, forma_pagamento: e.target.value }))}>
                <option value="">Selecione</option>
                {FORMA_PAGAMENTO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
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

      {/* Modal Estorno de Despesa */}
      {modalEstorno && (
        <ModalBase titulo="Estorno de Despesa" onClose={() => { setModalEstorno(false); setErro('') }}>
          <form onSubmit={handleEstornar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Despesa paga *</label>
              <select
                style={inputStyle}
                value={despesaEstorno?.id || ''}
                onChange={e => {
                  const d = despesasParaEstornar.find(x => String(x.id) === e.target.value)
                  setDespesaEstorno(d || null)
                  if (d) setFormEstorno(f => ({ ...f, conta: d.conta }))
                }}>
                <option value="">Selecione...</option>
                {despesasParaEstornar.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.descricao} — {formatMoeda(d.valor_liquido)}
                  </option>
                ))}
              </select>
            </div>
            {despesaEstorno && (
              <div style={{ background: 'rgba(167,139,202,0.08)', border: '1px solid rgba(167,139,202,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#a78bca' }}>
                Fornecedor: {despesaEstorno.fornecedor || '—'} | Valor: {formatMoeda(despesaEstorno.valor_liquido)}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Data do estorno</label>
                <input style={inputStyle} type="date" value={formEstorno.data_estorno} onChange={e => setFormEstorno(f => ({ ...f, data_estorno: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Conta</label>
                <select style={inputStyle} value={formEstorno.conta} onChange={e => setFormEstorno(f => ({ ...f, conta: e.target.value }))}>
                  <option value="">Selecione</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Motivo *</label>
              <input style={inputStyle} value={formEstorno.motivo} onChange={e => setFormEstorno(f => ({ ...f, motivo: e.target.value }))} placeholder="Ex: Pagamento duplicado" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Observacoes</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={formEstorno.observacoes} onChange={e => setFormEstorno(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
            {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
            <BotoesModal onCancel={() => { setModalEstorno(false); setErro('') }} salvando={salvando} labelConfirmar="Confirmar Estorno" />
          </form>
        </ModalBase>
      )}
    </SistemaLayout>
  )
}
