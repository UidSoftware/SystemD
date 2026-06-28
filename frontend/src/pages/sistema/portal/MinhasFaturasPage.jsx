import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { financeiroApi } from '../../../services/financeiroApi'
import { useAuth } from '../../../contexts/AuthContext'
import { Spinner } from '../../../components/sistema/FinanceiroTable'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const nomeMes = (chave) => { const [ano, mes] = chave.split('-'); return MESES_PT[parseInt(mes)-1] + ' ' + ano }
const fmt = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
const fmtData = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'

const TIPO_LABEL = { MENSALIDADE: 'Mensalidade', ENTRADA_CONTRATO: 'Entrada', CONSULTORIA: 'Consultoria', OUTRO: 'Outro' }

export default function MinhasFaturasPage() {
  const { usuario } = useAuth()
  const [receitas, setReceitas]   = useState([])
  const [carregando, setCarregando] = useState(true)
  const [totalGeral, setTotalGeral] = useState(0)

  useEffect(() => {
    if (!usuario?.cliente_id) { setCarregando(false); return }
    financeiroApi.listarReceitas({ cliente: usuario.cliente_id, status: 'RECEBIDO' })
      .then(r => {
        const lista = r.data.results ?? r.data
        setReceitas(lista)
        setTotalGeral(lista.reduce((acc, i) => acc + Number(i.valor_liquido || 0), 0))
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [usuario])

  const porMes = {}
  receitas.forEach(r => {
    const chave = (r.recebimento || r.vencimento).slice(0, 7)
    if (!porMes[chave]) porMes[chave] = []
    porMes[chave].push(r)
  })
  const meses = Object.keys(porMes).sort((a, b) => b.localeCompare(a))

  return (
    <SistemaLayout titulo="Minhas Faturas">
      <div style={{ padding: '24px 24px 48px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Minhas Faturas</h1>
            <p style={{ fontSize: 12, color: '#a78bca', margin: '4px 0 0' }}>Histórico de pagamentos recebidos</p>
          </div>
          {totalGeral > 0 && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '10px 20px', textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#a78bca', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total recebido</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{fmt(totalGeral)}</div>
            </div>
          )}
        </div>

        {carregando ? <Spinner /> : meses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#a78bca', fontSize: 14 }}>Nenhuma fatura encontrada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {meses.map(chave => {
              const itens = porMes[chave]
              const totalMes = itens.reduce((acc, i) => acc + Number(i.valor_liquido || 0), 0)
              return (
                <div key={chave} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{nomeMes(chave)}</span>
                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: 14 }}>{fmt(totalMes)}</span>
                  </div>
                  {itens.map(item => (
                    <div key={item.id} style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500 }}>{item.descricao}</div>
                        <div style={{ color: '#a78bca', fontSize: 11, marginTop: 2 }}>
                          {TIPO_LABEL[item.tipo] || item.tipo}
                          {item.recebimento && ` · Recebido em ${fmtData(item.recebimento)}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ color: '#10b981', fontWeight: 700, fontSize: 14 }}>{fmt(item.valor_liquido)}</div>
                        {item.desconto > 0 && <div style={{ color: '#6b6b8a', fontSize: 11 }}>desconto {fmt(item.desconto)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </SistemaLayout>
  )
}
