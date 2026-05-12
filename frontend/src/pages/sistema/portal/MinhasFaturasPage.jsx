import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { portalApi } from '../../../services/portalApi'

const statusConfig = {
  'pago':     { label: 'Pago',     cor: '#10b981' },
  'pendente': { label: 'Pendente', cor: '#063BF8' },
  'atrasado': { label: 'Atrasado', cor: '#FF0000' },
}

const filtros = [
  { value: '', label: 'Todas' },
  { value: 'pago', label: 'Pagas' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'atrasado', label: 'Atrasadas' },
]

export default function MinhasFaturasPage() {
  const [faturas, setFaturas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    portalApi.listarFaturas()
      .then(r => setFaturas(r.data.results ?? r.data))
      .catch(() => setFaturas([]))
      .finally(() => setCarregando(false))
  }, [])

  const faturasFiltradas = filtro ? faturas.filter(f => f.status === filtro) : faturas

  const formatarMoeda = (valor) =>
    Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <SistemaLayout titulo="Minhas Faturas">
      <div className="p-6 max-w-4xl mx-auto">
        {/* filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {filtros.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: filtro === f.value ? '#063BF8' : 'rgba(255,255,255,0.05)',
                color: filtro === f.value ? '#fff' : '#a78bca',
                border: '1px solid',
                borderColor: filtro === f.value ? '#063BF8' : 'rgba(255,255,255,0.1)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {carregando ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : faturasFiltradas.length === 0 ? (
          <div className="text-center py-20" style={{ color: '#a78bca' }}>
            {filtro ? 'Nenhuma fatura com este status.' : 'Nenhuma fatura encontrada.'}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#1a0a2e' }}>
                  {['Descrição', 'Valor', 'Vencimento', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: '#a78bca' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {faturasFiltradas.map((fatura, i) => {
                  const cfg = statusConfig[fatura.status] || { label: fatura.status, cor: '#a78bca' }
                  return (
                    <tr
                      key={fatura.id}
                      style={{
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: '#f1f5f9' }}>{fatura.descricao}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: '#f1f5f9' }}>
                        {formatarMoeda(fatura.valor)}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#a78bca' }}>
                        {fatura.vencimento ? new Date(fatura.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: cfg.cor + '22', color: cfg.cor }}
                        >
                          {cfg.label}
                        </span>
                      </td>
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
