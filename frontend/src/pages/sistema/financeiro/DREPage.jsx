import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function DREPage() {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [ano, setAno] = useState(new Date().getFullYear())

  const buscar = () => {
    setCarregando(true)
    financeiroApi.dre({ ano })
      .then(r => setDados(r.data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }

  useEffect(() => { buscar() }, [])

  const cell = (val, cor) => (
    <td style={{ padding: '8px 12px', textAlign: 'right', color: cor || '#f1f5f9', fontSize: 13, whiteSpace: 'nowrap' }}>
      {formatMoeda(val)}
    </td>
  )

  const headerStyle = { padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#a78bca', textAlign: 'right', whiteSpace: 'nowrap' }
  const labelCell  = { padding: '8px 12px', fontSize: 13, color: '#a78bca', whiteSpace: 'nowrap' }
  const labelBold  = { ...labelCell, color: '#f1f5f9', fontWeight: 700 }

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>DRE — Demonstrativo de Resultados</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="number" min="2020" max="2099"
              value={ano} onChange={e => setAno(e.target.value)}
              style={{ ...inputStyle, width: 90 }}
            />
            <button onClick={buscar}
              style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Gerar
            </button>
          </div>
        </div>

        {carregando ? <Spinner /> : dados && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1a0a2e', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
              <thead>
                <tr style={{ background: '#0a0014' }}>
                  <th style={{ ...headerStyle, textAlign: 'left', minWidth: 160 }}>Linha / Mês</th>
                  {MESES.map((m, i) => <th key={i} style={headerStyle}>{m}</th>)}
                  <th style={{ ...headerStyle, color: '#6b8fff' }}>Total Ano</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'receita_operacional', label: 'Receita Operacional', cor: '#10b981', bold: false },
                  { key: 'receita_financeira',  label: 'Receita Financeira',  cor: '#6b8fff', bold: false },
                  { key: 'descontos',            label: '(−) Descontos',       cor: '#f59e0b', bold: false },
                  { key: 'receita_liquida',      label: 'Receita Líquida',     cor: '#10b981', bold: true },
                  { key: null },
                  { key: 'despesas_fixas',       label: 'Despesas Fixas',      cor: '#FF0000', bold: false },
                  { key: 'despesas_variaveis',   label: 'Desp. Variáveis',     cor: '#FF0000', bold: false },
                  { key: 'prolabore',            label: 'Pró-labore',          cor: '#FF0000', bold: false },
                  { key: 'impostos',             label: 'Impostos',            cor: '#FF0000', bold: false },
                  { key: 'outros',               label: 'Outros',              cor: '#FF0000', bold: false },
                  { key: 'total_despesas',       label: 'Total Despesas',      cor: '#FF0000', bold: true },
                  { key: null },
                  { key: 'resultado',            label: 'Resultado Líquido',   cor: null,      bold: true, dynamic: true },
                ].map((linha, i) => {
                  if (!linha.key) return (
                    <tr key={i}><td colSpan={15} style={{ height: 8 }} /></tr>
                  )
                  return (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: linha.bold ? 'rgba(6,59,248,0.06)' : 'transparent' }}>
                      <td style={linha.bold ? labelBold : labelCell}>{linha.label}</td>
                      {(dados.meses || []).map((m, mi) => {
                        const val = Number(m[linha.key] || 0)
                        const cor = linha.dynamic ? (val >= 0 ? '#10b981' : '#FF0000') : linha.cor
                        return cell(val, linha.bold ? cor : undefined)
                      })}
                      {(() => {
                        const val = Number(dados.totais_ano?.[linha.key] || 0)
                        const cor = linha.dynamic ? (val >= 0 ? '#10b981' : '#FF0000') : (linha.bold ? linha.cor : '#6b8fff')
                        return (
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: cor, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {formatMoeda(val)}
                          </td>
                        )
                      })()}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SistemaLayout>
  )
}
