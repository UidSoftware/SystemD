import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { portalApi } from '../../../services/portalApi'

const statusConfig = {
  'em_andamento': { label: 'Em andamento', cor: '#063BF8' },
  'concluido':    { label: 'Concluído',    cor: '#10b981' },
  'aguardando':   { label: 'Aguardando',   cor: '#f59e0b' },
}

const filtros = [
  { value: '', label: 'Todos' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'aguardando', label: 'Aguardando' },
]

export default function MeusProjetosPage() {
  const [projetos, setProjetos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [projetoAberto, setProjetoAberto] = useState(null)

  useEffect(() => {
    portalApi.listarProjetos()
      .then(r => setProjetos(r.data.results ?? r.data))
      .catch(() => setProjetos([]))
      .finally(() => setCarregando(false))
  }, [])

  const projetosFiltrados = filtro
    ? projetos.filter(p => p.status === filtro)
    : projetos

  return (
    <SistemaLayout titulo="Meus Projetos">
      <div className="p-6 max-w-5xl mx-auto">
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
        ) : projetosFiltrados.length === 0 ? (
          <div className="text-center py-20" style={{ color: '#a78bca' }}>
            {filtro ? 'Nenhum projeto com este status.' : 'Nenhum projeto encontrado.'}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#1a0a2e' }}>
                  {['Nome do projeto', 'Status', 'Fase atual', 'Última atualização'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: '#a78bca' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projetosFiltrados.map((p, i) => {
                  const cfg = statusConfig[p.status] || { label: p.status, cor: '#a78bca' }
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setProjetoAberto(projetoAberto?.id === p.id ? null : p)}
                      className="cursor-pointer transition-colors"
                      style={{
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(6,59,248,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: '#f1f5f9' }}>{p.nome}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: cfg.cor + '22', color: cfg.cor }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#a78bca' }}>{p.fase_atual || '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#a78bca' }}>
                        {p.atualizado_em ? new Date(p.atualizado_em).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* detalhe da OS selecionada */}
        {projetoAberto && (
          <div className="mt-6 rounded-xl p-5" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="font-semibold text-base mb-3" style={{ color: '#f1f5f9' }}>{projetoAberto.nome}</h2>
            {projetoAberto.fases?.length > 0 ? (
              <ol className="space-y-2">
                {projetoAberto.fases.map((fase, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: fase.concluida ? '#10b981' : '#063BF8', color: '#fff' }}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#f1f5f9' }}>{fase.nome}</p>
                      {fase.descricao && <p className="text-xs mt-0.5" style={{ color: '#a78bca' }}>{fase.descricao}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm" style={{ color: '#a78bca' }}>Nenhuma fase registrada.</p>
            )}
          </div>
        )}
      </div>
    </SistemaLayout>
  )
}
