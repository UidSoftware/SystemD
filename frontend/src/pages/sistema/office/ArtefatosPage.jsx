import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { ModalConfirmar } from '../../../components/sistema/FinanceiroTable'
import api from '../../../services/api'

const inputStyle = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13,
  outline: 'none', fontFamily: 'inherit',
}

const TIPO_LABELS = {
  levantamento_requisitos: 'Levantamento de Requisitos',
  uml_usecase: 'UML — Casos de Uso',
  uml_classes: 'UML — Classes',
  uml_activity: 'UML — Atividades',
  uml_sequencia: 'UML — Sequência',
  uml_estado: 'UML — Estado',
  uml_componentes: 'UML — Componentes',
  uml_implantacao: 'UML — Implantação',
  dicionario_dados: 'Dicionário de Dados',
  regras_negocio: 'Regras de Negócio',
  design_system: 'Design System',
  adr: 'ADR',
  contrato_servico: 'Contrato de Serviço (documento)',
  especificacao_hotfix: 'Especificação de Hotfix',
  especificacao_ui_hotfix: 'Especificação de UI (Hotfix)',
  relatorio_qa: 'Relatório de QA',
  deploy_info: 'Informações de Deploy',
  outro: 'Outro',
}

const AGENTE_CORES = {
  planner: '#6b8fff', analista: '#34d399', analista_uml: '#34d399',
  blueprint: '#f59e0b', brush: '#f472b6', doc_generator: '#a78bca',
  forge: '#f87171', loom: '#60a5fa', sentinel: '#fbbf24',
  pilot: '#10b981', hotfix: '#ef4444',
}
const AGENTE_LABELS = {
  planner: 'Planner', analista: 'Analista', analista_uml: 'Analista UML',
  blueprint: 'Blueprint', brush: 'Brush', doc_generator: 'Doc Generator',
  forge: 'Forge', loom: 'Loom', sentinel: 'Sentinel',
  pilot: 'Pilot', hotfix: 'Hotfix',
}

function Badge({ children, cor }) {
  return (
    <span style={{ background: `${cor}22`, color: cor, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
      {children}
    </span>
  )
}

function formatData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

export default function ArtefatosPage() {
  const [dados, setDados]           = useState([])
  const [total, setTotal]           = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [filtroAgente, setFiltroAgente] = useState('')
  const [busca, setBusca]           = useState('')
  const [selecionado, setSelecionado] = useState(null)
  const [modalConfirmar, setModalConfirmar] = useState(null)

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = { page_size: 100 }
    if (filtroTipo) params.tipo = filtroTipo
    if (filtroAgente) params.agente = filtroAgente
    if (busca) params.search = busca
    api.get('/artefatos/', { params })
      .then(res => { setDados(res.data.results ?? res.data); setTotal(res.data.count ?? (res.data.results ?? res.data).length) })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [filtroTipo, filtroAgente, busca])

  useEffect(() => { carregar() }, [carregar])

  const excluir = (a) => setModalConfirmar({
    msg: `Remover o artefato "${a.titulo}"?`,
    onConfirm: async () => { await api.delete('/artefatos/' + a.id + '/'); if (selecionado?.id === a.id) setSelecionado(null); carregar() },
  })

  return (
    <SistemaLayout titulo="Artefatos">
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Artefatos</h1>
            <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>
              Documentos e entregas geradas pelos agents do Claw Empire — {total} artefato{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <select style={{ ...inputStyle, width: 220 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(TIPO_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select style={{ ...inputStyle, width: 180 }} value={filtroAgente} onChange={e => setFiltroAgente(e.target.value)}>
            <option value="">Todos os agents</option>
            {Object.entries(AGENTE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input
            placeholder="Buscar por título ou conteúdo..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 220 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Lista */}
          <div style={{ flex: selecionado ? '0 0 380px' : 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            {carregando ? (
              <p style={{ color: '#a78bca', textAlign: 'center', padding: 32 }}>Carregando...</p>
            ) : dados.length === 0 ? (
              <p style={{ color: '#a78bca', textAlign: 'center', padding: 32 }}>Nenhum artefato encontrado</p>
            ) : dados.map(a => (
              <div key={a.id}
                onClick={() => setSelecionado(a)}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
                  background: selecionado?.id === a.id ? 'rgba(6,59,248,0.1)' : 'transparent',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Badge cor={AGENTE_CORES[a.agente] || '#a78bca'}>{AGENTE_LABELS[a.agente] || a.agente}</Badge>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{formatData(a.criado_em)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600, marginBottom: 4 }}>{a.titulo}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{TIPO_LABELS[a.tipo] || a.tipo}</div>
                {a.vinculo_repr && (
                  <div style={{ fontSize: 11, color: '#6b8fff', marginTop: 4 }}>🔗 {a.vinculo_tipo}: {a.vinculo_repr}</div>
                )}
              </div>
            ))}
          </div>

          {/* Viewer */}
          {selecionado && (
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{selecionado.titulo}</h2>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge cor={AGENTE_CORES[selecionado.agente] || '#a78bca'}>{AGENTE_LABELS[selecionado.agente] || selecionado.agente}</Badge>
                    <span style={{ fontSize: 12, color: '#a78bca' }}>{TIPO_LABELS[selecionado.tipo] || selecionado.tipo}</span>
                    {selecionado.status && <Badge cor="#f59e0b">{selecionado.status}</Badge>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => excluir(selecionado)}
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                    Excluir
                  </button>
                  <button onClick={() => setSelecionado(null)}
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                    Fechar
                  </button>
                </div>
              </div>

              {(selecionado.vinculo_repr || selecionado.commit_hash || selecionado.deploy_url) && (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12 }}>
                  {selecionado.vinculo_repr && <span style={{ color: '#a78bca' }}>🔗 {selecionado.vinculo_tipo}: <strong style={{ color: '#e2e8f0' }}>{selecionado.vinculo_repr}</strong></span>}
                  {selecionado.commit_hash && <span style={{ color: '#a78bca' }}>Commit: <code style={{ color: '#e2e8f0' }}>{selecionado.commit_hash.slice(0, 10)}</code></span>}
                  {selecionado.deploy_url && <a href={selecionado.deploy_url} target="_blank" rel="noreferrer" style={{ color: '#6b8fff' }}>🔗 Ver deploy</a>}
                </div>
              )}

              <pre style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace',
                fontSize: 13, color: '#e2e8f0', background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                padding: 16, maxHeight: 560, overflowY: 'auto', margin: 0,
              }}>
                {selecionado.conteudo || '(sem conteúdo)'}
              </pre>
            </div>
          )}
        </div>
      </div>
      <ModalConfirmar config={modalConfirmar} onClose={() => setModalConfirmar(null)} />
    </SistemaLayout>
  )
}
