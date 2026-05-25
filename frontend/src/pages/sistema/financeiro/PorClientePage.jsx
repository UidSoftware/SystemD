import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, Vazio, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

export default function PorClientePage() {
  const [dados, setDados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())

  const buscar = () => {
    setCarregando(true)
    financeiroApi.receitaPorCliente({ ano })
      .then(r => setDados(r.data))
      .catch(() => setDados([]))
      .finally(() => setCarregando(false))
  }

  useEffect(() => { buscar() }, [])

  const total = dados.reduce((s, d) => s + Number(d.total_liquido || 0), 0)

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Receita por Cliente</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="number" min="2020" max="2099"
              value={ano} onChange={e => setAno(e.target.value)}
              style={{ ...inputStyle, width: 90 }}
            />
            <button onClick={buscar}
              style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Buscar
            </button>
          </div>
        </div>

        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : (
          <>
            <div style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#a78bca' }}>Total recebido em {ano}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{formatMoeda(total)}</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['#', 'Cliente', 'Valor Bruto', 'Descontos', 'Valor Líquido', 'Mensalidades', 'Entradas', '% do Total'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: h === '#' || h === 'Cliente' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: '#a78bca' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d, i) => {
                    const pct = total > 0 ? ((Number(d.total_liquido) / total) * 100).toFixed(1) : '0.0'
                    return (
                      <tr key={d.cliente_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#6b6b8a' }}>{i + 1}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#f1f5f9', fontWeight: 600 }}>{d.cliente}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: '#a78bca' }}>{formatMoeda(d.total_bruto)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: '#f59e0b' }}>{formatMoeda(d.total_descontos)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: '#10b981', fontWeight: 600 }}>{formatMoeda(d.total_liquido)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: '#a78bca' }}>{d.mensalidades}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: '#a78bca' }}>{d.entradas_contrato}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: '#6b8fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <div style={{ width: 50, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#063BF8', borderRadius: 2 }} />
                            </div>
                            {pct}%
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </SistemaLayout>
  )
}
