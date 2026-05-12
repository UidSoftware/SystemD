import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { osApi } from '../../../services/osApi'

const STATUS_CONFIG = {
  LEAD:         { label: 'Lead',               cor: '#6b7280' },
  REUNIAO:      { label: 'Reunião agendada',    cor: '#f59e0b' },
  LEVANTAMENTO: { label: 'Levantamento',        cor: '#f97316' },
  PROPOSTA:     { label: 'Proposta enviada',    cor: '#38bdf8' },
  CONTRATO:     { label: 'Contrato assinado',   cor: '#063BF8' },
  DEV:          { label: 'Em desenvolvimento',  cor: '#3d0361' },
  ENTREGA:      { label: 'Entregue',            cor: '#10b981' },
  MANUTENCAO:   { label: 'Manutenção ativa',    cor: '#059669' },
  CANCELADA:    { label: 'Cancelada',           cor: '#FF0000' },
}

const filtros = [
  { value: '', label: 'Todos' },
  { value: 'DEV', label: 'Em andamento' },
  { value: 'ENTREGA', label: 'Entregue' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
]

export default function MeusProjetosPage() {
  const [projetos, setProjetos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [projetoAberto, setProjetoAberto] = useState(null)

  useEffect(() => {
    osApi.listar()
      .then(r => setProjetos(r.data.results ?? r.data))
      .catch(() => setProjetos([]))
      .finally(() => setCarregando(false))
  }, [])

  const projetosFiltrados = filtro ? projetos.filter(p => p.status === filtro) : projetos

  return (
    <SistemaLayout titulo="Meus Projetos">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex gap-2 mb-6 flex-wrap">
          {filtros.map(f => (
            <button key={f.value} onClick={() => setFiltro(f.value)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: filtro === f.value ? '#063BF8' : 'rgba(255,255,255,0.05)',
                color: filtro === f.value ? '#fff' : '#a78bca',
                border: '1px solid',
                borderColor: filtro === f.value ? '#063BF8' : 'rgba(255,255,255,0.1)',
              }}>
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
          <div className="space-y-3">
            {projetosFiltrados.map(p => {
              const cfg = STATUS_CONFIG[p.status] || { label: p.status, cor: '#a78bca' }
              const aberto = projetoAberto?.id === p.id
              return (
                <div key={p.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', backgroundColor: '#1a0a2e' }}>
                  <button onClick={() => setProjetoAberto(aberto ? null : p)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                    <div>
                      <p className="font-medium text-sm mb-1" style={{ color: '#f1f5f9' }}>{p.titulo}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: cfg.cor + '22', color: cfg.cor }}>{cfg.label}</span>
                        {p.data_entrega && (
                          <span className="text-xs" style={{ color: '#a78bca' }}>
                            Entrega: {new Date(p.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        <span className="text-xs" style={{ color: '#6b6b8a' }}>
                          Atualizado: {new Date(p.atualizado_em).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <span style={{ color: '#a78bca' }}>{aberto ? '▲' : '▼'}</span>
                  </button>

                  {aberto && (
                    <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                      <p className="text-xs font-semibold mt-4 mb-3" style={{ color: '#6b8fff' }}>Linha do tempo</p>
                      {!p.fases || p.fases.length === 0 ? (
                        <p className="text-sm" style={{ color: '#a78bca' }}>Sem histórico de fases.</p>
                      ) : (
                        <div className="relative pl-5">
                          <div className="absolute left-1.5 top-0 bottom-0 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                          <div className="space-y-4">
                            {p.fases.map((fase, i) => {
                              const fcfg = STATUS_CONFIG[fase.fase] || { label: fase.fase, cor: '#a78bca' }
                              return (
                                <div key={fase.id} className="relative">
                                  <div className="absolute -left-3.5 w-2 h-2 rounded-full mt-1"
                                    style={{ backgroundColor: i === p.fases.length - 1 ? fcfg.cor : 'rgba(255,255,255,0.2)' }} />
                                  <p className="text-xs font-semibold" style={{ color: fcfg.cor }}>{fcfg.label}</p>
                                  {fase.descricao && <p className="text-xs mt-0.5" style={{ color: '#a78bca' }}>{fase.descricao}</p>}
                                  <p className="text-xs mt-0.5" style={{ color: '#6b6b8a' }}>{new Date(fase.criado_em).toLocaleDateString('pt-BR')}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </SistemaLayout>
  )
}
