import { useState, useEffect } from 'react'
import { inputStyle, Spinner, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

// Demonstracao no formato classico (Receita Bruta -> ... -> EBITDA ->
// D&A -> EBIT -> ... -> Lucro Liquido), por ano. Pedido do usuario
// 07/08/2026, com referencia visual de um modelo padrao de planilha
// financeira.
//
// IMPORTANTE — honestidade dos dados: a Uid nao rastreia hoje CMV/CSP,
// separacao Vendas&Marketing vs G&A, Depreciacao/Amortizacao nem
// separacao IRPJ/CSLL de outros impostos como linhas proprias. Em vez
// de fabricar numero, essas linhas aparecem com "Não modelado" e R$ 0,00
// explicito. As linhas que SAO reais (Receita Bruta, Descontos, Receita
// Liquida, Despesas Operacionais, EBITDA, Pro-labore, Impostos, Lucro
// Liquido) usam os mesmos dados ja validados do endpoint /dre/ — a soma
// bate exatamente com o EBITDA e o Resultado Liquido que a aba DRE ja
// mostra, nao e um numero paralelo divergente.
//
// Pro-labore aparece como linha propria ABAIXO do EBITDA (nao dentro de
// "Despesas Operacionais" acima dele) porque a Uid trata isso como
// normalizacao/add-back de propósito (mesma logica ja usada em toda
// esteira: EBITDA = Resultado + Impostos + Pro-labore) — pratica comum
// em avaliacao de pequena empresa pra mostrar o EBITDA "normalizado",
// sem o custo de oportunidade do dono trabalhando na propria empresa.

const NAO_MODELADO_NOTA = 'Não modelado hoje — nenhuma linha própria no sistema pra isso ainda.'

function Linha({ label, valor, pct, bold, highlight, nota, cor }) {
  const naoModelado = valor === null
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 4px', borderTop: '1px solid rgba(255,255,255,0.05)',
      background: highlight ? 'rgba(16,185,129,0.06)' : 'transparent',
    }}>
      <div style={{ minWidth: 0 }}>
        <span style={{
          fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400,
          color: naoModelado ? '#6b6b8a' : (bold ? '#f1f5f9' : '#e2d9f3'),
          fontStyle: naoModelado ? 'italic' : 'normal',
        }}>
          {label}
        </span>
        {nota && (
          <p style={{ fontSize: 11, color: '#6b6b8a', margin: '2px 0 0' }}>{nota}</p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
        {pct !== undefined && pct !== null && (
          <span style={{ fontSize: 11, color: '#a78bca', fontStyle: 'italic', minWidth: 46, textAlign: 'right' }}>
            {pct.toFixed(1)}%
          </span>
        )}
        <span style={{
          fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 500, fontFamily: 'monospace',
          color: naoModelado ? '#6b6b8a' : (cor || (bold ? '#f1f5f9' : '#e2d9f3')),
          minWidth: 110, textAlign: 'right',
        }}>
          {naoModelado ? 'R$ 0,00' : formatMoeda(valor)}
        </span>
      </div>
    </div>
  )
}

export default function EbitdaPage() {
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

  if (carregando) return <div style={{ padding: '24px 24px 0' }}><Spinner /></div>
  if (!dados) return null

  const t = dados.totais_ano || {}
  const receitaLiquida = Number(t.receita_liquida || 0)
  const receitaBruta = Number(t.receita_bruta || 0)
  const descontos = Number(t.descontos || 0)
  const despesasOperacionais = Number(t.despesas_fixas || 0) + Number(t.despesas_variaveis || 0) + Number(t.outros || 0)
  const ebitda = Number(t.ebitda || 0)
  const ebit = ebitda // D&A não modelado, EBIT = EBITDA
  const prolabore = Number(t.prolabore || 0)
  const impostos = Number(t.impostos || 0)
  const lucroLiquido = Number(t.resultado || 0)
  const margemEbitda = Number(t.margem_ebitda || 0)
  const pctDe = (v) => receitaLiquida ? (v / receitaLiquida * 100) : 0

  return (
    <>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>EBITDA — Demonstração por Ano</h1>
            <p style={{ fontSize: 12, color: '#6b6b8a', margin: '4px 0 0' }}>
              Estrutura clássica de demonstração (Receita Bruta → ... → EBITDA → D&amp;A → EBIT → ... → Lucro Líquido)
            </p>
          </div>
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

        {/* KPI de destaque */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '20px 0' }}>
          <div style={{ background: '#1a0a2e', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bca', margin: 0, textTransform: 'uppercase' }}>EBITDA ({ano})</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: ebitda >= 0 ? '#10b981' : '#FF0000', margin: '6px 0 2px' }}>{formatMoeda(ebitda)}</p>
            <p style={{ fontSize: 12, color: '#a78bca', margin: 0 }}>Margem: {margemEbitda.toFixed(1)}%</p>
          </div>
          <div style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bca', margin: 0, textTransform: 'uppercase' }}>EBIT ({ano})</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: ebit >= 0 ? '#10b981' : '#FF0000', margin: '6px 0 2px' }}>{formatMoeda(ebit)}</p>
            <p style={{ fontSize: 12, color: '#a78bca', margin: 0 }}>= EBITDA (D&amp;A não modelado)</p>
          </div>
          <div style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bca', margin: 0, textTransform: 'uppercase' }}>Lucro Líquido ({ano})</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: lucroLiquido >= 0 ? '#10b981' : '#FF0000', margin: '6px 0 2px' }}>{formatMoeda(lucroLiquido)}</p>
            <p style={{ fontSize: 12, color: '#a78bca', margin: 0 }}>{pctDe(lucroLiquido).toFixed(1)}% da receita líquida</p>
          </div>
        </div>

        {/* Demonstracao linha a linha */}
        <div style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '4px 18px 14px', marginBottom: 24 }}>
          <Linha label="(+) Receita Bruta" valor={receitaBruta} pct={pctDe(receitaBruta)} />
          <Linha label="(−) Descontos" valor={-descontos} pct={-pctDe(descontos)} />
          <Linha label="(=) Receita Líquida" valor={receitaLiquida} pct={100} bold />
          <Linha label="(−) CMV / CSP" valor={null} nota={NAO_MODELADO_NOTA} />
          <Linha label="(=) Lucro Bruto" valor={receitaLiquida} pct={100} bold />
          <Linha
            label="(−) Despesas Operacionais"
            valor={-despesasOperacionais}
            pct={-pctDe(despesasOperacionais)}
            nota="Fixas + Variáveis + Outros — sem separação Vendas/Marketing vs G&A hoje"
          />
          <Linha label="(+) Outras Receitas Operacionais" valor={null} nota={NAO_MODELADO_NOTA} />
          <Linha label="(=) EBITDA" valor={ebitda} pct={margemEbitda} bold highlight cor={ebitda >= 0 ? '#10b981' : '#FF0000'} />
          <Linha label="(−) Depreciação" valor={null} nota={NAO_MODELADO_NOTA} />
          <Linha label="(−) Amortização" valor={null} nota={NAO_MODELADO_NOTA} />
          <Linha label="(=) EBIT (Lucro Operacional)" valor={ebit} pct={pctDe(ebit)} bold />
          <Linha
            label="(−) Pró-labore"
            valor={-prolabore}
            pct={-pctDe(prolabore)}
            nota="Normalizado fora do EBITDA de propósito (padrão da Uid — ver Módulo Financeiro do CLAUDE.md)"
          />
          <Linha label="(−) Impostos" valor={-impostos} pct={-pctDe(impostos)} nota="Regime tributário real (DAS/Simples) — sem separação IRPJ/CSLL hoje" />
          <Linha label="(=) Lucro Líquido" valor={lucroLiquido} pct={pctDe(lucroLiquido)} bold highlight cor={lucroLiquido >= 0 ? '#10b981' : '#FF0000'} />
        </div>
      </div>
    </>
  )
}
