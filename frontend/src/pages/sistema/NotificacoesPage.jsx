import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'

function Chip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
      background: active ? 'rgba(6,59,248,0.15)' : 'rgba(255,255,255,0.04)',
      border: active ? '1px solid #063BF8' : '1px solid rgba(255,255,255,0.1)',
      color: active ? '#6b8fff' : '#a78bca', fontWeight: active ? 600 : 400,
      transition: 'all 0.12s',
    }}>{label}</button>
  )
}

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
  overflow: 'hidden',
}

const PRIORIDADE_COR = {
  ALTA: '#f87171',
  MEDIA: '#fbbf24',
  BAIXA: '#a78bca',
}

const TIPO_EMOJI = {
  STACK_FORA_PADRAO: '🏗️',
  IMPEDIMENTO_ESTEIRA: '⚠️',
  LEAD_NAO_QUALIFICADO: '🎯',
}

const formatarData = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [filtro, setFiltro] = useState('pendentes')
  const [resolvendo, setResolvendo] = useState(null)
  const [liberando, setLiberando] = useState(null)

  const carregar = useCallback(async (pag = 1, filtroAtual = 'pendentes') => {
    setCarregando(true)
    try {
      const params = { page: pag }
      if (filtroAtual === 'pendentes') params.resolvida = false
      if (filtroAtual === 'resolvidas') params.resolvida = true
      const res = await api.get('/notificacoes/', { params })
      setNotificacoes(res.data.results)
      setTotal(res.data.count)
      setTotalPaginas(Math.ceil(res.data.count / 20))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar(1, filtro)
    setPagina(1)
  }, [filtro, carregar])

  const resolver = async (id) => {
    setResolvendo(id)
    try {
      await api.post(`/notificacoes/${id}/resolver/`)
      carregar(pagina, filtro)
    } finally {
      setResolvendo(null)
    }
  }

  const liberar = async (id) => {
    setLiberando(id)
    try {
      await api.post(`/notificacoes/${id}/liberar/`)
      carregar(pagina, filtro)
    } finally {
      setLiberando(null)
    }
  }

  return (
    <SistemaLayout titulo="Notificações">
      <div style={{ padding: '24px 28px', maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>🔔 Notificações</h1>
            <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>{total} notificaç{total !== 1 ? 'ões' : 'ão'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Chip label="Pendentes" active={filtro === 'pendentes'} onClick={() => setFiltro('pendentes')} />
            <Chip label="Resolvidas" active={filtro === 'resolvidas'} onClick={() => setFiltro('resolvidas')} />
            <Chip label="Todas" active={filtro === 'todas'} onClick={() => setFiltro('todas')} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {carregando ? (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#a78bca', padding: 32 }}>Carregando...</div>
          ) : notificacoes.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#a78bca', padding: 32 }}>Nenhuma notificação encontrada</div>
          ) : notificacoes.map(n => {
            const podeLiberar = !n.resolvida && /^manutencao:\d+$/.test(n.referencia || '')
            return (
            <div key={n.id} style={{ ...cardStyle, padding: 16, opacity: n.resolvida ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: PRIORIDADE_COR[n.prioridade] || '#a78bca',
                    background: `${PRIORIDADE_COR[n.prioridade] || '#a78bca'}22`,
                    border: `1px solid ${PRIORIDADE_COR[n.prioridade] || '#a78bca'}44`,
                    borderRadius: 6, padding: '2px 8px',
                  }}>
                    {n.prioridade_display}
                  </span>
                  <span style={{ fontSize: 12, color: '#a78bca' }}>
                    {TIPO_EMOJI[n.tipo] || '🔔'} {n.tipo_display}
                  </span>
                </div>
                {n.resolvida && (
                  <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    ✅ Resolvida
                  </span>
                )}
              </div>

              <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>{n.titulo}</div>
              {n.descricao && (
                <div style={{ fontSize: 13, color: '#e2d9f3', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: 12 }}>
                  {n.descricao}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: 11, color: '#6b6b8a' }}>
                  {n.atribuido_a_nome && <span>👤 {n.atribuido_a_nome} · </span>}
                  {formatarData(n.criado_em)}
                  {n.resolvida && n.resolvida_por_nome && (
                    <span> · resolvida por {n.resolvida_por_nome} em {formatarData(n.resolvida_em)}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {n.link && (
                    <Link to={n.link}
                      style={{ background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, textDecoration: 'none' }}>
                      🔗 Abrir
                    </Link>
                  )}
                  {podeLiberar && (
                    <button onClick={() => liberar(n.id)} disabled={liberando === n.id}
                      title="Reseta a manutenção para pendente — o cron dispara a delegação de novo automaticamente no próximo ciclo."
                      style={{ background: 'rgba(6,59,248,0.12)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', opacity: liberando === n.id ? 0.6 : 1 }}>
                      {liberando === n.id ? 'Liberando...' : '🔓 Liberar (automático)'}
                    </button>
                  )}
                  {!n.resolvida && (
                    <button onClick={() => resolver(n.id)} disabled={resolvendo === n.id}
                      title="Marca como resolvida sem reiniciar a delegação — use quando você mesmo já concluiu a tarefa manualmente."
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', opacity: resolvendo === n.id ? 0.6 : 1 }}>
                      {resolvendo === n.id ? 'Resolvendo...' : '✅ Marcar como resolvida (manual)'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            )
          })}

          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 8 }}>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => { setPagina(p); carregar(p, filtro) }}
                  style={{ background: p === pagina ? '#063BF8' : 'rgba(255,255,255,0.06)', color: p === pagina ? '#fff' : '#a78bca', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 13 }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </SistemaLayout>
  )
}
