import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, Vazio, ModalBase, BotoesModal, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function nomeMes(chave) {
  const [ano, mes] = chave.split('-')
  return MESES_PT[parseInt(mes) - 1] + ' ' + ano
}

const TIPO_CFG = {
  FIXA:      'Fixa',
  VARIAVEL:  'Variável',
  PROLABORE: 'Pro-labore',
  IMPOSTO:   'Imposto',
  OUTRO:     'Outro',
}

const btnAcao = (cor) => ({
  background: `${cor}22`, color: cor, border: 'none', borderRadius: 8,
  padding: '5px 10px', fontSize: 12, cursor: 'pointer',
})

const formVazio = {
  tipo: 'FIXA', descricao: '', fornecedor: '',
  categoria: '', valor_bruto: '', desconto: '0', conta: '',
  vencimento: '', pagamento: '', referencia_mes: '', observacoes: '',
}

export default function DespesasPagasPage() {
  const [todasDespesas, setTodasDespesas] = useState([])
  const [contas, setContas]               = useState([])
  const [fornecedores, setFornecedores]   = useState([])
  const [categorias, setCategorias]       = useState([])
  const [carregando, setCarregando]       = useState(true)
  const [filtros, setFiltros]             = useState({ data_inicio: '', data_fim: '' })
  const [modal, setModal]                 = useState(false)
  const [editando, setEditando]           = useState(null)
  const [form, setForm]                   = useState(formVazio)
  const [salvando, setSalvando]           = useState(false)
  const [erro, setErro]                   = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    Promise.all([
      financeiroApi.listarDespesas({ status: 'PAGO' }),
      financeiroApi.listarContas(),
      financeiroApi.listarFornecedores(),
      financeiroApi.listarCategorias({ tipo: 'SAIDA' }),
    ]).then(([r, c, forn, cat]) => {
      setTodasDespesas(r.data.results ?? r.data)
      setContas(c.data.results ?? c.data)
      setFornecedores(Array.isArray(forn.data) ? forn.data : (forn.data.results ?? []))
      setCategorias(cat.data.results ?? cat.data)
    }).catch(() => {}).finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const dadosFiltrados = todasDespesas.filter(d => {
    if (!d.pagamento) return false
    if (filtros.data_inicio && d.pagamento < filtros.data_inicio) return false
    if (filtros.data_fim   && d.pagamento > filtros.data_fim)     return false
    return true
  })

  const porMes = {}
  dadosFiltrados.forEach(item => {
    const chave = item.pagamento.slice(0, 7)
    if (!porMes[chave]) porMes[chave] = []
    porMes[chave].push(item)
  })
  const mesesOrdenados = Object.keys(porMes).sort((a, b) => b.localeCompare(a))
  const totalMes = (itens) => itens.reduce((acc, i) => acc + parseFloat(i.valor_liquido || 0), 0)

  const abrirEdicao = (d) => {
    setEditando(d)
    setForm({
      tipo: d.tipo, descricao: d.descricao, fornecedor: d.fornecedor || '',
      categoria: d.categoria || '',
      valor_bruto: d.valor_bruto, desconto: d.desconto || '0',
      conta: d.conta, vencimento: d.vencimento,
      pagamento: d.pagamento || '',
      referencia_mes: d.referencia_mes ? d.referencia_mes.slice(0, 7) : '',
      observacoes: d.observacoes || '',
    })
    setErro(''); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.descricao || !form.valor_bruto || !form.conta || !form.vencimento) {
      setErro('Preencha os campos obrigatórios.'); return
    }
    setSalvando(true); setErro('')
    const payload = {
      ...form,
      categoria: form.categoria || null,
      referencia_mes: form.referencia_mes ? form.referencia_mes + '-01' : null,
    }
    try {
      await financeiroApi.editarDespesa(editando.id, payload)
      setModal(false); carregar()
    } catch (err) {
      setErro(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const valorLiquidoCalc = (parseFloat(form.valor_bruto) || 0) - (parseFloat(form.desconto) || 0)

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Despesas Pagas</h1>
          <p style={{ fontSize: 13, color: '#a78bca', margin: 0 }}>Histórico de despesas confirmadas, agrupado por mês de pagamento</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#a78bca' }}>Data inicial</label>
            <input type="date" style={{ ...inputStyle, width: 160 }} value={filtros.data_inicio}
              onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#a78bca' }}>Data final</label>
            <input type="date" style={{ ...inputStyle, width: 160 }} value={filtros.data_fim}
              onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))} />
          </div>
          <button onClick={() => setFiltros({ data_inicio: '', data_fim: '' })}
            style={{ background: 'transparent', color: '#a78bca', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
            Limpar
          </button>
        </div>

        {carregando ? <Spinner /> : mesesOrdenados.length === 0 ? <Vazio /> : (
          <div>
            {mesesOrdenados.map(chave => {
              const itens = porMes[chave]
              const total = totalMes(itens)
              return (
                <div key={chave} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>{nomeMes(chave)}</span>
                    <span style={{ fontWeight: 700, color: '#f87171', fontSize: 15 }}>{formatMoeda(total)}</span>
                  </div>
                  <div>
                    {itens.map(item => (
                      <div key={item.id} style={{ padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#f1f5f9', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.descricao}
                          </div>
                          <div style={{ color: '#a78bca', fontSize: 11, marginTop: 2 }}>
                            {item.fornecedor || '—'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ color: '#f87171', fontWeight: 600, fontSize: 13 }}>{formatMoeda(item.valor_liquido)}</div>
                          <div style={{ color: '#6b6b8a', fontSize: 11, marginTop: 2 }}>{formatData(item.pagamento)}</div>
                          <div style={{ marginTop: 6 }}>
                            <button style={btnAcao('#6b8fff')} onClick={() => abrirEdicao(item)} title="Editar">✏️</button>
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

      {modal && editando && (
        <ModalBase titulo="Editar Despesa Paga" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Tipo *</label>
              <select style={inputStyle} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Descrição *</label>
              <input style={inputStyle} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Fornecedor</label>
              <input style={inputStyle} list="lista-fornecedores" value={form.fornecedor}
                onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))}
                placeholder="Digite ou selecione um fornecedor" autoComplete="off" />
              <datalist id="lista-fornecedores">
                {fornecedores.map(forn => <option key={forn.id} value={forn.forn_nome} />)}
              </datalist>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Categoria</label>
              <select style={inputStyle} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
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
              <span style={{ fontSize: 12, color: '#a78bca' }}>Valor líquido</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Data de pagamento</label>
                <input style={inputStyle} type="date" value={form.pagamento} onChange={e => setForm(f => ({ ...f, pagamento: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Mês de referência</label>
                <input style={inputStyle} type="month" value={form.referencia_mes} onChange={e => setForm(f => ({ ...f, referencia_mes: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Observações</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
            {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
            <BotoesModal onCancel={() => setModal(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}
    </SistemaLayout>
  )
}
