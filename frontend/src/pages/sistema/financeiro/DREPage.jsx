import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

export default function DREPage() {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7))
  const [erro, setErro] = useState('')

  const buscar = () => {
    if (!mes) return
    setCarregando(true); setErro('')
    const [ano, m] = mes.split('-')
    financeiroApi.dre({ ano, mes: m })
      .then(r => setDados(r.data))
      .catch(() => setErro('Erro ao carregar DRE.'))
      .finally(() => setCarregando(false))
  }

  useEffect(() => { buscar() }, [])

  const Linha = ({ label, valor, destaque, negativo }) => (
    <div className={`flex justify-between px-4 py-2.5 ${destaque ? 'rounded-lg' : ''}`}
      style={{ backgroundColor: destaque ? 'rgba(6,59,248,0.1)' : 'transparent', borderTop: destaque ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-sm" style={{ color: destaque ? '#f1f5f9' : '#a78bca', fontWeight: destaque ? 700 : 400 }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: negativo ? '#FF0000' : destaque ? '#063BF8' : '#f1f5f9' }}>
        {formatMoeda(valor)}
      </span>
    </div>
  )

  return (
    <SistemaLayout titulo="DRE — Demonstrativo de Resultados">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex gap-3 mb-6 items-end">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Mês/Ano</label>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <button onClick={buscar} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#063BF8', color: '#fff' }}>
            Gerar
          </button>
          {dados && (
            <a href={`/api/financeiro/relatorios/dre/pdf/?ano=${mes.split('-')[0]}&mes=${mes.split('-')[1]}`}
              target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>
              PDF ↗
            </a>
          )}
        </div>

        {carregando ? <Spinner /> : erro ? <p className="text-sm" style={{ color: '#FF0000' }}>{erro}</p> : dados && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', backgroundColor: '#1a0a2e' }}>
            <div className="px-4 py-3" style={{ backgroundColor: '#0a0014' }}>
              <p className="font-bold" style={{ color: '#f1f5f9' }}>DRE — {dados.periodo || mes}</p>
            </div>

            <div className="px-4 py-2 mt-2">
              <p className="text-xs font-bold mb-1" style={{ color: '#10b981' }}>RECEITAS</p>
            </div>
            {dados.receitas?.map((r, i) => <Linha key={i} label={r.plano || r.tipo || r.descricao} valor={r.total} />)}
            <Linha label="Total Receitas" valor={dados.total_receitas} destaque />

            <div className="px-4 py-2 mt-2">
              <p className="text-xs font-bold mb-1" style={{ color: '#FF0000' }}>DESPESAS</p>
            </div>
            {dados.despesas?.map((d, i) => <Linha key={i} label={d.plano || d.tipo || d.descricao} valor={d.total} negativo />)}
            <Linha label="Total Despesas" valor={dados.total_despesas} destaque negativo />

            <div className="mt-2 px-4 py-3" style={{ backgroundColor: 'rgba(6,59,248,0.15)' }}>
              <div className="flex justify-between">
                <span className="font-bold" style={{ color: '#f1f5f9' }}>Resultado Líquido</span>
                <span className="text-lg font-bold" style={{ color: Number(dados.resultado) >= 0 ? '#10b981' : '#FF0000' }}>
                  {formatMoeda(dados.resultado)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </SistemaLayout>
  )
}
