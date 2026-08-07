import { useState, useEffect } from 'react'
import { Spinner, formatMoeda, BotaoPdf } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
  padding: '18px 20px',
}

const sectionTitle = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a78bca', marginBottom: 14 }

function Kpi({ label, value, cor }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: '#a78bca', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: cor || '#f1f5f9' }}>{value}</p>
    </div>
  )
}

function DeltaArrow({ value }) {
  const v = Number(value || 0)
  if (v === 0) return <span style={{ color: '#6b6b8a', fontSize: 13 }}>—</span>
  const cor = v > 0 ? '#10b981' : '#FF0000'
  return <span style={{ color: cor, fontSize: 16, fontWeight: 700 }}>{v > 0 ? '▲' : '▼'} {Math.abs(v).toFixed(1)}%</span>
}

export default function IndicadoresPage() {
  const [indicadores, setIndicadores] = useState(null)
  const [fluxo, setFluxo] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    Promise.all([financeiroApi.indicadoresCfo(), financeiroApi.fluxoProjetado()])
      .then(([ind, fl]) => { setIndicadores(ind.data); setFluxo(fl.data) })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  return (
    <>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Indicadores de CFO</h1>
          <BotaoPdf onGerar={() => financeiroApi.indicadoresCfoPdf()} />
        </div>

        {carregando ? <Spinner /> : !indicadores ? (
          <p style={{ color: '#a78bca', fontSize: 14, textAlign: 'center', padding: 40 }}>Erro ao carregar indicadores.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
            <div style={cardStyle}>
              <div style={sectionTitle}>Rentabilidade</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                <Kpi label="Margem Líquida" value={`${indicadores.margem_liquida}%`} cor={Number(indicadores.margem_liquida) >= 0 ? '#10b981' : '#FF0000'} />
                <Kpi label="EBITDA (mês)" value={formatMoeda(indicadores.ebitda_mes)} cor={Number(indicadores.ebitda_mes) >= 0 ? '#10b981' : '#FF0000'} />
                <Kpi label="vs. Mês Anterior" value={<DeltaArrow value={indicadores.var_mes_anterior} />} />
                <Kpi label="vs. Mesmo Mês (Ano Ant.)" value={<DeltaArrow value={indicadores.var_ano_anterior} />} />
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionTitle}>Operacional</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                <Kpi label="Ponto de Equilíbrio" value={formatMoeda(indicadores.ponto_equilibrio)} cor="#6b8fff" />
                <Kpi label="Ticket Médio" value={formatMoeda(indicadores.ticket_medio)} cor="#6b8fff" />
                <Kpi label="MRR" value={formatMoeda(indicadores.mrr)} cor="#6b8fff" />
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionTitle}>Liquidez &amp; Sobrevivência</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                <Kpi label="Saldo Total" value={formatMoeda(indicadores.saldo_total)} />
                <Kpi
                  label="Runway"
                  value={`${indicadores.runway_meses} meses`}
                  cor={Number(indicadores.runway_meses) >= 6 ? '#10b981' : Number(indicadores.runway_meses) >= 3 ? '#f59e0b' : '#FF0000'}
                />
                <Kpi label="Resultado (mês)" value={formatMoeda(indicadores.resultado_mes)} cor={Number(indicadores.resultado_mes) >= 0 ? '#10b981' : '#FF0000'} />
              </div>
            </div>

            {fluxo && (
              <div style={cardStyle}>
                <div style={sectionTitle}>Fluxo de Caixa Projetado (90 dias)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 }}>
                  <span style={{ color: '#a78bca' }}>Saldo Atual</span>
                  <span style={{ color: '#6b8fff', fontWeight: 700 }}>{formatMoeda(fluxo.saldo_atual)}</span>
                </div>

                {fluxo.janelas?.map(j => {
                  const maxVal = Math.max(
                    ...fluxo.janelas.map(w => Math.max(Number(w.entradas_previstas), Number(w.saidas_previstas), 1))
                  )
                  const wEntrada = (Number(j.entradas_previstas) / maxVal) * 100
                  const wSaida = (Number(j.saidas_previstas) / maxVal) * 100
                  return (
                    <div key={j.periodo} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a78bca', marginBottom: 4 }}>
                        <span>{j.periodo} dias</span>
                        <span style={{ color: Number(j.resultado_previsto) >= 0 ? '#10b981' : '#FF0000', fontWeight: 700 }}>
                          {formatMoeda(j.resultado_previsto)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 3, height: 8 }}>
                        <div style={{ width: `${wEntrada}%`, background: '#10b981', borderRadius: 4 }} title={`Entradas: ${formatMoeda(j.entradas_previstas)}`} />
                        <div style={{ width: `${wSaida}%`, background: '#FF0000', borderRadius: 4 }} title={`Saídas: ${formatMoeda(j.saidas_previstas)}`} />
                      </div>
                    </div>
                  )
                })}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 6 }}>
                  <span style={{ color: '#a78bca', fontWeight: 600 }}>Saldo Projetado (90 dias)</span>
                  <span style={{ color: Number(fluxo.saldo_projetado_90_dias) >= 0 ? '#10b981' : '#FF0000', fontWeight: 700 }}>
                    {formatMoeda(fluxo.saldo_projetado_90_dias)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#6b6b8a', marginTop: 10 }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: '#10b981', marginRight: 4 }} />Entradas</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: '#FF0000', marginRight: 4 }} />Saídas</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
