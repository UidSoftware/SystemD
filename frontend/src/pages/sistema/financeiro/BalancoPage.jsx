import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
  padding: '18px 20px',
}

function Linha({ label, valor, bold, indent, cor }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', paddingLeft: indent ? 16 : 0,
      borderTop: bold ? '1px solid rgba(255,255,255,0.08)' : 'none',
      marginTop: bold ? 6 : 0,
    }}>
      <span style={{ fontSize: 13, color: bold ? '#f1f5f9' : '#a78bca', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? 15 : 13, color: cor || (bold ? '#f1f5f9' : '#e2d9f3'), fontWeight: bold ? 700 : 500 }}>
        {formatMoeda(valor)}
      </span>
    </div>
  )
}

export default function BalancoPage() {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))

  const buscar = () => {
    setCarregando(true)
    financeiroApi.balanco({ data })
      .then(r => setDados(r.data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }

  useEffect(() => { buscar() }, [])

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Balanço Patrimonial</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
            <button onClick={buscar}
              style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Gerar
            </button>
          </div>
        </div>

        {carregando ? <Spinner /> : dados && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
              <div style={cardStyle}>
                <p style={{ fontSize: 11, color: '#a78bca', marginBottom: 6 }}>Ativo Total</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{formatMoeda(dados.total_ativo)}</p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: 11, color: '#a78bca', marginBottom: 6 }}>Passivo + PL</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#6b8fff' }}>{formatMoeda(dados.total_passivo_pl)}</p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: 11, color: '#a78bca', marginBottom: 6 }}>Equação Contábil</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: dados.equacao_ok ? '#10b981' : '#FF0000' }}>
                  {dados.equacao_ok ? '✅ Ativo = Passivo + PL' : '⚠️ Não fechou'}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              <div style={cardStyle}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#10b981', marginBottom: 10 }}>Ativo</div>
                <div style={{ fontSize: 12, color: '#6b6b8a', marginBottom: 4 }}>Circulante</div>
                <Linha label="Caixa e Equivalentes" valor={dados.ativo.circulante.caixa_equivalentes} indent />
                <Linha label="Contas a Receber" valor={dados.ativo.circulante.contas_a_receber} indent />
                <Linha label="Total Circulante" valor={dados.ativo.circulante.total} bold />
                <Linha label="ATIVO TOTAL" valor={dados.ativo.total} bold cor="#10b981" />
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#FF0000', marginBottom: 10 }}>Passivo</div>
                <div style={{ fontSize: 12, color: '#6b6b8a', marginBottom: 4 }}>Circulante</div>
                <Linha label="Contas a Pagar" valor={dados.passivo.circulante.contas_a_pagar} indent />
                <Linha label="Total Circulante" valor={dados.passivo.circulante.total} bold />
                <div style={{ fontSize: 12, color: '#6b6b8a', marginTop: 10, marginBottom: 4 }}>Exigível a Longo Prazo</div>
                <Linha label="Empréstimos" valor={dados.passivo.exigivel_lp.emprestimos} indent />
                <Linha label="Total Exigível LP" valor={dados.passivo.exigivel_lp.total} bold />
                <Linha label="PASSIVO TOTAL" valor={dados.passivo.total} bold cor="#FF0000" />
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b8fff', marginBottom: 10 }}>Patrimônio Líquido</div>
                <Linha label="Capital / Aportes" valor={dados.patrimonio_liquido.capital_aportes} indent />
                <Linha label="Lucros Acumulados" valor={dados.patrimonio_liquido.lucros_acumulados} indent />
                <Linha label="PL TOTAL" valor={dados.patrimonio_liquido.total} bold cor="#6b8fff" />
              </div>
            </div>
          </>
        )}
      </div>
    </SistemaLayout>
  )
}
