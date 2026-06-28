import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import { useAuth } from '../../contexts/AuthContext'
import { financeiroApi } from '../../services/financeiroApi'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

const Icon = ({ d, size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
)

const STATUS_CFG = {
  LEAD:         { label: 'Lead',       cor: '#7c6d9a' },
  REUNIAO:      { label: 'Reunião',    cor: '#f59e0b' },
  LEVANTAMENTO: { label: 'Levant.',    cor: '#f97316' },
  PROPOSTA:     { label: 'Proposta',   cor: '#38bdf8' },
  CONTRATO:     { label: 'Contrato',   cor: '#063BF8' },
  DEV:          { label: 'Dev',        cor: '#a855f7' },
  ENTREGA:      { label: 'Entrega',    cor: '#10b981' },
  MANUTENCAO:   { label: 'Manutenção', cor: '#059669' },
  CANCELADA:    { label: 'Cancelada',  cor: '#f87171' },
}

const card = {
  background: '#1a0a2e',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
}

function SecTitle({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.78rem', fontWeight: 700, color: '#a78bca', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}
      </h3>
      {action && (
        <button onClick={onAction} style={{ fontSize: 11, color: '#063BF8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
          {action} →
        </button>
      )}
    </div>
  )
}

function KpiCard({ label, valor, sub, cor, icon, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...card,
        background: hov ? 'rgba(255,255,255,0.06)' : '#1a0a2e',
        borderColor: hov ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)',
        padding: '16px 18px', cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s', display: 'flex', flexDirection: 'column', gap: 10,
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#a78bca', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </p>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={icon} size={13} color={cor} />
        </div>
      </div>
      <div>
        <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9', margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.2 }}>
          {valor}
        </p>
        {sub && <p style={{ fontSize: 10, color: '#6b6b8a', margin: '3px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}

function GraficoBarras({ dados }) {
  if (!dados?.length) return null
  const maxVal = Math.max(...dados.flatMap(d => [Number(d.receita), Number(d.despesa)]), 1)
  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, fontSize: 11, color: '#a78bca' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: '#10b981', display: 'inline-block' }} />Receita
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: '#f87171', display: 'inline-block' }} />Despesa
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
        {dados.map(d => {
          const rPct = (Number(d.receita) / maxVal) * 100
          const dPct = (Number(d.despesa) / maxVal) * 100
          const resNum = Number(d.resultado)
          return (
            <div key={d.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: 100 }}>
                <div title={fmt(d.receita)} style={{ flex: 1, background: 'linear-gradient(180deg, #10b981, #059669)', height: `${Math.max(rPct, 2)}%`, borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease' }} />
                <div title={fmt(d.despesa)} style={{ flex: 1, background: 'linear-gradient(180deg, #f87171, #dc2626)', height: `${Math.max(dPct, 2)}%`, borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease' }} />
              </div>
              <span style={{ fontSize: 9, color: resNum >= 0 ? '#10b981' : '#f87171', fontWeight: 600 }}>{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListaVencimentos({ itens, tipo }) {
  if (!itens?.length)
    return <p style={{ fontSize: 12, color: '#6b6b8a', margin: '0 0 4px', padding: '0 0 8px' }}>Nenhum vencimento nos próximos 30 dias</p>
  return itens.slice(0, 5).map(item => (
    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#e2d9f3', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.descricao}
        </p>
        <p style={{ fontSize: 10, color: '#6b6b8a', margin: '2px 0 0' }}>
          {tipo === 'receita' ? (item.cliente_nome || '—') : (item.fornecedor || '—')} · {fmtData(item.vencimento)}
        </p>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: tipo === 'receita' ? '#10b981' : '#f87171', whiteSpace: 'nowrap' }}>
        {fmt(item.valor_liquido)}
      </span>
    </div>
  ))
}

export default function DashboardPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const perfil = usuario?.perfil || ''
  const nome = usuario?.nome?.split(' ')[0] || 'Equipe'

  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)

  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  useEffect(() => {
    if (perfil === 'CLIENTE') { setCarregando(false); return }
    financeiroApi.dashboard()
      .then(r => setDados(r.data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [perfil])

  const isFin = perfil === 'ADMIN' || perfil === 'FINANCEIRO'
  const isOps = perfil === 'ADMIN' || perfil === 'OPERACIONAL'
  const resCor = (v) => Number(v) >= 0 ? '#10b981' : '#f87171'

  return (
    <SistemaLayout titulo="Dashboard">
      <div style={{ padding: '24px 28px 48px', maxWidth: 1280, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
              {saudacao()}, {nome}.
            </h2>
            <p style={{ fontSize: 12, color: '#a78bca', margin: 0 }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {dados && (dados.receitas_atrasadas > 0 || dados.despesas_atrasadas > 0) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {dados.receitas_atrasadas > 0 && (
                <span onClick={() => navigate('/sistema/financeiro/receitas')}
                  style={{ background: '#10b98118', color: '#10b981', border: '1px solid #10b98130', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  ⚠ {dados.receitas_atrasadas} receita{dados.receitas_atrasadas > 1 ? 's' : ''} atrasada{dados.receitas_atrasadas > 1 ? 's' : ''}
                </span>
              )}
              {dados.despesas_atrasadas > 0 && (
                <span onClick={() => navigate('/sistema/financeiro/despesas')}
                  style={{ background: '#f8717118', color: '#f87171', border: '1px solid #f8717130', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  ⚠ {dados.despesas_atrasadas} despesa{dados.despesas_atrasadas > 1 ? 's' : ''} atrasada{dados.despesas_atrasadas > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {carregando ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a78bca', fontSize: 13, padding: '48px 0' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
              <path d="M21 12a9 9 0 11-9-9" />
            </svg>
            Carregando...
          </div>
        ) : (
          <>
            {/* PORTAL CLIENTE */}
            {perfil === 'CLIENTE' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Meus Projetos',  path: '/sistema/meus-projetos', cor: '#063BF8', icon: ['M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'] },
                  { label: 'Entregas',       path: '/sistema/entregas',       cor: '#10b981', icon: ['M5 12h14', 'M12 5l7 7-7 7'] },
                  { label: 'Suporte',        path: '/sistema/suporte',        cor: '#f59e0b', icon: ['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'] },
                  { label: 'Minhas Faturas', path: '/sistema/minhas-faturas', cor: '#a855f7', icon: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'] },
                ].map(({ label, path, cor, icon }) => (
                  <div key={path} onClick={() => navigate(path)}
                    style={{ ...card, padding: '22px 20px', cursor: 'pointer', transition: 'all 0.18s', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = cor + '44' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#1a0a2e'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={icon} size={17} color={cor} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* KPIs FINANCEIROS (ADMIN + FINANCEIRO) */}
            {isFin && dados && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: 12, marginBottom: 22 }}>
                <KpiCard label="Entradas do Mês" valor={fmt(dados.receita_mes)} sub={`${new Date().toLocaleDateString('pt-BR', { month: 'long' })} atual`} cor="#10b981" icon="M12 19V5M5 12l7-7 7 7" onClick={() => navigate('/sistema/financeiro/livro-caixa')} />
                <KpiCard label="Saídas do Mês" valor={fmt(dados.despesa_mes)} sub="saídas no período" cor="#f87171" icon="M12 5v14M5 12l7 7 7-7" onClick={() => navigate('/sistema/financeiro/livro-caixa')} />
                <KpiCard label="Resultado do Mês" valor={fmt(dados.resultado_mes)} sub="entradas − saídas" cor={resCor(dados.resultado_mes)} icon="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                <KpiCard label="Saldo em Caixa" valor={fmt(dados.saldo_total_contas)} sub="todas as contas" cor={resCor(dados.saldo_total_contas)} icon="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" onClick={() => navigate('/sistema/financeiro/contas')} />
                <KpiCard label="MRR" valor={fmt(dados.mrr)} sub="mensalidades recebidas" cor="#063BF8" icon="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                {isOps && dados.clientes_ativos != null && (
                  <KpiCard label="Clientes Ativos" valor={dados.clientes_ativos} sub="cadastrados" cor="#38bdf8" icon={['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75']} onClick={() => navigate('/sistema/clientes')} />
                )}
                {isOps && dados.chamados_abertos != null && (
                  <KpiCard label="Chamados Abertos" valor={dados.chamados_abertos} sub="aguardando atendimento" cor="#f59e0b" icon={['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z']} onClick={() => navigate('/sistema/os')} />
                )}
              </div>
            )}

            {/* KPIs OPERACIONAIS apenas (sem financeiro) */}
            {!isFin && isOps && dados && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: 12, marginBottom: 22 }}>
                <KpiCard label="Leads Total" valor={dados.leads_total} sub={`${dados.leads_nao_lidos} não lidos`} cor="#38bdf8" icon="M4 4h16M4 8h16M4 12h10" onClick={() => navigate('/sistema/leads')} />
                <KpiCard label="Convertidos" valor={dados.leads_convertidos} sub="leads → clientes" cor="#10b981" icon={['M22 11.08V12a10 10 0 11-5.93-9.14', 'M22 4L12 14.01l-3-3']} onClick={() => navigate('/sistema/prospectos')} />
                <KpiCard label="Clientes Ativos" valor={dados.clientes_ativos} sub="cadastrados" cor="#a855f7" icon={['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8']} onClick={() => navigate('/sistema/clientes')} />
                <KpiCard label="Chamados Abertos" valor={dados.chamados_abertos} sub="aguardando" cor="#f59e0b" icon={['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z']} onClick={() => navigate('/sistema/os')} />
              </div>
            )}

            {/* PIPELINE OS */}
            {isOps && dados?.pipeline_os?.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <SecTitle action="Ver todas" onAction={() => navigate('/sistema/os')}>Pipeline de Ordens de Serviço</SecTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {dados.pipeline_os.map(stage => {
                    const cfg = STATUS_CFG[stage.status] || { label: stage.status, cor: '#7c6d9a' }
                    return (
                      <div key={stage.status}
                        onClick={() => navigate('/sistema/os')}
                        style={{ ...card, borderColor: cfg.cor + '25', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = cfg.cor + '0c'; e.currentTarget.style.borderColor = cfg.cor + '55' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#1a0a2e'; e.currentTarget.style.borderColor = cfg.cor + '25' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: cfg.cor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cfg.label}</span>
                          <span style={{ fontSize: 22, fontWeight: 800, color: stage.count > 0 ? '#f1f5f9' : '#3a2a55', fontFamily: 'Plus Jakarta Sans', lineHeight: 1 }}>{stage.count}</span>
                        </div>
                        <p style={{ fontSize: 10, color: '#6b6b8a', margin: 0 }}>{stage.count > 0 ? fmt(stage.valor) : '—'}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* GRÁFICO + VENCIMENTOS */}
            {isFin && dados && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 22 }}>

                {/* Gráfico 6 meses */}
                <div style={{ ...card, padding: '20px 22px' }}>
                  <SecTitle>Receita vs Despesa — últimos 6 meses</SecTitle>
                  <GraficoBarras dados={dados.grafico_6_meses} />
                </div>

                {/* Próximos vencimentos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ ...card, padding: '18px 20px', flex: 1 }}>
                    <SecTitle action="Receitas" onAction={() => navigate('/sistema/financeiro/receitas')}>
                      A Receber — próximos 30 dias
                    </SecTitle>
                    <ListaVencimentos itens={dados.receitas_vencer} tipo="receita" />
                  </div>
                  <div style={{ ...card, padding: '18px 20px', flex: 1 }}>
                    <SecTitle action="Despesas" onAction={() => navigate('/sistema/financeiro/despesas')}>
                      A Pagar — próximos 30 dias
                    </SecTitle>
                    <ListaVencimentos itens={dados.despesas_vencer} tipo="despesa" />
                  </div>
                </div>
              </div>
            )}

            {/* ÚLTIMAS OS + TOP CLIENTES */}
            {dados && (isOps || isFin) && (dados.ultimas_os?.length > 0 || dados.top_clientes?.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: dados.top_clientes?.length > 0 && dados.ultimas_os?.length > 0 ? '2fr 1fr' : '1fr', gap: 16 }}>

                {/* Últimas OS */}
                {isOps && dados.ultimas_os?.length > 0 && (
                  <div style={{ ...card, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 20px 12px' }}>
                      <SecTitle action="Ver todas" onAction={() => navigate('/sistema/os')}>Últimas Ordens de Serviço</SecTitle>
                    </div>
                    {dados.ultimas_os.map((os, i) => {
                      const cfg = STATUS_CFG[os.status] || { label: os.status, cor: '#7c6d9a' }
                      return (
                        <div key={os.id} onClick={() => navigate(`/sistema/os/${os.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{os.titulo}</p>
                            <p style={{ fontSize: 11, color: '#a78bca', margin: 0 }}>
                              {os.cliente_nome || '—'}{os.valor_total > 0 ? ` · ${fmt(os.valor_total)}` : ''}
                            </p>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, background: cfg.cor + '20', color: cfg.cor, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>
                            {cfg.label}
                          </span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Top Clientes */}
                {isFin && dados.top_clientes?.length > 0 && (
                  <div style={{ ...card, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 20px 12px' }}>
                      <SecTitle action="Relatório" onAction={() => navigate('/sistema/financeiro/por-cliente')}>Top Clientes {new Date().getFullYear()}</SecTitle>
                    </div>
                    {dados.top_clientes.map((c, i) => {
                      const maxTotal = Number(dados.top_clientes[0]?.total || 1)
                      const pct = (Number(c.total) / maxTotal) * 100
                      const cores = ['#10b981', '#063BF8', '#a855f7', '#f59e0b', '#38bdf8']
                      const cor = cores[i] || '#10b981'
                      return (
                        <div key={c.cliente_nome + i} style={{ padding: '11px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#e2d9f3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '58%' }}>
                              {c.cliente_nome || '—'}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: cor }}>{fmt(c.total)}</span>
                          </div>
                          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 2, transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </SistemaLayout>
  )
}
