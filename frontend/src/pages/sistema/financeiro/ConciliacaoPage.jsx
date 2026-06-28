import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, Spinner, Vazio, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

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

export default function ConciliacaoPage() {
  const [lista, setLista]               = useState([])
  const [contas, setContas]             = useState([])
  const [carregando, setCarregando]     = useState(true)
  const [selecionada, setSelecionada]   = useState(null)
  const [detalhe, setDetalhe]           = useState(null)
  const [carregandoDet, setCarregandoDet] = useState(false)
  const [modalAberto, setModalAberto]   = useState(false)
  const [processando, setProcessando]   = useState(false)
  const [confirmando, setConfirmando]   = useState(false)
  const [form, setForm]                 = useState({ arquivo: '', conta: '', mes: '', senha: '609393' })
  const [erro, setErro]                 = useState('')
  const [msg, setMsg]                   = useState('')

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

  useEffect(() => { carregar() }, [carregar])

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
      abrirDetalhe(r.data.id)
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao processar extrato.')
    } finally {
      setProcessando(false)
    }
  }

  const confirmarTodos = async () => {
    if (!selecionada) return
    setConfirmando(true)
    setMsg('')
    try {
      const r = await financeiroApi.confirmarConciliacao(selecionada, {})
      setMsg(`${r.data.criados} lançamento(s) criado(s).`)
      abrirDetalhe(selecionada)
      carregar()
    } catch (e) {
      setMsg('Erro ao confirmar lançamentos.')
    } finally {
      setConfirmando(false)
    }
  }

  const confirmarItem = async (itemId) => {
    if (!selecionada) return
    try {
      await financeiroApi.confirmarConciliacao(selecionada, { itens: [itemId] })
      abrirDetalhe(selecionada)
      carregar()
    } catch { /* silencioso */ }
  }

  const itensDetalhe = detalhe?.itens ?? []
  const faltandoSistema = itensDetalhe.filter(i => i.status === 'FALTANDO_SISTEMA' && !i.confirmado)

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Conciliação Bancária</h1>
            <p style={{ fontSize: 13, color: '#a78bca', margin: 0 }}>Compare extratos bancários com o Livro Caixa</p>
          </div>
          <button
            onClick={() => { setModalAberto(true); setErro(''); setForm({ arquivo: '', conta: '', mes: '', senha: '609393' }) }}
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            + Nova Conciliação
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selecionada ? '340px 1fr' : '1fr', gap: 20 }}>
          {/* Lista */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Cabeçalho lista */}
            <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
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

          {/* Detalhe */}
          {selecionada && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
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
                      {faltandoSistema.length > 0 && (
                        <button
                          onClick={confirmarTodos}
                          disabled={confirmando}
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 12, cursor: 'pointer', opacity: confirmando ? 0.6 : 1 }}>
                          {confirmando ? 'Criando...' : `Criar todos (${faltandoSistema.length})`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabela itens */}
                  <div style={{ padding: '0 0 16px' }}>
                    {/* Cabeçalho tabela */}
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
                              onClick={() => confirmarItem(item.id)}
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
      </div>

      {/* Modal Nova Conciliação */}
      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
    </SistemaLayout>
  )
}
