import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

export default function FluxoCaixaPage() {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [meses, setMeses] = useState(3)
  const [erro, setErro] = useState('')

  const buscar = () => {
    setCarregando(true); setErro('')
    financeiroApi.fluxoCaixa({ meses })
      .then(r => setDados(r.data))
      .catch(() => setErro('Erro ao carregar fluxo de caixa.'))
      .finally(() => setCarregando(false))
  }

  useEffect(() => { buscar() }, [])

  return (
    <SistemaLayout titulo="Fluxo de Caixa Projetado">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex gap-3 mb-6 items-end">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Meses à frente</label>
            <select value={meses} onChange={e => setMeses(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              {[1,2,3,6,12].map(m => <option key={m} value={m}>{m} {m === 1 ? 'mês' : 'meses'}</option>)}
            </select>
          </div>
          <button onClick={buscar} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#063BF8', color: '#fff' }}>Gerar</button>
        </div>

        {carregando ? <Spinner /> : erro ? <p className="text-sm" style={{ color: '#FF0000' }}>{erro}</p> : dados && (
          <div className="space-y-4">
            {dados.meses?.map((m, i) => (
              <div key={i} className="rounded-xl p-4" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex justify-between items-center mb-3">
                  <p className="font-semibold" style={{ color: '#f1f5f9' }}>{m.periodo}</p>
                  <span className="text-sm font-bold" style={{ color: Number(m.saldo_projetado) >= 0 ? '#10b981' : '#FF0000' }}>
                    Saldo: {formatMoeda(m.saldo_projetado)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(16,185,129,0.08)' }}>
                    <p className="text-xs" style={{ color: '#a78bca' }}>Entradas previstas</p>
                    <p className="font-bold" style={{ color: '#10b981' }}>{formatMoeda(m.entradas)}</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,0,0,0.08)' }}>
                    <p className="text-xs" style={{ color: '#a78bca' }}>Saídas previstas</p>
                    <p className="font-bold" style={{ color: '#FF0000' }}>{formatMoeda(m.saidas)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SistemaLayout>
  )
}
