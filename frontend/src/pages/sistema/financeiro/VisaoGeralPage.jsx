import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const TIPO_COR = { ENTRADA: '#10b981', SAIDA: '#FF0000' }
const ORIGEM_COR = { APORTE: '#063BF8', RECEITA: '#10b981', DESPESA: '#f59e0b', MANUAL: '#6b7280' }

export default function VisaoGeralPage() {
  const [dados, setDados] = useState(null)
  const [contas, setContas] = useState([])
  const [saldoAtual, setSaldoAtual] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7))
  const [contaId, setContaId] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = { mes }
    if (contaId) params.conta = contaId
    financeiroApi.fluxoCaixa(params)
      .then(r => setDados(r.data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [mes, contaId])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    financeiroApi.listarContas().then(r => setContas(r.data.results ?? r.data)).catch(() => {})
    financeiroApi.totaisLivroCaixa({}).then(r => setSaldoAtual(r.data.saldo_atual)).catch(() => {})
  }, [])

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 20 }}>Visão Geral — Fluxo de Caixa</h1>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, color: '#a78bca', display: 'block', marginBottom: 4 }}>Mês</label>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#a78bca', display: 'block', marginBottom: 4 }}>Conta</label>
            <select style={{ ...inputStyle, width: 200 }} value={contaId} onChange={e => setContaId(e.target.value)}>
              <option value="">Todas as contas</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        {carregando ? <Spinner /> : dados && (
          <>
            {/* Cards de resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Saldo Inicial',    valor: dados.saldo_inicial,   cor: '#a78bca' },
                { label: 'Total Entradas',   valor: dados.total_entradas,  cor: '#10b981' },
                { label: 'Total Saídas',     valor: dados.total_saidas,    cor: '#FF0000' },
                { label: 'Saldo do Período', valor: dados.saldo_final,     cor: Number(dados.saldo_final) >= 0 ? '#063BF8' : '#FF0000' },
                { label: 'Saldo Atual',      valor: saldoAtual,            cor: saldoAtual != null ? (Number(saldoAtual) >= 0 ? '#10b981' : '#FF0000') : '#a78bca' },
              ].map(({ label, valor, cor }) => (
                <div key={label} style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
                  <p style={{ fontSize: 11, color: '#a78bca', marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: cor }}>{formatMoeda(valor ?? 0)}</p>
                </div>
              ))}
            </div>

            {/* Tabela de lançamentos */}
            {dados.lancamentos?.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {[
                        'Data', 'Histórico',
                        ...(!contaId ? ['Conta'] : []),
                        'Origem', 'Tipo', 'Valor', 'Saldo',
                      ].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#a78bca' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dados.lancamentos.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: l.estornado ? 0.45 : 1 }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#a78bca' }}>{l.data}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#f1f5f9' }}>{l.descricao}</td>
                        {!contaId && (
                          <td style={{ padding: '10px 12px', fontSize: 13, color: '#6b8fff' }}>{l.conta_nome}</td>
                        )}
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, background: (ORIGEM_COR[l.origem] || '#6b7280') + '22', color: ORIGEM_COR[l.origem] || '#6b7280', borderRadius: 6, padding: '2px 7px' }}>
                            {l.origem}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, background: TIPO_COR[l.tipo] + '22', color: TIPO_COR[l.tipo], borderRadius: 6, padding: '2px 7px' }}>
                            {l.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: l.tipo === 'ENTRADA' ? '#10b981' : '#FF0000' }}>
                          {l.tipo === 'SAIDA' ? '− ' : '+ '}{formatMoeda(l.valor)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#a78bca', fontSize: 13 }}>
                          {formatMoeda(l.saldo_atual)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#a78bca', fontSize: 14, textAlign: 'center', padding: 40 }}>Nenhum lançamento neste período.</p>
            )}
          </>
        )}
      </div>
    </SistemaLayout>
  )
}
