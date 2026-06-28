import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, Vazio, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function nomeMes(chave) {
  const [ano, mes] = chave.split('-')
  return MESES_PT[parseInt(mes) - 1] + ' ' + ano
}

const anoAtual = new Date().getFullYear()
const ANOS = [anoAtual - 1, anoAtual, anoAtual + 1]

export default function FluxoCaixaPage() {
  const [lancamentos, setLancamentos] = useState([])
  const [contas, setContas]           = useState([])
  const [carregando, setCarregando]   = useState(true)
  const [filtros, setFiltros]         = useState({ conta: '', ano: String(anoAtual) })
  const [expandido, setExpandido]     = useState(null)

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = {}
    if (filtros.conta) params.conta = filtros.conta
    Promise.all([
      financeiroApi.listarLivroCaixa(params),
      financeiroApi.listarContas(),
    ]).then(([r, c]) => {
      setLancamentos(r.data.results ?? r.data)
      setContas(c.data.results ?? c.data)
    }).catch(() => {}).finally(() => setCarregando(false))
  }, [filtros.conta])

  useEffect(() => { carregar() }, [carregar])

  // Filtrar por ano no frontend
  const filtrados = lancamentos.filter(lc => {
    if (filtros.ano && !lc.data.startsWith(filtros.ano)) return false
    return true
  })

  // Agrupar por mês
  const porMes = {}
  filtrados.forEach(lc => {
    const chave = lc.data.slice(0, 7)
    if (!porMes[chave]) porMes[chave] = { entradas: 0, saidas: 0, itens: [] }
    if (lc.tipo === 'ENTRADA') porMes[chave].entradas += parseFloat(lc.valor)
    else porMes[chave].saidas += parseFloat(lc.valor)
    porMes[chave].itens.push(lc)
  })

  const meses = Object.keys(porMes).sort()

  // Calcular saldo acumulado por mês
  // Pega saldo final do mês anterior ao filtro como ponto de partida
  const saldoBase = (() => {
    if (!filtros.ano) return 0
    const anoNum = parseInt(filtros.ano)
    const anteriores = lancamentos.filter(lc => parseInt(lc.data.slice(0, 4)) < anoNum)
    if (!anteriores.length) return 0
    // Soma entradas - saidas anteriores ao ano
    return anteriores.reduce((acc, lc) => {
      return lc.tipo === 'ENTRADA' ? acc + parseFloat(lc.valor) : acc - parseFloat(lc.valor)
    }, 0)
  })()

  let saldoCorrido = saldoBase
  const linhas = meses.map(chave => {
    const { entradas, saidas, itens } = porMes[chave]
    const resultado = entradas - saidas
    saldoCorrido += resultado
    return { chave, entradas, saidas, resultado, saldo: saldoCorrido, itens }
  })

  const totais = linhas.reduce((acc, l) => ({
    entradas: acc.entradas + l.entradas,
    saidas:   acc.saidas   + l.saidas,
    resultado: acc.resultado + l.resultado,
  }), { entradas: 0, saidas: 0, resultado: 0 })

  const corResultado = (v) => v >= 0 ? '#10b981' : '#f87171'

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Fluxo de Caixa</h1>
          <p style={{ fontSize: 13, color: '#a78bca', margin: 0 }}>Entradas, saídas e saldo acumulado por mês</p>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <select style={{ ...inputStyle, width: 160 }} value={filtros.conta}
            onChange={e => setFiltros(f => ({ ...f, conta: e.target.value }))}>
            <option value="">Todas as contas</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select style={{ ...inputStyle, width: 120 }} value={filtros.ano}
            onChange={e => setFiltros(f => ({ ...f, ano: e.target.value }))}>
            <option value="">Todos os anos</option>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {(filtros.conta || filtros.ano !== String(anoAtual)) && (
            <button onClick={() => setFiltros({ conta: '', ano: String(anoAtual) })}
              style={{ background: 'transparent', border: '1px solid rgba(167,139,202,0.3)', color: '#a78bca', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
              Limpar
            </button>
          )}
        </div>

        {carregando ? <Spinner /> : linhas.length === 0 ? <Vazio /> : (
          <>
            {/* Tabela resumo */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
              {/* Cabeçalho */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', padding: '10px 20px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Mês', 'Entradas', 'Saídas', 'Resultado', 'Saldo'].map(col => (
                  <span key={col} style={{ fontSize: 11, color: '#a78bca', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col}</span>
                ))}
              </div>

              {/* Linhas por mês */}
              {linhas.map(({ chave, entradas, saidas, resultado, saldo, itens }) => (
                <div key={chave}>
                  <div
                    onClick={() => setExpandido(expandido === chave ? null : chave)}
                    style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: '#6b6b8a' }}>{expandido === chave ? '▼' : '▶'}</span>
                      {nomeMes(chave)}
                    </span>
                    <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>{formatMoeda(entradas)}</span>
                    <span style={{ color: '#f87171', fontWeight: 500, fontSize: 13 }}>{formatMoeda(saidas)}</span>
                    <span style={{ color: corResultado(resultado), fontWeight: 600, fontSize: 13 }}>
                      {resultado >= 0 ? '+' : ''}{formatMoeda(resultado)}
                    </span>
                    <span style={{ color: corResultado(saldo), fontWeight: 700, fontSize: 13 }}>{formatMoeda(saldo)}</span>
                  </div>

                  {/* Lançamentos expandidos */}
                  {expandido === chave && (
                    <div style={{ background: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {itens.sort((a, b) => a.data.localeCompare(b.data)).map(lc => (
                        <div key={lc.id} style={{ display: 'grid', gridTemplateColumns: '120px 1.4fr 1fr 1fr', padding: '8px 20px 8px 40px', borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: lc.estornado ? 0.4 : 1 }}>
                          <span style={{ color: '#6b6b8a', fontSize: 12 }}>{lc.data.split('-').reverse().join('/')}</span>
                          <span style={{ color: '#e2d9f3', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lc.descricao}
                            {lc.estornado && <span style={{ marginLeft: 6, fontSize: 10, color: '#a78bca' }}>estornado</span>}
                          </span>
                          <span style={{ fontSize: 11, color: '#6b6b8a' }}>{lc.conta_nome || '—'}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: lc.tipo === 'ENTRADA' ? '#10b981' : '#f87171' }}>
                            {lc.tipo === 'ENTRADA' ? '+' : '-'}{formatMoeda(lc.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Linha de totais */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', padding: '12px 20px', borderTop: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>Total {filtros.ano || ''}</span>
                <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>{formatMoeda(totais.entradas)}</span>
                <span style={{ color: '#f87171', fontWeight: 700, fontSize: 13 }}>{formatMoeda(totais.saidas)}</span>
                <span style={{ color: corResultado(totais.resultado), fontWeight: 700, fontSize: 13 }}>
                  {totais.resultado >= 0 ? '+' : ''}{formatMoeda(totais.resultado)}
                </span>
                <span style={{ color: '#6b6b8a', fontSize: 12, alignSelf: 'center' }}>acum. acima</span>
              </div>
            </div>
          </>
        )}
      </div>
    </SistemaLayout>
  )
}
