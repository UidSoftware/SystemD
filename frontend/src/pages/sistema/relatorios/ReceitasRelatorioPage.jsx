import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, BadgeStatus, inputStyle, Spinner, Vazio, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

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

export default function ReceitasRelatorioPage() {
  const [dados, setDados]         = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtros, setFiltros]     = useState({ status: '', tipo: '', cliente: '' })
  const [clientes, setClientes]   = useState([])

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = {}
    if (filtros.status)  params.status  = filtros.status
    if (filtros.tipo)    params.tipo    = filtros.tipo
    if (filtros.cliente) params.cliente = filtros.cliente
    Promise.all([
      financeiroApi.listarReceitas(params),
      financeiroApi.listarClientesOpts({ ativo: true }),
    ]).then(([r, cl]) => {
      setDados(r.data.results ?? r.data)
      setClientes(cl.data.results ?? cl.data)
    }).catch(() => {}).finally(() => setCarregando(false))
  }, [filtros])

  useEffect(() => { carregar() }, [carregar])

  const totalBruto   = dados.reduce((s, r) => s + parseFloat(r.valor_bruto || 0), 0)
  const totalDesconto= dados.reduce((s, r) => s + parseFloat(r.desconto || 0), 0)
  const totalLiquido = dados.reduce((s, r) => s + parseFloat(r.valor_liquido || 0), 0)

  const colunas = [
    {
      key: 'descricao', label: 'Descricao', render: r => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {r.os && <span title={`OS: ${r.os_titulo || r.os}`} style={{ fontSize: 12 }}>🔗</span>}
          {r.descricao}
        </span>
      ),
    },
    { key: 'tipo',          label: 'Tipo',      render: r => <BadgeStatus status={r.tipo} config={TIPO_CFG} /> },
    { key: 'cliente_nome',  label: 'Cliente',   render: r => r.cliente_nome || '—', muted: true },
    { key: 'categoria_nome',label: 'Categoria', render: r => r.categoria_nome || '—', muted: true },
    { key: 'valor_bruto',   label: 'Bruto',     render: r => formatMoeda(r.valor_bruto) },
    { key: 'desconto',      label: 'Desconto',  render: r => r.desconto > 0 ? formatMoeda(r.desconto) : '—', muted: true },
    { key: 'valor_liquido', label: 'Liquido',   render: r => formatMoeda(r.valor_liquido) },
    { key: 'vencimento',    label: 'Vencimento',render: r => formatData(r.vencimento), muted: true },
    { key: 'status',        label: 'Status',    render: r => <BadgeStatus status={r.status} config={STATUS_CFG} /> },
  ]

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Relatorio de Receitas</h1>
        </div>

        {/* Totais por periodo */}
        {!carregando && dados.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Total Bruto',     valor: totalBruto,    cor: '#6b8fff' },
              { label: 'Total Descontos', valor: totalDesconto, cor: '#f59e0b' },
              { label: 'Total Liquido',   valor: totalLiquido,  cor: '#10b981' },
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
          <select style={{ ...inputStyle, width: 180 }} value={filtros.cliente} onChange={e => setFiltros(f => ({ ...f, cliente: e.target.value }))}>
            <option value="">Todos clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
          </select>
        </div>

        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados} />}
      </div>
    </SistemaLayout>
  )
}
