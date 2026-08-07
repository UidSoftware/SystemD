import { useState, useEffect, useCallback } from 'react'
import { inputStyle, Spinner, ModalBase, BotoesModal, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

// Segue fielmente o ResumoTab do Financeiro.jsx do UidCore (07/08/2026) —
// antes esta pagina era um detalhe de Fluxo de Caixa (lancamentos com
// filtro de mes/conta), sem relacao com o "Resumo" que o UidCore usa
// como aba inicial. Backend equivalente: financeiro/views.py::dashboard()
// ja tinha a maior parte, faltava so indicadores{margem_liquida,
// runway_meses, ponto_equilibrio} aninhado e os dois agrupamentos por
// mes (despesas_pagas_por_mes / receitas_recebidas_por_mes) -- ambos
// adicionados no mesmo commit desta pagina.
//
// 07/08/2026 (mesmo dia): os cards colapsaveis de baixo (Despesas Pagas /
// Receitas Recebidas) mostravam basicamente a mesma informacao que as
// abas dedicadas DespesasPagasPage/ReceitasRecebidasPage la em cima —
// redundancia real, confirmada comparando os dois arquivos. Em vez de
// manter as duas abas so pra edicao, a capacidade de editar (e gerar
// recibo, no caso de receita) foi trazida pra dentro dos proprios cards
// aqui, e as duas abas de cima foram removidas (ver FinanceiroPage.jsx).
// Editar busca o registro completo sob demanda (GET /despesas|receitas/
// {id}/) porque o item resumido do dashboard() so tem
// {id, descricao, valor, data, tipo} — nao o suficiente pro formulario.

const btnAcao = (cor) => ({
  background: `${cor}22`, color: cor, border: 'none', borderRadius: 8,
  padding: '4px 8px', fontSize: 11, cursor: 'pointer',
})

const TIPO_RECEITA_CFG = {
  ENTRADA_CONTRATO: 'Entrada',
  MENSALIDADE:      'Mensalidade',
  CONSULTORIA:      'Consultoria',
  OUTRO:            'Outro',
}

const TIPO_DESPESA_CFG = {
  FIXA:      'Fixa',
  VARIAVEL:  'Variável',
  PROLABORE: 'Pro-labore',
  IMPOSTO:   'Imposto',
  OUTRO:     'Outro',
}

const kpiStyle = {
  background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12, padding: '16px 18px',
}

function Kpi({ label, value, cor }) {
  return (
    <div style={kpiStyle}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bca', margin: 0, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: cor || '#f1f5f9', margin: '6px 0 0' }}>{value}</p>
    </div>
  )
}

function MesColapsavel({ mes, cor, tipo, onEditar, onRecibo, carregandoId, gerandoReciboId }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 4px', background: 'transparent', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 13, color: '#e2d9f3', fontWeight: 500 }}>{mes.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: cor }}>{formatMoeda(mes.total)}</span>
          <span style={{ fontSize: 11, color: '#6b6b8a' }}>{aberto ? '▲' : '▼'}</span>
        </div>
      </button>
      {aberto && (
        <div style={{ paddingBottom: 8 }}>
          {(!mes.itens || mes.itens.length === 0) ? (
            <p style={{ fontSize: 12, color: '#6b6b8a', margin: '4px 0' }}>Nenhum lançamento neste mês.</p>
          ) : (
            mes.itens.map(item => (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '4px 0', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.03)', gap: 8,
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ color: '#e2d9f3', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.descricao}</p>
                  <p style={{ color: '#6b6b8a', margin: 0 }}>{formatData(item.data)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ color: cor, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatMoeda(item.valor)}</span>
                  {tipo === 'receita' && (
                    <button
                      style={{ ...btnAcao('#10b981'), border: '1px solid #10b981' }}
                      title="Gerar recibo PDF"
                      onClick={() => onRecibo(item.id)}
                      disabled={gerandoReciboId === item.id}
                    >
                      {gerandoReciboId === item.id ? '...' : '🧾'}
                    </button>
                  )}
                  <button
                    style={btnAcao('#6b8fff')}
                    title="Editar"
                    onClick={() => onEditar(item.id)}
                    disabled={carregandoId === item.id}
                  >
                    {carregandoId === item.id ? '...' : '✏️'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const formDespesaVazio = {
  tipo: 'FIXA', descricao: '', fornecedor: '',
  categoria: '', valor_bruto: '', desconto: '0', conta: '',
  vencimento: '', pagamento: '', referencia_mes: '', observacoes: '',
}

const formReceitaVazio = {
  tipo: 'MENSALIDADE', descricao: '', cliente: '', os: '',
  categoria: '', valor_bruto: '', desconto: '0', conta: '',
  vencimento: '', recebimento: '', referencia_mes: '', observacoes: '',
}

export default function VisaoGeralPage() {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [abertoDespesas, setAbertoDespesas] = useState(false)
  const [abertoReceitas, setAbertoReceitas] = useState(false)

  // Listas de apoio pros formularios de edicao
  const [contas, setContas]             = useState([])
  const [categoriasEntrada, setCategoriasEntrada] = useState([])
  const [categoriasSaida, setCategoriasSaida]     = useState([])
  const [clientes, setClientes]         = useState([])
  const [oss, setOss]                   = useState([])
  const [fornecedores, setFornecedores] = useState([])

  // Edicao de Despesa
  const [carregandoDespesaId, setCarregandoDespesaId] = useState(null)
  const [modalDespesa, setModalDespesa] = useState(false)
  const [editandoDespesa, setEditandoDespesa] = useState(null)
  const [formDespesa, setFormDespesa] = useState(formDespesaVazio)

  // Edicao de Receita
  const [carregandoReceitaId, setCarregandoReceitaId] = useState(null)
  const [modalReceita, setModalReceita] = useState(false)
  const [editandoReceita, setEditandoReceita] = useState(null)
  const [formReceita, setFormReceita] = useState(formReceitaVazio)
  const [gerandoRecibo, setGerandoRecibo] = useState(null)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    Promise.all([
      financeiroApi.dashboard(),
      financeiroApi.listarContas(),
      financeiroApi.listarCategorias({ tipo: 'ENTRADA' }),
      financeiroApi.listarCategorias({ tipo: 'SAIDA' }),
      financeiroApi.listarClientesOpts({ ativo: true }),
      financeiroApi.listarOSOpts(),
      financeiroApi.listarFornecedores(),
    ]).then(([d, c, catE, catS, cl, os, forn]) => {
      setDados(d.data)
      setContas(c.data.results ?? c.data)
      setCategoriasEntrada(catE.data.results ?? catE.data)
      setCategoriasSaida(catS.data.results ?? catS.data)
      setClientes(cl.data.results ?? cl.data)
      setOss(os.data.results ?? os.data)
      setFornecedores(Array.isArray(forn.data) ? forn.data : (forn.data.results ?? []))
    }).catch(() => {}).finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const abrirEdicaoDespesa = (id) => {
    setCarregandoDespesaId(id)
    financeiroApi.buscarDespesa(id).then(r => {
      const d = r.data
      setEditandoDespesa(d)
      setFormDespesa({
        tipo: d.tipo, descricao: d.descricao, fornecedor: d.fornecedor || '',
        categoria: d.categoria || '',
        valor_bruto: d.valor_bruto, desconto: d.desconto || '0',
        conta: d.conta, vencimento: d.vencimento,
        pagamento: d.pagamento || '',
        referencia_mes: d.referencia_mes ? d.referencia_mes.slice(0, 7) : '',
        observacoes: d.observacoes || '',
      })
      setErro(''); setModalDespesa(true)
    }).catch(() => alert('Erro ao carregar despesa.'))
      .finally(() => setCarregandoDespesaId(null))
  }

  const abrirEdicaoReceita = (id) => {
    setCarregandoReceitaId(id)
    financeiroApi.buscarReceita(id).then(r => {
      const rec = r.data
      setEditandoReceita(rec)
      setFormReceita({
        tipo: rec.tipo, descricao: rec.descricao,
        cliente: rec.cliente || '', os: rec.os || '',
        categoria: rec.categoria || '',
        valor_bruto: rec.valor_bruto, desconto: rec.desconto || '0',
        conta: rec.conta, vencimento: rec.vencimento,
        recebimento: rec.recebimento || '',
        referencia_mes: rec.referencia_mes ? rec.referencia_mes.slice(0, 7) : '',
        observacoes: rec.observacoes || '',
      })
      setErro(''); setModalReceita(true)
    }).catch(() => alert('Erro ao carregar receita.'))
      .finally(() => setCarregandoReceitaId(null))
  }

  const handleSubmitDespesa = async (e) => {
    e.preventDefault()
    if (!formDespesa.descricao || !formDespesa.valor_bruto || !formDespesa.conta || !formDespesa.vencimento) {
      setErro('Preencha os campos obrigatórios.'); return
    }
    setSalvando(true); setErro('')
    const payload = {
      ...formDespesa,
      categoria: formDespesa.categoria || null,
      referencia_mes: formDespesa.referencia_mes ? formDespesa.referencia_mes + '-01' : null,
    }
    try {
      await financeiroApi.editarDespesa(editandoDespesa.id, payload)
      setModalDespesa(false); carregar()
    } catch (err) {
      setErro(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const handleSubmitReceita = async (e) => {
    e.preventDefault()
    if (!formReceita.descricao || !formReceita.valor_bruto || !formReceita.conta || !formReceita.vencimento) {
      setErro('Preencha os campos obrigatórios.'); return
    }
    setSalvando(true); setErro('')
    const payload = {
      ...formReceita,
      cliente: formReceita.cliente || null,
      os: formReceita.os || null,
      categoria: formReceita.categoria || null,
      referencia_mes: formReceita.referencia_mes ? formReceita.referencia_mes + '-01' : null,
    }
    try {
      await financeiroApi.editarReceita(editandoReceita.id, payload)
      setModalReceita(false); carregar()
    } catch (err) {
      setErro(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const handleGerarRecibo = async (id) => {
    setGerandoRecibo(id)
    try {
      const res = await financeiroApi.gerarRecibo(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      alert('Erro ao gerar recibo.')
    } finally {
      setGerandoRecibo(null)
    }
  }

  if (carregando) return (
    <div style={{ padding: '24px 24px 0' }}><Spinner /></div>
  )
  if (!dados) return (
    <div style={{ padding: '24px 24px 0' }}>
      <p style={{ color: '#a78bca', fontSize: 14, textAlign: 'center', padding: 40 }}>Erro ao carregar dados.</p>
    </div>
  )

  const despesasPorMes = dados.despesas_pagas_por_mes || []
  const receitasPorMes = dados.receitas_recebidas_por_mes || []
  const totalDespesas = despesasPorMes.reduce((s, m) => s + (Number(m.total) || 0), 0)
  const totalReceitas = receitasPorMes.reduce((s, m) => s + (Number(m.total) || 0), 0)
  const ind = dados.indicadores || {}

  const valorLiquidoDespesa = (parseFloat(formDespesa.valor_bruto) || 0) - (parseFloat(formDespesa.desconto) || 0)
  const valorLiquidoReceita = (parseFloat(formReceita.valor_bruto) || 0) - (parseFloat(formReceita.desconto) || 0)

  return (
    <>
      <div style={{ padding: '24px 24px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 20 }}>Visão Geral</h1>

        {/* KPIs principais */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
          <Kpi label="Saldo Total" value={formatMoeda(dados.saldo_total_contas)} cor="#6b8fff" />
          <Kpi label="Receita (mês)" value={formatMoeda(dados.receita_mes)} cor="#10b981" />
          <Kpi label="Despesa (mês)" value={formatMoeda(dados.despesa_mes)} cor="#FF0000" />
          <Kpi label="Resultado" value={formatMoeda(dados.resultado_mes)} cor={Number(dados.resultado_mes) >= 0 ? '#10b981' : '#FF0000'} />
        </div>

        {/* Indicadores CFO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <Kpi label="MRR" value={formatMoeda(dados.mrr)} cor="#6b8fff" />
          <Kpi label="Margem Líquida" value={`${ind.margem_liquida ?? 0}%`} cor={Number(ind.margem_liquida) >= 0 ? '#10b981' : '#FF0000'} />
          <Kpi
            label="Runway"
            value={`${ind.runway_meses ?? 0} meses`}
            cor={Number(ind.runway_meses) >= 6 ? '#10b981' : Number(ind.runway_meses) >= 3 ? '#f59e0b' : '#FF0000'}
          />
          <Kpi label="Ponto de Equilíbrio" value={formatMoeda(ind.ponto_equilibrio)} cor="#6b8fff" />
        </div>

        {/* Vencimentos 30 dias */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#10b981', margin: '0 0 10px' }}>Receitas a Vencer (30 dias)</h3>
            {(!dados.receitas_vencer || dados.receitas_vencer.length === 0) ? (
              <p style={{ fontSize: 13, color: '#6b6b8a', margin: 0 }}>Nenhuma receita pendente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dados.receitas_vencer.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: '#e2d9f3', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.descricao}</p>
                      <p style={{ color: '#6b6b8a', margin: 0, fontSize: 11 }}>{r.cliente_nome || '—'} · {r.vencimento}</p>
                    </div>
                    <span style={{ color: '#10b981', fontWeight: 700, marginLeft: 8, whiteSpace: 'nowrap' }}>{formatMoeda(r.valor_liquido)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#FF0000', margin: '0 0 10px' }}>Despesas a Vencer (30 dias)</h3>
            {(!dados.despesas_vencer || dados.despesas_vencer.length === 0) ? (
              <p style={{ fontSize: 13, color: '#6b6b8a', margin: 0 }}>Nenhuma despesa pendente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dados.despesas_vencer.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: '#e2d9f3', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.descricao}</p>
                      <p style={{ color: '#6b6b8a', margin: 0, fontSize: 11 }}>{d.fornecedor || '—'} · {d.vencimento}</p>
                    </div>
                    <span style={{ color: '#FF0000', fontWeight: 700, marginLeft: 8, whiteSpace: 'nowrap' }}>{formatMoeda(d.valor_liquido)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Grafico 6 meses */}
        {dados.grafico_6_meses && (
          <div style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#a78bca', margin: '0 0 14px' }}>Receita x Despesa (6 meses)</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
              {dados.grafico_6_meses.map((m) => {
                const max = Math.max(...dados.grafico_6_meses.map(x => Math.max(Number(x.receita), Number(x.despesa), 1)))
                const hRec = (Number(m.receita) / max) * 100
                const hDes = (Number(m.despesa) / max) * 100
                return (
                  <div key={m.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 128, width: '100%', justifyContent: 'center' }}>
                      <div style={{ width: 12, background: '#10b981', borderRadius: '4px 4px 0 0', height: `${hRec}%` }} title={formatMoeda(m.receita)} />
                      <div style={{ width: 12, background: '#FF0000', borderRadius: '4px 4px 0 0', height: `${hDes}%` }} title={formatMoeda(m.despesa)} />
                    </div>
                    <span style={{ fontSize: 10, color: '#6b6b8a' }}>{m.label}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#a78bca' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: '#10b981', display: 'inline-block' }} />Receita</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: '#FF0000', display: 'inline-block' }} />Despesa</span>
            </div>
          </div>
        )}

        {/* Cards colapsaveis Despesas Pagas / Receitas Recebidas — com edicao (e recibo, pra receita) inline */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
            <button
              type="button"
              onClick={() => setAbertoDespesas(v => !v)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#FF0000', margin: 0 }}>Despesas Pagas</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#FF0000' }}>{formatMoeda(totalDespesas)}</span>
                <span style={{ fontSize: 11, color: '#6b6b8a' }}>{abertoDespesas ? '▲' : '▼'}</span>
              </div>
            </button>
            {abertoDespesas && (
              <div style={{ padding: '0 16px 12px' }}>
                {despesasPorMes.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#6b6b8a' }}>Nenhuma despesa paga registrada.</p>
                ) : (
                  despesasPorMes.map(mes => (
                    <MesColapsavel
                      key={mes.mes} mes={mes} cor="#FF0000" tipo="despesa"
                      onEditar={abrirEdicaoDespesa} carregandoId={carregandoDespesaId}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
            <button
              type="button"
              onClick={() => setAbertoReceitas(v => !v)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#10b981', margin: 0 }}>Receitas Recebidas</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{formatMoeda(totalReceitas)}</span>
                <span style={{ fontSize: 11, color: '#6b6b8a' }}>{abertoReceitas ? '▲' : '▼'}</span>
              </div>
            </button>
            {abertoReceitas && (
              <div style={{ padding: '0 16px 12px' }}>
                {receitasPorMes.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#6b6b8a' }}>Nenhuma receita recebida registrada.</p>
                ) : (
                  receitasPorMes.map(mes => (
                    <MesColapsavel
                      key={mes.mes} mes={mes} cor="#10b981" tipo="receita"
                      onEditar={abrirEdicaoReceita} carregandoId={carregandoReceitaId}
                      onRecibo={handleGerarRecibo} gerandoReciboId={gerandoRecibo}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {modalDespesa && editandoDespesa && (
        <ModalBase titulo="Editar Despesa Paga" onClose={() => setModalDespesa(false)}>
          <form onSubmit={handleSubmitDespesa} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Tipo *</label>
              <select style={inputStyle} value={formDespesa.tipo} onChange={e => setFormDespesa(f => ({ ...f, tipo: e.target.value }))}>
                {Object.entries(TIPO_DESPESA_CFG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Descrição *</label>
              <input style={inputStyle} value={formDespesa.descricao} onChange={e => setFormDespesa(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Fornecedor</label>
              <input style={inputStyle} list="lista-fornecedores-vg" value={formDespesa.fornecedor}
                onChange={e => setFormDespesa(f => ({ ...f, fornecedor: e.target.value }))}
                placeholder="Digite ou selecione um fornecedor" autoComplete="off" />
              <datalist id="lista-fornecedores-vg">
                {fornecedores.map(forn => <option key={forn.id} value={forn.forn_nome} />)}
              </datalist>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Categoria</label>
              <select style={inputStyle} value={formDespesa.categoria} onChange={e => setFormDespesa(f => ({ ...f, categoria: e.target.value }))}>
                <option value="">Sem categoria</option>
                {categoriasSaida.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Valor bruto (R$) *</label>
                <input style={inputStyle} type="number" step="0.01" value={formDespesa.valor_bruto} onChange={e => setFormDespesa(f => ({ ...f, valor_bruto: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Desconto (R$)</label>
                <input style={inputStyle} type="number" step="0.01" value={formDespesa.desconto} onChange={e => setFormDespesa(f => ({ ...f, desconto: e.target.value }))} />
              </div>
            </div>
            <div style={{ background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.15)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#a78bca' }}>Valor líquido</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#f87171' }}>{formatMoeda(valorLiquidoDespesa)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Conta *</label>
                <select style={inputStyle} value={formDespesa.conta} onChange={e => setFormDespesa(f => ({ ...f, conta: e.target.value }))}>
                  <option value="">Selecione</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Vencimento *</label>
                <input style={inputStyle} type="date" value={formDespesa.vencimento} onChange={e => setFormDespesa(f => ({ ...f, vencimento: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Data de pagamento</label>
                <input style={inputStyle} type="date" value={formDespesa.pagamento} onChange={e => setFormDespesa(f => ({ ...f, pagamento: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Mês de referência</label>
                <input style={inputStyle} type="month" value={formDespesa.referencia_mes} onChange={e => setFormDespesa(f => ({ ...f, referencia_mes: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Observações</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={formDespesa.observacoes} onChange={e => setFormDespesa(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
            {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
            <BotoesModal onCancel={() => setModalDespesa(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}

      {modalReceita && editandoReceita && (
        <ModalBase titulo="Editar Receita Recebida" onClose={() => setModalReceita(false)}>
          <form onSubmit={handleSubmitReceita} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Tipo *</label>
              <select style={inputStyle} value={formReceita.tipo} onChange={e => setFormReceita(f => ({ ...f, tipo: e.target.value }))}>
                {Object.entries(TIPO_RECEITA_CFG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Descrição *</label>
              <input style={inputStyle} value={formReceita.descricao} onChange={e => setFormReceita(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Cliente</label>
                <select style={inputStyle} value={formReceita.cliente} onChange={e => setFormReceita(f => ({ ...f, cliente: e.target.value, os: '' }))}>
                  <option value="">Nenhum</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>OS</label>
                <select style={inputStyle} value={formReceita.os} onChange={e => setFormReceita(f => ({ ...f, os: e.target.value }))}>
                  <option value="">Nenhuma</option>
                  {oss.filter(o => !formReceita.cliente || String(o.cliente) === String(formReceita.cliente)).map(o => <option key={o.id} value={o.id}>{o.titulo}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Categoria</label>
              <select style={inputStyle} value={formReceita.categoria} onChange={e => setFormReceita(f => ({ ...f, categoria: e.target.value }))}>
                <option value="">Sem categoria</option>
                {categoriasEntrada.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Valor bruto (R$) *</label>
                <input style={inputStyle} type="number" step="0.01" value={formReceita.valor_bruto} onChange={e => setFormReceita(f => ({ ...f, valor_bruto: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Desconto (R$)</label>
                <input style={inputStyle} type="number" step="0.01" value={formReceita.desconto} onChange={e => setFormReceita(f => ({ ...f, desconto: e.target.value }))} />
              </div>
            </div>
            <div style={{ background: 'rgba(6,59,248,0.08)', border: '1px solid rgba(6,59,248,0.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#a78bca' }}>Valor líquido</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#6b8fff' }}>{formatMoeda(valorLiquidoReceita)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Conta *</label>
                <select style={inputStyle} value={formReceita.conta} onChange={e => setFormReceita(f => ({ ...f, conta: e.target.value }))}>
                  <option value="">Selecione</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Vencimento *</label>
                <input style={inputStyle} type="date" value={formReceita.vencimento} onChange={e => setFormReceita(f => ({ ...f, vencimento: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Data de recebimento</label>
                <input style={inputStyle} type="date" value={formReceita.recebimento} onChange={e => setFormReceita(f => ({ ...f, recebimento: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Mês de referência</label>
                <input style={inputStyle} type="month" value={formReceita.referencia_mes} onChange={e => setFormReceita(f => ({ ...f, referencia_mes: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Observações</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={formReceita.observacoes} onChange={e => setFormReceita(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
            {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
            <BotoesModal onCancel={() => setModalReceita(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}
    </>
  )
}
