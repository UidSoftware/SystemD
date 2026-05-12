import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, Vazio, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const TIPO_COR = { entrada: '#10b981', saida: '#FF0000' }

export default function ExtratoPage() {
  const [lancamentos, setLancamentos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [contas, setContas] = useState([])
  const [filtros, setFiltros] = useState({ conta: '', data_ini: '', data_fim: '' })
  const [erro, setErro] = useState('')

  useEffect(() => {
    financeiroApi.listarContas().then(r => setContas(r.data.results ?? r.data)).catch(() => {})
  }, [])

  const buscar = () => {
    setCarregando(true); setErro('')
    const params = {}
    if (filtros.conta) params.conta = filtros.conta
    if (filtros.data_ini) params.data_ini = filtros.data_ini
    if (filtros.data_fim) params.data_fim = filtros.data_fim
    financeiroApi.extrato(params)
      .then(r => setLancamentos(r.data.lancamentos ?? r.data.results ?? r.data ?? []))
      .catch(() => setErro('Erro ao carregar extrato.'))
      .finally(() => setCarregando(false))
  }

  return (
    <SistemaLayout titulo="Extrato por Conta">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex flex-wrap gap-3 mb-6 items-end">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Conta</label>
            <select value={filtros.conta} onChange={e => setFiltros(f => ({ ...f, conta: e.target.value }))} style={{ ...inputStyle, width: 'auto' }}>
              <option value="">Todas</option>
              {contas.map(c => <option key={c.cont_id} value={c.cont_id}>{c.cont_nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>De</label>
            <input type="date" value={filtros.data_ini} onChange={e => setFiltros(f => ({ ...f, data_ini: e.target.value }))} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Até</label>
            <input type="date" value={filtros.data_fim} onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <button onClick={buscar} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#063BF8', color: '#fff' }}>Filtrar</button>
        </div>

        {carregando ? <Spinner /> : erro ? <p className="text-sm" style={{ color: '#FF0000' }}>{erro}</p>
          : lancamentos.length === 0 ? <Vazio msg="Nenhum lançamento. Selecione filtros e clique em Filtrar." />
          : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              {lancamentos.map((l, i) => (
                <div key={l.lica_id ?? i} className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{l.lica_historico}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6b6b8a' }}>{formatData(l.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: TIPO_COR[l.lica_tipo_lancamento] || '#a78bca' }}>
                      {l.lica_tipo_lancamento === 'saida' ? '- ' : '+ '}{formatMoeda(l.lica_valor)}
                    </p>
                    <p className="text-xs" style={{ color: '#6b6b8a' }}>Saldo: {formatMoeda(l.lica_saldo_atual)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </SistemaLayout>
  )
}
