import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, inputStyle, Spinner, Vazio, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const TIPO_COR = { entrada: '#10b981', saida: '#FF0000' }

export default function LivroCaixaPage() {
  const [lancamentos, setLancamentos] = useState([])
  const [totais, setTotais] = useState(null)
  const [contas, setContas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtros, setFiltros] = useState({ conta: '', tipo: '', data_ini: '', data_fim: '' })
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = { page: pagina }
    if (filtros.conta) params.conta = filtros.conta
    if (filtros.tipo) params.lica_tipo_lancamento = filtros.tipo
    financeiroApi.listarLivroCaixa(params)
      .then(r => {
        const data = r.data
        setLancamentos(data.results ?? data)
        if (data.count) setTotalPaginas(Math.ceil(data.count / 20))
      })
      .catch(() => setLancamentos([]))
      .finally(() => setCarregando(false))
  }, [pagina, filtros])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    financeiroApi.listarContas().then(r => setContas(r.data.results ?? r.data)).catch(() => {})
    financeiroApi.totaisLivroCaixa().then(r => setTotais(r.data)).catch(() => {})
  }, [])

  const colunas = [
    { key: 'created_at', label: 'Data', render: r => formatData(r.created_at), muted: true },
    { key: 'lica_historico', label: 'Histórico' },
    { key: 'lica_tipo_lancamento', label: 'Tipo', render: r => (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: (TIPO_COR[r.lica_tipo_lancamento] || '#a78bca') + '22', color: TIPO_COR[r.lica_tipo_lancamento] || '#a78bca' }}>
        {r.lica_tipo_lancamento === 'entrada' ? 'Entrada' : 'Saída'}
      </span>
    )},
    { key: 'lica_valor', label: 'Valor', render: r => (
      <span style={{ color: r.lica_tipo_lancamento === 'entrada' ? '#10b981' : '#FF0000', fontWeight: 600 }}>
        {r.lica_tipo_lancamento === 'saida' ? '- ' : '+ '}{formatMoeda(r.lica_valor)}
      </span>
    )},
    { key: 'lica_saldo_atual', label: 'Saldo', render: r => formatMoeda(r.lica_saldo_atual), muted: true },
    { key: 'conta', label: 'Conta', render: r => r.conta_nome || '—', muted: true },
  ]

  return (
    <SistemaLayout titulo="Livro Caixa">
      <div className="p-6">
        {/* Totais */}
        {totais && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Entradas', valor: totais.total_entradas, cor: '#10b981' },
              { label: 'Total Saídas', valor: totais.total_saidas, cor: '#FF0000' },
              { label: 'Saldo Atual', valor: totais.saldo_atual, cor: '#063BF8' },
            ].map(({ label, valor, cor }) => (
              <div key={label} className="rounded-xl p-4" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs mb-1" style={{ color: '#a78bca' }}>{label}</p>
                <p className="text-lg font-bold" style={{ color: cor }}>{formatMoeda(valor)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select value={filtros.conta} onChange={e => { setFiltros(f => ({ ...f, conta: e.target.value })); setPagina(1) }}
            style={{ ...inputStyle, width: 'auto' }}>
            <option value="">Todas as contas</option>
            {contas.map(c => <option key={c.cont_id} value={c.cont_id}>{c.cont_nome}</option>)}
          </select>
          <select value={filtros.tipo} onChange={e => { setFiltros(f => ({ ...f, tipo: e.target.value })); setPagina(1) }}
            style={{ ...inputStyle, width: 'auto' }}>
            <option value="">Entrada e saída</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </div>

        {carregando ? <Spinner /> : lancamentos.length === 0 ? <Vazio msg="Nenhum lançamento encontrado." /> :
          <FinanceiroTable colunas={colunas} dados={lancamentos.map(d => ({ ...d, id: d.lica_id }))} />}

        {totalPaginas > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPagina(p)}
                className="w-8 h-8 rounded text-xs font-semibold"
                style={{ backgroundColor: pagina === p ? '#063BF8' : 'rgba(255,255,255,0.06)', color: pagina === p ? '#fff' : '#a78bca' }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </SistemaLayout>
  )
}
