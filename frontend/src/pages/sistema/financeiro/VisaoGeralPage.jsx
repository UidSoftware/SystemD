import { useState, useEffect } from 'react'
import { Spinner, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

// Segue fielmente o ResumoTab do Financeiro.jsx do UidCore (07/08/2026) —
// antes esta pagina era um detalhe de Fluxo de Caixa (lancamentos com
// filtro de mes/conta), sem relacao com o "Resumo" que o UidCore usa
// como aba inicial. Backend equivalente: financeiro/views.py::dashboard()
// ja tinha a maior parte, faltava so indicadores{margem_liquida,
// runway_meses, ponto_equilibrio} aninhado e os dois agrupamentos por
// mes (despesas_pagas_por_mes / receitas_recebidas_por_mes) -- ambos
// adicionados no mesmo commit desta pagina.

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

function MesColapsavel({ mes, cor }) {
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
                padding: '4px 0', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ color: '#e2d9f3', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.descricao}</p>
                  <p style={{ color: '#6b6b8a', margin: 0 }}>{item.data}</p>
                </div>
                <span style={{ color: cor, fontWeight: 700, marginLeft: 8, whiteSpace: 'nowrap' }}>{formatMoeda(item.valor)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function VisaoGeralPage() {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [abertoDespesas, setAbertoDespesas] = useState(false)
  const [abertoReceitas, setAbertoReceitas] = useState(false)

  useEffect(() => {
    setCarregando(true)
    financeiroApi.dashboard()
      .then(r => setDados(r.data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

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

        {/* Cards colapsaveis Despesas Pagas / Receitas Recebidas */}
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
                  despesasPorMes.map(mes => <MesColapsavel key={mes.mes} mes={mes} cor="#FF0000" />)
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
                  receitasPorMes.map(mes => <MesColapsavel key={mes.mes} mes={mes} cor="#10b981" />)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
