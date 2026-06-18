import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, Vazio, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function nomeMes(chave) {
  const [ano, mes] = chave.split('-')
  return MESES_PT[parseInt(mes) - 1] + ' ' + ano
}

export default function ReceitasRecebidasPage() {
  const [todasReceitas, setTodasReceitas] = useState([])
  const [carregando, setCarregando]       = useState(true)
  const [filtros, setFiltros]             = useState({ data_inicio: '', data_fim: '' })

  const carregar = useCallback(() => {
    setCarregando(true)
    financeiroApi.listarReceitas({ status: 'RECEBIDO' })
      .then(r => setTodasReceitas(r.data.results ?? r.data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Filtrar por data no frontend
  const dadosFiltrados = todasReceitas.filter(r => {
    if (!r.recebimento) return false
    if (filtros.data_inicio && r.recebimento < filtros.data_inicio) return false
    if (filtros.data_fim   && r.recebimento > filtros.data_fim)     return false
    return true
  })

  // Agrupar por mês (campo recebimento)
  const porMes = {}
  dadosFiltrados.forEach(item => {
    const chave = item.recebimento.slice(0, 7)
    if (!porMes[chave]) porMes[chave] = []
    porMes[chave].push(item)
  })
  const mesesOrdenados = Object.keys(porMes).sort((a, b) => b.localeCompare(a))

  const totalMes = (itens) => itens.reduce((acc, i) => acc + parseFloat(i.valor_liquido || 0), 0)

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Receitas Recebidas</h1>
          <p style={{ fontSize: 13, color: '#a78bca', margin: 0 }}>Histórico de receitas confirmadas, agrupado por mês de recebimento</p>
        </div>

        {/* Filtros de data */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#a78bca' }}>Data inicial</label>
            <input
              type="date"
              style={{ ...inputStyle, width: 160 }}
              value={filtros.data_inicio}
              onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#a78bca' }}>Data final</label>
            <input
              type="date"
              style={{ ...inputStyle, width: 160 }}
              value={filtros.data_fim}
              onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))}
            />
          </div>
          <button
            onClick={() => setFiltros({ data_inicio: '', data_fim: '' })}
            style={{ background: 'transparent', color: '#a78bca', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}
          >
            Limpar
          </button>
        </div>

        {carregando ? (
          <Spinner />
        ) : mesesOrdenados.length === 0 ? (
          <Vazio />
        ) : (
          <div>
            {mesesOrdenados.map(chave => {
              const itens = porMes[chave]
              const total = totalMes(itens)
              return (
                <div
                  key={chave}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    marginBottom: 16,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header do mês */}
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '12px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>
                      {nomeMes(chave)}
                    </span>
                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: 15 }}>
                      {formatMoeda(total)}
                    </span>
                  </div>

                  {/* Lista de receitas */}
                  <div>
                    {itens.map(item => (
                      <div
                        key={item.id}
                        style={{
                          padding: '10px 20px',
                          borderTop: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#f1f5f9', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.descricao}
                          </div>
                          <div style={{ color: '#a78bca', fontSize: 11, marginTop: 2 }}>
                            {item.cliente_nome || '—'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ color: '#10b981', fontWeight: 600, fontSize: 13 }}>
                            {formatMoeda(item.valor_liquido)}
                          </div>
                          <div style={{ color: '#6b6b8a', fontSize: 11, marginTop: 2 }}>
                            {formatData(item.recebimento)}
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
    </SistemaLayout>
  )
}
