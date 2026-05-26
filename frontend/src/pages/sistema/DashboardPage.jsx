import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import { useAuth } from '../../contexts/AuthContext'
import { financeiroApi } from '../../services/financeiroApi'
import api from '../../services/api'

// Formatador monetario
const fmt = (v) => {
  const n = Number(v) || 0
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Ícone SVG inline
const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
)

const STATUS_CONFIG = {
  LEAD:         { label: 'Lead',               cor: '#7c6d9a' },
  REUNIAO:      { label: 'Reuniao',            cor: '#f59e0b' },
  LEVANTAMENTO: { label: 'Levantamento',       cor: '#f97316' },
  PROPOSTA:     { label: 'Proposta',           cor: '#38bdf8' },
  CONTRATO:     { label: 'Contrato',           cor: '#063BF8' },
  DEV:          { label: 'Dev',                cor: '#a855f7' },
  ENTREGA:      { label: 'Entregue',           cor: '#10b981' },
  MANUTENCAO:   { label: 'Manutencao',         cor: '#059669' },
  CANCELADA:    { label: 'Cancelada',          cor: '#f87171' },
}

// Card de KPI
function KpiCard({ label, valor, sub, cor, icon, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backgroundColor: hover ? 'var(--color-bg-elevated)' : 'var(--color-bg-surface)',
        border: `1px solid ${hover ? 'rgba(255,255,255,0.14)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
        boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.3)' : 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </p>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          backgroundColor: cor + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon d={icon} size={16} color={cor} />
        </div>
      </div>
      <div>
        <p style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f1f5f9', margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.2 }}>
          {valor}
        </p>
        {sub && (
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>{sub}</p>
        )}
      </div>
    </div>
  )
}

// Badge de status OS
function Badge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cor: '#7c6d9a' }
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      backgroundColor: cfg.cor + '20',
      color: cfg.cor,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

export default function DashboardPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const perfil = usuario?.perfil || ''

  const [fluxo, setFluxo] = useState(null)
  const [ordens, setOrdens] = useState([])
  const [leads, setLeads] = useState({ count: 0, naoLidos: 0 })
  const [clientes, setClientes] = useState(0)
  const [carregando, setCarregando] = useState(true)

  const mes = new Date().toISOString().slice(0, 7)
  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }
  const nome = usuario?.nome?.split(' ')[0] || 'Equipe'

  useEffect(() => {
    const p = []

    if (perfil === 'ADMIN' || perfil === 'FINANCEIRO') {
      p.push(
        financeiroApi.fluxoCaixa({ mes })
          .then(r => setFluxo(r.data))
          .catch(() => {})
      )
    }

    if (perfil === 'ADMIN' || perfil === 'OPERACIONAL') {
      p.push(
        api.get('/leads/', { params: { page: 1 } })
          .then(r => setLeads({ count: r.data.count, naoLidos: 0 }))
          .catch(() => {})
      )
      p.push(
        api.get('/clientes/', { params: { page: 1 } })
          .then(r => setClientes(r.data.count || 0))
          .catch(() => {})
      )
      p.push(
        api.get('/os/', { params: { page: 1 } })
          .then(r => setOrdens(r.data.results?.slice(0, 5) || []))
          .catch(() => {})
      )
    }

    Promise.all(p).finally(() => setCarregando(false))
  }, [perfil])

  const saldo = fluxo ? Number(fluxo.saldo_final) : null
  const saldoCor = saldo === null ? '#a78bca' : saldo >= 0 ? '#10b981' : '#f87171'

  return (
    <SistemaLayout titulo="Dashboard">
      <div style={{ padding: '24px 24px 32px', maxWidth: 960, margin: '0 auto' }}>

        {/* Cabecalho */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#f1f5f9',
            margin: '0 0 4px',
          }}>
            {saudacao()}, {nome}.
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {carregando ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-muted)', fontSize: 13, padding: '40px 0' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ animation: 'spin 0.8s linear infinite' }}>
              <path d="M21 12a9 9 0 11-9-9" />
            </svg>
            Carregando dados...
          </div>
        ) : (
          <>
            {/* KPIs — Admin/Operacional */}
            {(perfil === 'ADMIN' || perfil === 'OPERACIONAL') && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                  <KpiCard
                    label="Leads recebidos"
                    valor={leads.count}
                    sub="total no sistema"
                    cor="#38bdf8"
                    icon="M4 4h16M4 8h16M4 12h10"
                    onClick={() => navigate('/sistema/leads')}
                  />
                  <KpiCard
                    label="Clientes ativos"
                    valor={clientes}
                    sub="cadastrados"
                    cor="#10b981"
                    icon={['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75']}
                    onClick={() => navigate('/sistema/clientes')}
                  />
                  <KpiCard
                    label="Ordens de Servico"
                    valor={ordens.length > 0 ? `${ordens.length}+` : '0'}
                    sub="recentes"
                    cor="#a855f7"
                    icon={['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2', 'M9 5a2 2 0 002 2h2a2 2 0 002-2', 'M9 5a2 2 0 012-2h2a2 2 0 012 2', 'M9 12h6', 'M9 16h4']}
                    onClick={() => navigate('/sistema/os')}
                  />
                  {fluxo && (
                    <KpiCard
                      label={`Saldo ${mes}`}
                      valor={fmt(fluxo.saldo_final)}
                      sub={`Entradas: ${fmt(fluxo.total_entradas)}`}
                      cor={saldoCor}
                      icon="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                      onClick={() => navigate('/sistema/financeiro/visao-geral')}
                    />
                  )}
                </div>
              </>
            )}

            {/* KPIs — Financeiro */}
            {perfil === 'FINANCEIRO' && fluxo && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                {[
                  { label: 'Saldo Inicial',  valor: fmt(fluxo.saldo_inicial),  cor: '#a78bca', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
                  { label: 'Total Entradas', valor: fmt(fluxo.total_entradas), cor: '#10b981', icon: 'M12 19V5M5 12l7-7 7 7' },
                  { label: 'Total Saidas',   valor: fmt(fluxo.total_saidas),   cor: '#f87171', icon: 'M12 5v14M5 12l7 7 7-7' },
                  { label: 'Saldo Final',    valor: fmt(fluxo.saldo_final),    cor: saldoCor,  icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
                ].map(k => (
                  <KpiCard key={k.label} {...k} sub={`Referencia: ${mes}`} onClick={() => navigate('/sistema/financeiro/visao-geral')} />
                ))}
              </div>
            )}

            {/* Ultimas OS — Admin/Operacional */}
            {(perfil === 'ADMIN' || perfil === 'OPERACIONAL') && ordens.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                    Ultimas Ordens de Servico
                  </h3>
                  <button
                    onClick={() => navigate('/sistema/os')}
                    style={{ fontSize: 12, color: '#063BF8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Ver todas
                  </button>
                </div>

                <div style={{
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-card)',
                }}>
                  {ordens.map((os, i) => (
                    <div
                      key={os.id}
                      onClick={() => navigate(`/sistema/os/${os.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '13px 18px',
                        borderBottom: i < ordens.length - 1 ? '1px solid var(--color-border)' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {os.titulo}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
                          {os.cliente_nome || os.cliente || '—'}
                        </p>
                      </div>
                      <Badge status={os.status} />
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Portal Cliente */}
            {perfil === 'CLIENTE' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Meus Projetos',  path: '/sistema/meus-projetos',  cor: '#063BF8', icon: ['M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'] },
                  { label: 'Entregas',       path: '/sistema/entregas',        cor: '#10b981', icon: ['M5 12h14', 'M12 5l7 7-7 7'] },
                  { label: 'Suporte',        path: '/sistema/suporte',         cor: '#f59e0b', icon: ['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'] },
                  { label: 'Minhas Faturas', path: '/sistema/minhas-faturas',  cor: '#a855f7', icon: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'] },
                ].map(({ label, path, cor, icon }) => (
                  <div
                    key={path}
                    onClick={() => navigate(path)}
                    style={{
                      backgroundColor: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '22px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; e.currentTarget.style.borderColor = cor + '44' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-surface)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={icon} size={18} color={cor} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>{label}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </SistemaLayout>
  )
}
