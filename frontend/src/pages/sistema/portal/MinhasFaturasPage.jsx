import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { osApi } from '../../../services/osApi'

const labelStyle = { fontSize: 11, color: '#6b6b8a' }
const valueStyle = { fontSize: 13, color: '#e2d9f3' }

export default function MinhasFaturasPage() {
  const [ordens, setOrdens] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    osApi.listar()
      .then(r => setOrdens((r.data.results ?? r.data).filter(o => o.tem_contrato)))
      .catch(() => setOrdens([]))
      .finally(() => setCarregando(false))
  }, [])

  const formatMoeda = (v) => v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

  return (
    <SistemaLayout titulo="Minhas Faturas">
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-sm mb-6" style={{ color: '#a78bca' }}>
          Valores contratuais dos seus projetos. O módulo financeiro completo estará disponível em breve.
        </p>

        {carregando ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ordens.length === 0 ? (
          <div className="text-center py-20" style={{ color: '#a78bca' }}>
            Nenhum contrato encontrado.
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {ordens.map(os => (
                <div key={os.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', flex: 1, marginRight: 8 }}>{os.titulo}</div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: '#10b98122', color: '#10b981' }}>
                      Ativo
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                    <div>
                      <div style={labelStyle}>Valor total</div>
                      <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600 }}>{formatMoeda(os.valor_total)}</div>
                    </div>
                    <div>
                      <div style={labelStyle}>Entrada</div>
                      <div style={valueStyle}>{formatMoeda(os.valor_entrada)}</div>
                    </div>
                    <div>
                      <div style={labelStyle}>Mensalidade</div>
                      <div style={valueStyle}>{formatMoeda(os.valor_mensal)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#1a0a2e' }}>
                    {['Projeto', 'Valor total', 'Entrada', 'Mensalidade', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: '#a78bca' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordens.map((os, i) => (
                    <tr key={os.id}
                      style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#f1f5f9' }}>{os.titulo}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: '#f1f5f9' }}>{formatMoeda(os.valor_total)}</td>
                      <td className="px-4 py-3" style={{ color: '#a78bca' }}>{formatMoeda(os.valor_entrada)}</td>
                      <td className="px-4 py-3" style={{ color: '#a78bca' }}>{formatMoeda(os.valor_mensal)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: '#10b98122', color: '#10b981' }}>
                          Ativo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </SistemaLayout>
  )
}
