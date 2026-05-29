import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, BadgeStatus, inputStyle, Spinner, Vazio, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
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

export default function DespesasRelatorioPage() {
  const [dados, setDados]           = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtros, setFiltros]       = useState({ status: '', tipo: '' })

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = {}
    if (filtros.status) params.status = filtros.status
    if (filtros.tipo)   params.tipo   = filtros.tipo
    financeiroApi.listarDespesas(params)
      .then(r => setDados(r.data.results ?? r.data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [filtros])

  useEffect(() => { carregar() }, [carregar])

  const totalBruto   = dados.reduce((s, d) => s + parseFloat(d.valor_bruto || 0), 0)
  const totalDesconto= dados.reduce((s, d) => s + parseFloat(d.desconto || 0), 0)
  const totalLiquido = dados.reduce((s, d) => s + parseFloat(d.valor_liquido || 0), 0)

  const colunas = [
    { key: 'descricao',     label: 'Descricao' },
    { key: 'tipo',          label: 'Tipo',       render: r => <BadgeStatus status={r.tipo} config={TIPO_CFG} /> },
    { key: 'fornecedor',    label: 'Fornecedor', render: r => r.fornecedor || '—', muted: true },
    { key: 'categoria_nome',label: 'Categoria',  render: r => r.categoria_nome || '—', muted: true },
    { key: 'valor_bruto',   label: 'Bruto',      render: r => formatMoeda(r.valor_bruto) },
    { key: 'desconto',      label: 'Desconto',   render: r => r.desconto > 0 ? formatMoeda(r.desconto) : '—', muted: true },
    { key: 'valor_liquido', label: 'Liquido',    render: r => formatMoeda(r.valor_liquido) },
    { key: 'vencimento',    label: 'Vencimento', render: r => formatData(r.vencimento), muted: true },
    { key: 'status',        label: 'Status',     render: r => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <BadgeStatus status={r.status} config={STATUS_CFG} />
        {r.estornado && <span style={{ fontSize: 10, background: 'rgba(167,139,202,0.2)', color: '#a78bca', borderRadius: 4, padding: '1px 5px' }}>Estornada</span>}
      </span>
    )},
  ]

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Relatorio de Despesas</h1>
        </div>

        {/* Totais por periodo */}
        {!carregando && dados.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Total Bruto',     valor: totalBruto,    cor: '#6b8fff' },
              { label: 'Total Descontos', valor: totalDesconto, cor: '#f59e0b' },
              { label: 'Total Liquido',   valor: totalLiquido,  cor: '#f87171' },
            ].map(({ label, valor, cor }) => (
              <div key={label} style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 16px' }}>
                <p style={{ fontSize: 12, color: '#a78bca', marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: cor }}>{formatMoeda(valor)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
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
    </SistemaLayout>
  )
}
