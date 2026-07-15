import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, Vazio, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

// ── helpers de badge ──────────────────────────────────────────────────────────

const badge = (status) => {
  const map = {
    PROCESSADO:       { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Processado' },
    COM_DIVERGENCIAS: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Com Divergências' },
    PENDENTE:         { bg: 'rgba(107,107,138,0.15)', color: '#a78bca', label: 'Pendente' },
  }
  const s = map[status] || map.PENDENTE
  return (
    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

const badgeItem = (status) => {
  const map = {
    CONCILIADO:       { color: '#10b981', icon: '✓' },
    FALTANDO_SISTEMA: { color: '#f87171', icon: '✗' },
    FALTANDO_BANCO:   { color: '#fbbf24', icon: '⚠' },
  }
  const s = map[status] || { color: '#6b6b8a', icon: '?' }
  return <span style={{ color: s.color, fontWeight: 700, fontSize: 14 }}>{s.icon}</span>
}

const badgeTipo = (tipo) => (
  <span style={{
    padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: tipo === 'ENTRADA' ? 'rgba(16,185,129,0.15)' : 'rgba(248,113,113,0.15)',
    color: tipo === 'ENTRADA' ? '#10b981' : '#f87171',
  }}>
    {tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
  </span>
)

// ── abas disponíveis ──────────────────────────────────────────────────────────

const ABAS = ['historico', 'pendentes', 'padroes']
const ABA_LABEL = { historico: 'Histórico', pendentes: 'Pendentes', padroes: 'Padrões Seguros' }

// ── componente principal ──────────────────────────────────────────────────────

export default function ConciliacaoPage() {
  // listagem / detalhe
  const [lista, setLista]               = useState([])
  const [contas, setContas]             = useState([])
  const [carregando, setCarregando]     = useState(true)
  const [selecionada, setSelecionada]   = useState(null)
  const [detalhe, setDetalhe]           = useState(null)
  const [carregandoDet, setCarregandoDet] = useState(false)

  // pendentes agrupados
  const [pendentes, setPendentes]             = useState([])
  const [carregandoPend, setCarregandoPend]   = useState(false)
  const [gruposAbertos, setGruposAbertos]     = useState({})
  const [criandoItem, setCriandoItem]         = useState(null)

  // padrões seguros
  const [padroes, setPadroes]                 = useState([])
  const [carregandoPadroes, setCarregandoPadroes] = useState(false)
  const [removendoPadrao, setRemovendoPadrao] = useState(null)

  // modal nova conciliação
  const [modalAberto, setModalAberto]   = useState(false)
  const [processando, setProcessando]   = useState(false)
  const [form, setForm]                 = useState({ arquivo: '', conta: '', mes: '', senha: '609393' })
  const [erro, setErro]                 = useState('')

  // mini-modal padrão seguro
  const [modalPadrao, setModalPadrao]   = useState(null)   // null | { descricao, tipo }
  const [salvandoPadrao, setSalvandoPadrao] = useState(false)
  const [erroPadrao, setErroPadrao]     = useState('')
  const [formPadrao, setFormPadrao]     = useState({ descricao: '', tipo: 'ENTRADA' })

  // mensagens globais
  const [msg, setMsg]                   = useState('')

  // aba ativa
  const [aba, setAba]                   = useState('historico')

  // ── carregamento de dados ────────────────────────────────────────────────────

  const carregar = useCallback(() => {
    setCarregando(true)
    Promise.all([
      financeiroApi.listarConciliacoes(),
      financeiroApi.listarContas(),
    ]).then(([r, c]) => {
      setLista(r.data.results ?? r.data)
      setContas(c.data.results ?? c.data)
    }).catch(() => {}).finally(() => setCarregando(false))
  }, [])

  const carregarPendentes = useCallback(() => {
    setCarregandoPend(true)
    financeiroApi.listarConciliacoesPendentes()
      .then(r => setPendentes(r.data.results ?? r.data ?? []))
      .catch(() => setPendentes([]))
      .finally(() => setCarregandoPend(false))
  }, [])

  const carregarPadroes = useCallback(() => {
    setCarregandoPadroes(true)
    financeiroApi.listarPadroesSeguros()
      .then(r => setPadroes(r.data.results ?? r.data ?? []))
      .catch(() => setPadroes([]))
      .finally(() => setCarregandoPadroes(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (aba === 'pendentes') carregarPendentes()
    if (aba === 'padroes')   carregarPadroes()
  }, [aba, carregarPendentes, carregarPadroes])

  // ── ações ─────────────────────────────────────────────────────────────────

  const abrirDetalhe = (id) => {
    setSelecionada(id)
    setDetalhe(null)
    setCarregandoDet(true)
    financeiroApi.detalharConciliacao(id)
      .then(r => setDetalhe(r.data))
      .catch(() => setDetalhe(null))
      .finally(() => setCarregandoDet(false))
  }

  const processar = async () => {
    if (!form.arquivo || !form.conta) { setErro('Arquivo e conta são obrigatórios.'); return }
    setProcessando(true)
    setErro('')
    try {
      const r = await financeiroApi.processarConciliacao(form)
      carregar()
      setModalAberto(false)
      setAba('historico')
      abrirDetalhe(r.data.id)
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao processar extrato.')
    } finally {
      setProcessando(false)
    }
  }

  const confirmarItem = async (conciliacaoId, itemId) => {
    setCriandoItem(itemId)
    try {
      await financeiroApi.confirmarConciliacao(conciliacaoId, { itens: [itemId] })
      setMsg('Lançamento criado com sucesso.')
      carregarPendentes()
      carregar()
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setMsg('Erro ao criar lançamento.')
      setTimeout(() => setMsg(''), 3000)
    } finally {
      setCriandoItem(null)
    }
  }

  const confirmarItemDetalhe = async (itemId) => {
    if (!selecionada) return
    try {
      await financeiroApi.confirmarConciliacao(selecionada, { itens: [itemId] })
      abrirDetalhe(selecionada)
      carregar()
    } catch { /* silencioso */ }
  }

  const toggleGrupo = (descricao) => {
    setGruposAbertos(prev => ({ ...prev, [descricao]: !prev[descricao] }))
  }

  const abrirModalPadrao = (grupo) => {
    setFormPadrao({ descricao: grupo.descricao, tipo: grupo.tipo })
    setErroPadrao('')
    setModalPadrao(grupo)
  }

  const abrirModalPadraoVazio = () => {
    setFormPadrao({ descricao: '', tipo: 'ENTRADA' })
    setErroPadrao('')
    setModalPadrao({})
  }

  const salvarPadrao = async () => {
    if (!formPadrao.descricao.trim()) { setErroPadrao('Descrição obrigatória.'); return }
    setSalvandoPadrao(true)
    setErroPadrao('')
    try {
      await financeiroApi.criarPadraoSeguro({
        descricao_padrao: formPadrao.descricao.trim(),
        tipo: formPadrao.tipo,
      })
      setModalPadrao(null)
      carregarPadroes()
      setMsg('Padrão seguro criado com sucesso.')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      const err = e.response?.data
      setErroPadrao(
        typeof err === 'string' ? err :
        err?.descricao_padrao?.[0] || err?.detail || 'Erro ao criar padrão.'
      )
    } finally {
      setSalvandoPadrao(false)
    }
  }

  const removerPadrao = async (id) => {
    setRemovendoPadrao(id)
    try {
      await financeiroApi.deletarPadraoSeguro(id)
      carregarPadroes()
      setMsg('Padrão removido.')
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setMsg('Erro ao remover padrão.')
      setTimeout(() => setMsg(''), 3000)
    } finally {
      setRemovendoPadrao(null)
    }
  }

  // ── itens do detalhe ───────────────────────────────────────────────────────

  const itensDetalhe = detalhe?.itens ?? []

  // ── estilos compartilhados ────────────────────────────────────────────────

  const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    overflow: 'hidden',
  }

  const headerCardStyle = {
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.05)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  }

  // ── renderização das abas ─────────────────────────────────────────────────

  const renderAbas = () => (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
      {ABAS.map(a => (
        <button
          key={a}
          onClick={() => { setAba(a); setSelecionada(null); setDetalhe(null) }}
          style={{
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
            color: aba === a ? '#f1f5f9' : '#a78bca',
            borderBottom: aba === a ? '2px solid #7c3aed' : '2px solid transparent',
            transition: 'color 0.15s, border-color 0.15s',
          }}>
          {ABA_LABEL[a]}
          {a === 'pendentes' && pendentes.length > 0 && (
            <span style={{ marginLeft: 6, background: '#f87171', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
              {pendentes.length}
            </span>
          )}
          {a === 'padroes' && padroes.length > 0 && (
            <span style={{ marginLeft: 6, background: 'rgba(124,58,237,0.4)', color: '#e2d9f3', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
              {padroes.length}
            </span>
          )}
        </button>
      ))}
    </div>
  )

  const renderHistorico = () => (
    <div style={{ display: 'grid', gridTemplateColumns: selecionada ? '340px 1fr' : '1fr', gap: 20 }}>
      {/* Lista histórico */}
      <div style={cardStyle}>
        <div style={headerCardStyle}>
          <span style={{ fontSize: 11, color: '#a78bca', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Histórico</span>
        </div>
        {carregando ? <Spinner /> : lista.length === 0 ? <Vazio /> : (
          lista.map(c => (
            <div
              key={c.id}
              onClick={() => abrirDetalhe(c.id)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                background: selecionada === c.id ? 'rgba(124,58,237,0.12)' : 'transparent',
                borderLeft: selecionada === c.id ? '3px solid #7c3aed' : '3px solid transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (selecionada !== c.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (selecionada !== c.id) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{c.conta_nome}</span>
                {badge(c.status)}
              </div>
              <div style={{ fontSize: 12, color: '#a78bca' }}>
                {c.periodo ? new Date(c.periodo + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : ''}
              </div>
              {c.divergencias > 0 && (
                <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>
                  {c.divergencias} divergência{c.divergencias !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Detalhe da conciliação */}
      {selecionada && (
        <div style={cardStyle}>
          {carregandoDet ? <Spinner /> : !detalhe ? <Vazio /> : (
            <>
              {/* Header detalhe */}
              <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{detalhe.conta_nome} — </span>
                  <span style={{ fontSize: 14, color: '#a78bca' }}>
                    {detalhe.periodo ? new Date(detalhe.periodo + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : ''}
                  </span>
                  <div style={{ marginTop: 4, display: 'flex', gap: 16, fontSize: 12 }}>
                    <span style={{ color: '#10b981' }}>Banco: {formatMoeda(Math.abs(parseFloat(detalhe.total_banco || 0)))}</span>
                    <span style={{ color: '#a78bca' }}>Sistema: {formatMoeda(Math.abs(parseFloat(detalhe.total_sistema || 0)))}</span>
                    {detalhe.divergencias > 0 && <span style={{ color: '#f87171' }}>Divergências: {detalhe.divergencias}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {msg && <span style={{ fontSize: 12, color: '#10b981' }}>{msg}</span>}
                  {/* "Criar todos" removido — usuário deve revisar cada item individualmente */}
                  <span style={{ fontSize: 12, color: '#a78bca', fontStyle: 'italic' }}>
                    Revise cada item abaixo antes de criar o lançamento.
                  </span>
                </div>
              </div>

              {/* Tabela itens */}
              <div style={{ padding: '0 0 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '32px 90px 1fr 110px 120px 120px', padding: '8px 20px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['', 'Data', 'Descrição', 'Valor', 'Status', 'Ação'].map((col, i) => (
                    <span key={i} style={{ fontSize: 11, color: '#a78bca', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col}</span>
                  ))}
                </div>
                {itensDetalhe.length === 0 ? <Vazio /> : itensDetalhe.map(item => (
                  <div key={item.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 90px 1fr 110px 120px 120px',
                    padding: '10px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    alignItems: 'center',
                    opacity: item.confirmado ? 0.5 : 1,
                  }}>
                    <span>{badgeItem(item.status)}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {item.data_banco ? new Date(item.data_banco + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                    </span>
                    <span style={{ fontSize: 12, color: '#e2d9f3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.descricao_banco}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: item.tipo === 'ENTRADA' ? '#10b981' : '#f87171' }}>
                      {item.tipo === 'ENTRADA' ? '+' : '-'}{formatMoeda(item.valor)}
                    </span>
                    <span style={{ fontSize: 11 }}>
                      {item.status === 'CONCILIADO' && <span style={{ color: '#10b981' }}>Conciliado</span>}
                      {item.status === 'FALTANDO_SISTEMA' && !item.confirmado && <span style={{ color: '#f87171' }}>Faltando sistema</span>}
                      {item.status === 'FALTANDO_SISTEMA' && item.confirmado && <span style={{ color: '#10b981' }}>Criado ✓</span>}
                      {item.status === 'FALTANDO_BANCO' && <span style={{ color: '#fbbf24' }}>Faltando banco</span>}
                    </span>
                    <span>
                      {item.status === 'FALTANDO_SISTEMA' && !item.confirmado && (
                        <button
                          onClick={() => confirmarItemDetalhe(item.id)}
                          style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bca', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                          Criar
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )

  const renderPendentes = () => (
    <div>
      {carregandoPend ? <Spinner /> : pendentes.length === 0 ? (
        <div style={{ ...cardStyle, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ color: '#10b981', fontWeight: 600, marginBottom: 4 }}>Tudo em dia</div>
          <div style={{ fontSize: 13, color: '#a78bca' }}>Não há transações bancárias pendentes de revisão.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pendentes.map((grupo) => {
            const aberto = !!gruposAbertos[grupo.descricao]
            return (
              <div key={grupo.descricao} style={cardStyle}>
                {/* Cabeçalho do grupo */}
                <div
                  onClick={() => toggleGrupo(grupo.descricao)}
                  style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                    <span style={{ fontSize: aberto ? 12 : 12, color: '#a78bca', flexShrink: 0 }}>{aberto ? '▼' : '▶'}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {grupo.descricao}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                        {badgeTipo(grupo.tipo)}
                        <span style={{ fontSize: 11, color: '#a78bca' }}>
                          {grupo.total_ocorrencias} ocorrência{grupo.total_ocorrencias !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: grupo.tipo === 'ENTRADA' ? '#10b981' : '#f87171' }}>
                          {grupo.tipo === 'ENTRADA' ? '+' : '-'}{formatMoeda(grupo.valor_total)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); abrirModalPadrao(grupo) }}
                    style={{ flexShrink: 0, background: 'rgba(124,58,237,0.15)', color: '#a78bca', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Tornar padrão seguro
                  </button>
                </div>

                {/* Itens do grupo (colapsável) */}
                {aberto && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Cabeçalho da mini-tabela */}
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 120px 100px', padding: '6px 18px', background: 'rgba(255,255,255,0.03)' }}>
                      {['Data', 'Descrição', 'Valor', 'Ação'].map((col, i) => (
                        <span key={i} style={{ fontSize: 10, color: '#6b6b8a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col}</span>
                      ))}
                    </div>
                    {(grupo.itens ?? []).map(item => (
                      <div key={item.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 1fr 120px 100px',
                        padding: '9px 18px',
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                        alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          {item.data_banco ? new Date(item.data_banco + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </span>
                        <span style={{ fontSize: 12, color: '#e2d9f3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.descricao_banco ?? grupo.descricao}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: grupo.tipo === 'ENTRADA' ? '#10b981' : '#f87171' }}>
                          {grupo.tipo === 'ENTRADA' ? '+' : '-'}{formatMoeda(item.valor)}
                        </span>
                        <span>
                          <button
                            onClick={() => confirmarItem(item.conciliacao_id, item.id)}
                            disabled={criandoItem === item.id}
                            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', opacity: criandoItem === item.id ? 0.6 : 1 }}>
                            {criandoItem === item.id ? '...' : 'Criar lançamento'}
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderPadroes = () => (
    <div>
      {/* Aviso */}
      <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
        <p style={{ fontSize: 13, color: '#fbbf24', margin: 0, lineHeight: 1.5 }}>
          Transações com estas descrições são criadas automaticamente no Livro Caixa sem revisão humana.
          Remova um padrão se não quiser mais a criação automática.
        </p>
      </div>

      {/* Botão novo padrão */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={abrirModalPadraoVazio}
          style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bca', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Novo Padrão
        </button>
      </div>

      {carregandoPadroes ? <Spinner /> : padroes.length === 0 ? (
        <div style={{ ...cardStyle, padding: 32, textAlign: 'center' }}>
          <div style={{ color: '#a78bca', fontSize: 13 }}>Nenhum padrão seguro cadastrado.</div>
        </div>
      ) : (
        <div style={cardStyle}>
          {/* Cabeçalho */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px 80px', padding: '8px 18px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {['Descrição', 'Tipo', 'Criado em', 'Ação'].map((col, i) => (
              <span key={i} style={{ fontSize: 11, color: '#a78bca', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col}</span>
            ))}
          </div>
          {padroes.map(p => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px 80px', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.descricao_padrao}
              </span>
              <span>{badgeTipo(p.tipo)}</span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR') : '—'}
              </span>
              <span>
                <button
                  onClick={() => removerPadrao(p.id)}
                  disabled={removendoPadrao === p.id}
                  style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', opacity: removendoPadrao === p.id ? 0.6 : 1 }}>
                  {removendoPadrao === p.id ? '...' : 'Remover'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── render principal ──────────────────────────────────────────────────────

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Conciliação Bancária</h1>
            <p style={{ fontSize: 13, color: '#a78bca', margin: 0 }}>Compare extratos bancários com o Livro Caixa</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {msg && <span style={{ fontSize: 12, color: '#10b981' }}>{msg}</span>}
            <button
              onClick={() => { setModalAberto(true); setErro(''); setForm({ arquivo: '', conta: '', mes: '', senha: '609393' }) }}
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              + Nova Conciliação
            </button>
          </div>
        </div>

        {/* Abas */}
        {renderAbas()}

        {/* Conteúdo da aba */}
        {aba === 'historico' && renderHistorico()}
        {aba === 'pendentes' && renderPendentes()}
        {aba === 'padroes'   && renderPadroes()}
      </div>

      {/* Modal Nova Conciliação */}
      {modalAberto && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false) }}>
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 32, width: 440, maxWidth: '90vw' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 20 }}>Nova Conciliação</h2>

            <label style={{ display: 'block', fontSize: 12, color: '#a78bca', marginBottom: 4 }}>Conta *</label>
            <select style={{ ...inputStyle, width: '100%', marginBottom: 14 }} value={form.conta}
              onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}>
              <option value="">Selecione a conta</option>
              {contas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12, color: '#a78bca', marginBottom: 4 }}>Caminho do arquivo PDF *</label>
            <input
              style={{ ...inputStyle, width: '100%', marginBottom: 4, boxSizing: 'border-box' }}
              placeholder="/home/notuidsoftware/Dropbox/.../C6-2026-06-extrato.pdf"
              value={form.arquivo}
              onChange={e => setForm(f => ({ ...f, arquivo: e.target.value }))}
            />
            <p style={{ fontSize: 11, color: '#6b6b8a', marginBottom: 14 }}>
              Caminho no servidor onde o PDF está acessível (ex: pasta Dropbox sincronizada).
            </p>

            <label style={{ display: 'block', fontSize: 12, color: '#a78bca', marginBottom: 4 }}>Período (opcional — inferido do nome)</label>
            <input
              style={{ ...inputStyle, width: '100%', marginBottom: 14, boxSizing: 'border-box' }}
              placeholder="2026-06"
              value={form.mes}
              onChange={e => setForm(f => ({ ...f, mes: e.target.value }))}
            />

            <label style={{ display: 'block', fontSize: 12, color: '#a78bca', marginBottom: 4 }}>Senha do PDF</label>
            <input
              style={{ ...inputStyle, width: '100%', marginBottom: 20, boxSizing: 'border-box' }}
              value={form.senha}
              onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
            />

            {erro && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>{erro}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalAberto(false)}
                style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#a78bca', borderRadius: 10, padding: '10px 0', fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={processar} disabled={processando}
                style={{ flex: 2, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontWeight: 700, cursor: 'pointer', opacity: processando ? 0.6 : 1 }}>
                {processando ? 'Processando...' : 'Processar Extrato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-modal Padrão Seguro */}
      {modalPadrao !== null && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setModalPadrao(null) }}>
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 32, width: 460, maxWidth: '90vw' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>Criar Padrão Seguro</h2>

            {/* Aviso em destaque */}
            <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
              <p style={{ fontSize: 12, color: '#fbbf24', margin: 0, lineHeight: 1.6 }}>
                <strong>Atenção:</strong> Futuras transações com esta descrição serão criadas automaticamente
                no sistema <strong>sem revisão humana</strong>. Use apenas para transações recorrentes e conhecidas.
              </p>
            </div>

            <label style={{ display: 'block', fontSize: 12, color: '#a78bca', marginBottom: 4 }}>Descrição *</label>
            <input
              style={{ ...inputStyle, width: '100%', marginBottom: 14, boxSizing: 'border-box' }}
              placeholder="Ex: PIX RECEBIDO XPTO"
              value={formPadrao.descricao}
              onChange={e => setFormPadrao(f => ({ ...f, descricao: e.target.value }))}
            />

            <label style={{ display: 'block', fontSize: 12, color: '#a78bca', marginBottom: 4 }}>Tipo *</label>
            <select
              style={{ ...inputStyle, width: '100%', marginBottom: 20 }}
              value={formPadrao.tipo}
              onChange={e => setFormPadrao(f => ({ ...f, tipo: e.target.value }))}>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saída</option>
            </select>

            {erroPadrao && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>{erroPadrao}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setModalPadrao(null)}
                style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#a78bca', borderRadius: 10, padding: '10px 0', fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={salvarPadrao}
                disabled={salvandoPadrao}
                style={{ flex: 2, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontWeight: 700, cursor: 'pointer', opacity: salvandoPadrao ? 0.6 : 1 }}>
                {salvandoPadrao ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
