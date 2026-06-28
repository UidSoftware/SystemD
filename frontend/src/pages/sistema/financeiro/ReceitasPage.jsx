import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, BadgeStatus, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
function nomeMes(chave) {
  const [ano, mes] = chave.split('-')
  return MESES_PT[parseInt(mes) - 1] + ' ' + ano
}

const STATUS_CFG = {
  PENDENTE:  { label: 'Pendente',  cor: '#f59e0b' },
  RECEBIDO:  { label: 'Recebido',  cor: '#10b981' },
  ATRASADO:  { label: 'Atrasado',  cor: '#FF0000' },
  CANCELADO: { label: 'Cancelado', cor: '#6b7280' },
}
const TIPO_CFG = {
  ENTRADA_CONTRATO: { label: 'Entrada',     cor: '#063BF8' },
  MENSALIDADE:      { label: 'Mensalidade', cor: '#3d0361' },
  CONSULTORIA:      { label: 'Consultoria', cor: '#f59e0b' },
  OUTRO:            { label: 'Outro',       cor: '#6b7280' },
}

const FREQUENCIA_OPTS = [
  { value: 'MENSAL',    label: 'Mensal'    },
  { value: 'QUINZENAL', label: 'Quinzenal' },
  { value: 'SEMANAL',   label: 'Semanal'   },
  { value: 'ANUAL',     label: 'Anual'     },
]

const formVazio = {
  tipo: 'ENTRADA_CONTRATO', descricao: '', cliente: '', os: '',
  categoria: '',
  valor_bruto: '', desconto: '0', conta: '',
  vencimento: '', referencia_mes: '', observacoes: '',
  recorrente: false, frequencia: 'MENSAL', quantidade: 12,
}

const btnAcao = (cor) => ({
  background: `${cor}22`, color: cor, border: 'none', borderRadius: 8,
  padding: '5px 10px', fontSize: 12, cursor: 'pointer',
})

export default function ReceitasPage() {
  const [dados, setDados]                 = useState([])
  const [contas, setContas]               = useState([])
  const [clientes, setClientes]           = useState([])
  const [oss, setOss]                     = useState([])
  const [categorias, setCategorias]       = useState([])
  const [carregando, setCarregando]       = useState(true)
  const [modal, setModal]                 = useState(false)
  const [modalReceber, setModalReceber]   = useState(null)
  const [editando, setEditando]           = useState(null)
  const [form, setForm]                   = useState(formVazio)
  const [formRec, setFormRec]             = useState({ recebimento: '', conta: '' })
  const [salvando, setSalvando]           = useState(false)
  const [erro, setErro]                   = useState('')
  const [filtros, setFiltros]             = useState({ status: '', tipo: '', data_inicio: '', data_fim: '' })
  const [busca, setBusca]                 = useState('')
  const [novaCategoria, setNovaCategoria] = useState('')
  const [salvandoCategoria, setSalvandoCategoria] = useState(false)
  const [mostrarNovaCategoria, setMostrarNovaCategoria] = useState(false)
  const [modalConfirmar, setModalConfirmar] = useState(null)
  const [jaFoiRecebido, setJaFoiRecebido] = useState(false)
  const [recebimentoInline, setRecebimentoInline] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = {}
    // Não passa status para a API — filtramos no frontend para excluir RECEBIDO e CANCELADO por padrão
    if (filtros.tipo) params.tipo = filtros.tipo
    Promise.all([
      financeiroApi.listarReceitas(params),
      financeiroApi.listarContas(),
      financeiroApi.listarClientesOpts({ ativo: true }),
      financeiroApi.listarOSOpts(),
      financeiroApi.listarCategorias({ tipo: 'ENTRADA' }),
    ]).then(([r, c, cl, os, cat]) => {
      let lista = r.data.results ?? r.data
      // Filtrar por status no frontend
      if (filtros.status) {
        lista = lista.filter(item => item.status === filtros.status)
      } else {
        // Sem filtro selecionado: mostrar apenas PENDENTE e ATRASADO
        lista = lista.filter(item => item.status !== 'RECEBIDO' && item.status !== 'CANCELADO')
      }
      if (filtros.data_inicio) lista = lista.filter(item => item.vencimento >= filtros.data_inicio)
      if (filtros.data_fim)    lista = lista.filter(item => item.vencimento <= filtros.data_fim)
      setDados(lista)
      setContas(c.data.results ?? c.data)
      setClientes(cl.data.results ?? cl.data)
      setOss(os.data.results ?? os.data)
      setCategorias(cat.data.results ?? cat.data)
    }).catch(() => {}).finally(() => setCarregando(false))
  }, [filtros])

  useEffect(() => { carregar() }, [carregar])

  const abrirNovo = () => {
    setEditando(null); setForm(formVazio); setErro(''); setJaFoiRecebido(false); setRecebimentoInline(''); setModal(true)
  }
  const abrirEdicao = (r) => {
    setEditando(r)
    setForm({
      tipo: r.tipo, descricao: r.descricao,
      cliente: r.cliente || '', os: r.os || '',
      categoria: r.categoria || '',
      valor_bruto: r.valor_bruto, desconto: r.desconto || '0',
      conta: r.conta, vencimento: r.vencimento,
      referencia_mes: r.referencia_mes ? r.referencia_mes.slice(0, 7) : '',
      observacoes: r.observacoes || '',
    })
    setErro(''); setMostrarNovaCategoria(false); setModal(true)
  }

  const salvarNovaCategoria = async () => {
    if (!novaCategoria.trim()) return
    setSalvandoCategoria(true)
    try {
      const res = await financeiroApi.criarCategoria({ nome: novaCategoria.trim(), tipo: 'ENTRADA' })
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
      setErro('Preencha os campos obrigatórios.'); return
    }
    setSalvando(true); setErro('')
    const payload = {
      ...form,
      cliente: form.cliente || null,
      os: form.os || null,
      categoria: form.categoria || null,
      referencia_mes: form.referencia_mes ? form.referencia_mes + '-01' : null,
      recorrente: form.recorrente,
      frequencia: form.recorrente ? form.frequencia : '',
      quantidade: form.recorrente ? parseInt(form.quantidade) : 1,
      ...(jaFoiRecebido && !editando ? {
        status: 'RECEBIDO',
        recebimento: recebimentoInline || new Date().toISOString().slice(0, 10),
      } : {}),
    }
    try {
      if (editando) await financeiroApi.editarReceita(editando.id, payload)
      else await financeiroApi.criarReceita(payload)
      setModal(false); carregar()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const handleMarcarRecebido = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await financeiroApi.marcarRecebido(modalReceber.id, {
        recebimento: formRec.recebimento || new Date().toISOString().slice(0, 10),
        conta: formRec.conta || modalReceber.conta,
      })
      setModalReceber(null); carregar()
    } catch { } finally { setSalvando(false) }
  }

  const deletar = (r) => setModalConfirmar({ msg: `Cancelar lançamento "${r.descricao}"?`, onConfirm: async () => { await financeiroApi.editarReceita(r.id, { status: 'CANCELADO' }); carregar() } })

  const colunas = [
    {
      key: 'descricao', label: 'Descrição', render: r => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {r.os && <span title={`OS: ${r.os_titulo || r.os}`} style={{ fontSize: 12 }}>🔗</span>}
          {r.descricao}
        </span>
      ),
    },
    { key: 'tipo',          label: 'Tipo',      render: r => <BadgeStatus status={r.tipo} config={TIPO_CFG} /> },
    { key: 'cliente_nome',  label: 'Cliente',   render: r => r.cliente_nome || '—', muted: true },
    { key: 'categoria_nome',label: 'Categoria', render: r => r.categoria_nome || '—', muted: true },
    { key: 'valor_liquido', label: 'Valor',     render: r => formatMoeda(r.valor_liquido) },
    { key: 'vencimento',    label: 'Vencimento',render: r => formatData(r.vencimento), muted: true },
    { key: 'status',        label: 'Status',    render: r => <BadgeStatus status={r.status} config={STATUS_CFG} /> },
    {
      key: '_acoes', label: 'Ações',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          {(r.status === 'PENDENTE' || r.status === 'ATRASADO') && (
            <button
              style={{ ...btnAcao('#10b981'), border: '1px solid #10b981' }}
              title="Confirmar recebimento"
              onClick={() => { setModalReceber(r); setFormRec({ recebimento: '', conta: r.conta }) }}>
              $
            </button>
          )}
          <button style={btnAcao('#6b8fff')} onClick={() => abrirEdicao(r)} title="Editar">✏️</button>
          {r.status !== 'CANCELADO' && (
            <button style={btnAcao('#f87171')} onClick={() => deletar(r)} title="Cancelar">🗑️</button>
          )}
        </div>
      ),
    },
  ]

  // Agrupar por mes de vencimento (ordem crescente)
  const dadosFiltrados = busca.trim()
    ? dados.filter(item => item.descricao?.toLowerCase().includes(busca.toLowerCase()) || item.cliente_nome?.toLowerCase().includes(busca.toLowerCase()))
    : dados

  const porMes = {}
  dadosFiltrados.forEach(item => {
    const chave = item.vencimento.slice(0, 7)
    if (!porMes[chave]) porMes[chave] = []
    porMes[chave].push(item)
  })
  const mesesOrdenados = Object.keys(porMes).sort((a, b) => a.localeCompare(b))
  const totalMes = (itens) => itens.reduce((acc, i) => acc + parseFloat(i.valor_liquido || 0), 0)

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Contas a Receber</h1>
          <button onClick={abrirNovo} style={{ backgroundColor: '#063BF8', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            ➕ Novo Lançamento
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <select style={{ ...inputStyle, width: 160 }} value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
            <option value="">Todos (pendentes)</option>
            <option value="PENDENTE">Pendente</option>
            <option value="ATRASADO">Atrasado</option>
          </select>
          <select style={{ ...inputStyle, width: 160 }} value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}>
            <option value="">Todos tipos</option>
            {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ fontSize: 10, color: '#a78bca' }}>Vencimento de</label>
            <input type="date" style={{ ...inputStyle, width: 150 }} value={filtros.data_inicio} onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ fontSize: 10, color: '#a78bca' }}>até</label>
            <input type="date" style={{ ...inputStyle, width: 150 }} value={filtros.data_fim} onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ fontSize: 10, color: '#a78bca' }}>Busca</label>
            <input type="text" placeholder="Descrição ou cliente..." style={{ ...inputStyle, width: 220 }} value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          {(filtros.data_inicio || filtros.data_fim || filtros.status || filtros.tipo || busca) && (
            <button
              onClick={() => { setFiltros({ status: '', tipo: '', data_inicio: '', data_fim: '' }); setBusca('') }}
              style={{ alignSelf: 'flex-end', background: 'transparent', border: '1px solid rgba(167,139,202,0.3)', color: '#a78bca', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
              Limpar filtros
            </button>
          )}
        </div>

        {carregando ? <Spinner /> : mesesOrdenados.length === 0 ? <Vazio msg={busca ? 'Nenhuma receita encontrada para essa busca.' : undefined} /> : (
          <div style={{ paddingBottom: 32 }}>
            {mesesOrdenados.map(chave => {
              const itens = porMes[chave]
              const total = totalMes(itens)
              return (
                <div key={chave} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>{nomeMes(chave)}</span>
                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: 15 }}>{formatMoeda(total)}</span>
                  </div>
                  <div>
                    {itens.map(item => (
                      <div key={item.id} style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.os && <span title={`OS: ${item.os_titulo || item.os}`} style={{ fontSize: 12, marginRight: 4 }}>🔗</span>}
                            {item.descricao}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                            {item.cliente_nome && <span style={{ color: '#a78bca', fontSize: 11 }}>{item.cliente_nome}</span>}
                            <BadgeStatus status={item.tipo} config={TIPO_CFG} />
                            <BadgeStatus status={item.status} config={STATUS_CFG} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ color: '#10b981', fontWeight: 700, fontSize: 14 }}>{formatMoeda(item.valor_liquido)}</div>
                          <div style={{ color: '#6b6b8a', fontSize: 11, marginTop: 2 }}>venc. {formatData(item.vencimento)}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                            {(item.status === 'PENDENTE' || item.status === 'ATRASADO') && (
                              <button style={{ ...btnAcao('#10b981'), border: '1px solid #10b981' }} title="Confirmar recebimento"
                                onClick={() => { setModalReceber(item); setFormRec({ recebimento: '', conta: item.conta }) }}>$</button>
                            )}
                            <button style={btnAcao('#6b8fff')} onClick={() => abrirEdicao(item)} title="Editar">✏️</button>
                            {item.status !== 'CANCELADO' && (
                              <button style={btnAcao('#f87171')} onClick={() => deletar(item)} title="Cancelar">🗑️</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Nova/Editar */}
      {modal && (
        <ModalBase titulo={editando ? 'Editar Lançamento' : 'Novo Lançamento a Receber'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Tipo *</label>
              <select style={inputStyle} value={form.tipo} onChange={e => {
                const novoTipo = e.target.value
                setForm(f => ({
                  ...f,
                  tipo: novoTipo,
                  recorrente: novoTipo === 'MENSALIDADE' ? true : f.recorrente,
                }))
              }}>
                {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Descrição *</label>
              <input style={inputStyle} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Cliente</label>
                <select style={inputStyle} value={form.cliente} onChange={e => {
                  setForm(f => ({ ...f, cliente: e.target.value, os: '' }))
                }}>
                  <option value="">Nenhum</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>OS</label>
                <select style={inputStyle} value={form.os} onChange={e => setForm(f => ({ ...f, os: e.target.value }))}>
                  <option value="">Nenhuma</option>
                  {oss.filter(o => !form.cliente || String(o.cliente) === String(form.cliente)).map(o => <option key={o.id} value={o.id}>{o.titulo}</option>)}
                </select>
              </div>
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
            {/* Valor líquido calculado */}
            <div style={{ background: 'rgba(6,59,248,0.08)', border: '1px solid rgba(6,59,248,0.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#a78bca' }}>Valor líquido</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#6b8fff' }}>{formatMoeda(valorLiquidoCalc)}</span>
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
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Mês de referência</label>
              <input style={inputStyle} type="month" value={form.referencia_mes} onChange={e => setForm(f => ({ ...f, referencia_mes: e.target.value }))} />
            </div>

            {/* Bloco recorrência */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={form.recorrente}
                  onChange={e => setForm(f => ({ ...f, recorrente: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#063BF8', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: '#e2d9f3', fontWeight: 500 }}>Lancamento recorrente</span>
              </label>
              {form.recorrente && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Frequencia *</label>
                      <select style={inputStyle} value={form.frequencia} onChange={e => setForm(f => ({ ...f, frequencia: e.target.value }))}>
                        {FREQUENCIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Qtd de parcelas *</label>
                      <input style={inputStyle} type="number" min="2" max="60" value={form.quantidade}
                        onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
                    </div>
                  </div>
                  {parseInt(form.quantidade) >= 2 && (
                    <div style={{ marginTop: 10, background: 'rgba(6,59,248,0.08)', border: '1px solid rgba(6,59,248,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                      <span style={{ fontSize: 12, color: '#6b8fff' }}>
                        Serao criados {form.quantidade} lancamentos. 1 vencimento em {form.vencimento || '(data nao informada)'}, os demais calculados automaticamente ({FREQUENCIA_OPTS.find(o => o.value === form.frequencia)?.label}).
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {!editando && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={jaFoiRecebido}
                    onChange={e => { setJaFoiRecebido(e.target.checked); if (!e.target.checked) setRecebimentoInline('') }}
                    style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, color: '#e2d9f3', fontWeight: 500 }}>Ja foi recebido?</span>
                  {form.recorrente && jaFoiRecebido && (
                    <span style={{ fontSize: 11, color: '#10b981' }}>so o 1º sera marcado como recebido</span>
                  )}
                </label>
                {jaFoiRecebido && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Data de recebimento</label>
                    <input style={{ ...inputStyle, maxWidth: 220 }} type="date" value={recebimentoInline}
                      onChange={e => setRecebimentoInline(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Observações</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
            {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
            <BotoesModal onCancel={() => setModal(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}

      {/* Modal Confirmar Recebimento */}
      {modalReceber && (
        <ModalBase titulo="Confirmar Recebimento" onClose={() => setModalReceber(null)} maxW="max-w-md">
          <form onSubmit={handleMarcarRecebido} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, color: '#a78bca' }}>{modalReceber.descricao} — {formatMoeda(modalReceber.valor_liquido)}</p>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Data de recebimento</label>
              <input style={inputStyle} type="date" value={formRec.recebimento} onChange={e => setFormRec(f => ({ ...f, recebimento: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Conta</label>
              <select style={inputStyle} value={formRec.conta} onChange={e => setFormRec(f => ({ ...f, conta: e.target.value }))}>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <BotoesModal onCancel={() => setModalReceber(null)} salvando={salvando} labelConfirmar="Confirmar Recebimento" />
          </form>
        </ModalBase>
      )}
      <ModalConfirmar config={modalConfirmar} onClose={() => setModalConfirmar(null)} />
    </SistemaLayout>
  )
}
