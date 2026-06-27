import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#f1f5f9',
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const STATUS_CORES = {
  rascunho: { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
  enviado:  { bg: 'rgba(59,130,246,0.2)',  color: '#60a5fa' },
  aprovado: { bg: 'rgba(16,185,129,0.2)',  color: '#34d399' },
  recusado: { bg: 'rgba(239,68,68,0.2)',   color: '#f87171' },
  expirado: { bg: 'rgba(245,158,11,0.2)',  color: '#fbbf24' },
  cancelado:{ bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
}
const STATUS_LABELS = {
  rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado',
  recusado: 'Recusado', expirado: 'Expirado', cancelado: 'Cancelado',
}

function Badge({ status }) {
  const c = STATUS_CORES[status] || STATUS_CORES.rascunho
  return <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{STATUS_LABELS[status] || status}</span>
}

function fmt(val) {
  return (parseFloat(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ITEM_VAZIO = { ordem: 1, descricao: '', quantidade: '1', valor_unitario: '' }
const FORM_VAZIO = {
  tipoVinculo: 'cliente',
  cliente: '', prospecto: '',
  valido_ate: '', status: 'rascunho',
  desconto: '0', forma_pagamento: '', observacoes: '',
  itens: [{ ...ITEM_VAZIO }],
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos]     = useState([])
  const [total, setTotal]               = useState(0)
  const [carregando, setCarregando]     = useState(true)
  const [pagina, setPagina]             = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [filtroStatus, setFiltroStatus] = useState('')

  const [clientes, setClientes]         = useState([])
  const [prospectos, setProspectos]     = useState([])
  const [modal, setModal]               = useState(null)
  const [editandoId, setEditandoId]     = useState(null)
  const [salvando, setSalvando]         = useState(false)
  const [erro, setErro]                 = useState('')
  const [syncInfo, setSyncInfo]         = useState(null)

  const carregar = useCallback(async (pag = 1, status = filtroStatus) => {
    setCarregando(true)
    try {
      const params = { page: pag }
      if (status) params.status = status
      const res = await api.get('/orcamentos/', { params })
      setOrcamentos(res.data.results)
      setTotal(res.data.count)
      setTotalPaginas(Math.ceil(res.data.count / 20))
    } finally { setCarregando(false) }
  }, [filtroStatus])

  useEffect(() => {
    carregar()
    api.get('/clientes/?page_size=200').then(r => setClientes(r.data.results || [])).catch(() => {})
    api.get('/prospectos/?page_size=200').then(r => setProspectos(r.data.results || [])).catch(() => {})
  }, [])

  const abrirNovo = () => {
    setEditandoId(null)
    setModal({ ...FORM_VAZIO, itens: [{ ...ITEM_VAZIO }] })
    setErro(''); setSyncInfo(null)
  }

  const abrirEditar = (o) => {
    setEditandoId(o.id)
    const tipoVinculo = o.prospecto ? 'prospecto' : 'cliente'
    setModal({
      tipoVinculo,
      cliente:         o.cliente    || '',
      prospecto:       o.prospecto  || '',
      valido_ate:      o.valido_ate || '',
      status:          o.status,
      desconto:        o.desconto   || '0',
      forma_pagamento: o.forma_pagamento || '',
      observacoes:     o.observacoes || '',
      itens: o.itens && o.itens.length
        ? o.itens.map(i => ({ ordem: i.ordem, descricao: i.descricao, quantidade: String(i.quantidade), valor_unitario: String(i.valor_unitario) }))
        : [{ ...ITEM_VAZIO }],
    })
    setErro(''); setSyncInfo(null)
  }

  const excluir = async (id) => {
    if (!window.confirm('Excluir este orçamento?')) return
    await api.delete('/orcamentos/' + id + '/')
    carregar(pagina)
  }

  const setItem = (idx, field, val) => setModal(m => {
    const itens = [...m.itens]
    itens[idx] = { ...itens[idx], [field]: val, ordem: idx + 1 }
    return { ...m, itens }
  })

  const addItem = () => setModal(m => ({
    ...m,
    itens: [...m.itens, { ordem: m.itens.length + 1, descricao: '', quantidade: '1', valor_unitario: '' }],
  }))

  const removeItem = (idx) => setModal(m => {
    const itens = m.itens.filter((_, i) => i !== idx).map((it, i) => ({ ...it, ordem: i + 1 }))
    return { ...m, itens: itens.length ? itens : [{ ...ITEM_VAZIO }] }
  })

  const subtotalItens = (itens) =>
    itens.reduce((acc, i) => acc + (parseFloat(i.quantidade) || 0) * (parseFloat(i.valor_unitario) || 0), 0)

  const salvar = async () => {
    setSalvando(true); setErro(''); setSyncInfo(null)
    try {
      const payload = {
        cliente:         modal.tipoVinculo === 'cliente'   ? (modal.cliente   || null) : null,
        prospecto:       modal.tipoVinculo === 'prospecto' ? (modal.prospecto || null) : null,
        valido_ate:      modal.valido_ate,
        status:          modal.status,
        desconto:        modal.desconto,
        forma_pagamento: modal.forma_pagamento,
        observacoes:     modal.observacoes,
        itens:           modal.itens.filter(i => i.descricao.trim()),
      }
      let res
      if (editandoId) res = await api.patch('/orcamentos/' + editandoId + '/', payload)
      else            res = await api.post('/orcamentos/', payload)
      const synced = res.data.contratid_synced
      setSyncInfo({ ok: synced, id: res.data.contratid_orcamento_id })
      if (synced) setTimeout(() => { setModal(null); carregar(pagina) }, 1800)
      else carregar(pagina)
    } catch (e) {
      setErro(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const thS = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#a78bca', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'left' }
  const tdS = { padding: '10px 14px', fontSize: 13, color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.04)' }
  const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }

  const sub    = modal ? subtotalItens(modal.itens) : 0
  const desc   = modal ? (parseFloat(modal.desconto) || 0) : 0
  const totalG = sub - desc

  const tabBtn = (tipo, label) => ({
    background:   modal?.tipoVinculo === tipo ? '#063BF8' : 'rgba(255,255,255,0.06)',
    color:        modal?.tipoVinculo === tipo ? '#fff'    : '#a78bca',
    border:       'none',
    borderRadius: tipo === 'cliente' ? '8px 0 0 8px' : '0 8px 8px 0',
    padding:      '8px 20px',
    fontSize:     13,
    fontWeight:   600,
    cursor:       'pointer',
    flex:         1,
  })

  return (
    <SistemaLayout titulo="Orçamentos">
      <div style={{ padding: '24px 28px', maxWidth: 1300, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Orçamentos</h1>
            <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>{total} orçamento{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={abrirNovo}
            style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Novo Orçamento
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['', 'rascunho', 'enviado', 'aprovado', 'recusado', 'expirado'].map(s => (
            <button key={s} onClick={() => { setFiltroStatus(s); setPagina(1); carregar(1, s) }}
              style={{ background: filtroStatus === s ? '#063BF8' : 'rgba(255,255,255,0.06)', color: filtroStatus === s ? '#fff' : '#a78bca', border: 'none', borderRadius: 20, padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}>
              {s ? STATUS_LABELS[s] : 'Todos'}
            </button>
          ))}
        </div>

        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nº', 'Origem', 'Válido até', 'Itens', 'Total', 'Status', 'ContratID', 'Ações'].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={8} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Carregando...</td></tr>
              ) : orcamentos.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Nenhum orçamento encontrado</td></tr>
              ) : orcamentos.map(o => {
                const nomeOrigem = o.cliente_nome || o.prospecto_nome || '—'
                const tipoLabel  = o.prospecto ? <span style={{ fontSize: 10, color: '#a78bca', marginLeft: 5 }}>(prospecto)</span> : null
                return (
                  <tr key={o.id}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,59,248,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdS, fontWeight: 700, color: '#a78bca' }}>#{o.numero}</td>
                    <td style={tdS}>{nomeOrigem}{tipoLabel}</td>
                    <td style={tdS}>{o.valido_ate ? new Date(o.valido_ate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td style={{ ...tdS, textAlign: 'center' }}>{o.itens ? o.itens.length : 0}</td>
                    <td style={{ ...tdS, fontWeight: 600 }}>{fmt(o.total_geral)}</td>
                    <td style={tdS}><Badge status={o.status} /></td>
                    <td style={tdS}>
                      {o.contratid_synced
                        ? <span style={{ color: '#34d399', fontSize: 12 }}>✓ Sincronizado</span>
                        : <span style={{ color: '#fbbf24', fontSize: 12 }}>⏳ Pendente</span>}
                    </td>
                    <td style={tdS}>
                      <button onClick={() => abrirEditar(o)}
                        style={{ background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                        Editar
                      </button>
                      <button onClick={() => excluir(o.id)}
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => { setPagina(p); carregar(p) }}
                  style={{ background: p === pagina ? '#063BF8' : 'rgba(255,255,255,0.06)', color: p === pagina ? '#fff' : '#a78bca', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 13 }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 820, padding: 28, maxHeight: '92vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {editandoId ? 'Editar Orçamento' : 'Novo Orçamento'}
            </h2>

            {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 8 }}>{erro}</p>}

            {syncInfo && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: syncInfo.ok ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: '1px solid ' + (syncInfo.ok ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'), color: syncInfo.ok ? '#34d399' : '#fbbf24', fontSize: 13 }}>
                {syncInfo.ok ? '✓ Sincronizado com ContratID (ID #' + syncInfo.id + ')' : '⚠ Salvo localmente — falha na sincronização com ContratID'}
              </div>
            )}

            {/* Toggle Cliente / Prospecto */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vincular a</label>
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={() => setModal(m => ({ ...m, tipoVinculo: 'cliente', prospecto: '' }))}
                  style={tabBtn('cliente', 'Cliente')}>
                  👥 Cliente
                </button>
                <button onClick={() => setModal(m => ({ ...m, tipoVinculo: 'prospecto', cliente: '' }))}
                  style={tabBtn('prospecto', 'Prospecto')}>
                  🔍 Prospecto
                </button>
              </div>
            </div>

            {/* Select dinâmico */}
            {modal.tipoVinculo === 'cliente' ? (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Cliente</label>
                <select value={modal.cliente} onChange={e => setModal(m => ({ ...m, cliente: e.target.value }))} style={inputStyle}>
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Prospecto</label>
                <select value={modal.prospecto} onChange={e => setModal(m => ({ ...m, prospecto: e.target.value }))} style={inputStyle}>
                  <option value="">Selecione um prospecto...</option>
                  {prospectos.map(p => <option key={p.id} value={p.id}>{p.nome_empresa}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Válido até *</label>
                <input type="date" value={modal.valido_ate} onChange={e => setModal(m => ({ ...m, valido_ate: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Status</label>
                <select value={modal.status} onChange={e => setModal(m => ({ ...m, status: e.target.value }))} style={inputStyle}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Forma de pagamento</label>
                <input type="text" value={modal.forma_pagamento} onChange={e => setModal(m => ({ ...m, forma_pagamento: e.target.value }))} placeholder="Ex: PIX, boleto, 12x cartão..." style={inputStyle} />
              </div>
            </div>

            {/* Itens */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#a78bca', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Itens</label>
                <button onClick={addItem}
                  style={{ background: 'rgba(6,59,248,0.2)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
                  + Adicionar item
                </button>
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {['#', 'Descrição', 'Qtd', 'Valor Unit.', 'Subtotal', ''].map((h, i) => (
                        <th key={i} style={{ padding: '8px 10px', fontSize: 10, color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i >= 2 && i <= 4 ? 'right' : 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modal.itens.map((item, idx) => {
                      const st = (parseFloat(item.quantidade) || 0) * (parseFloat(item.valor_unitario) || 0)
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '6px 10px', color: '#6b6b8a', fontSize: 12, width: 28 }}>{idx + 1}</td>
                          <td style={{ padding: '4px 6px' }}>
                            <input value={item.descricao} onChange={e => setItem(idx, 'descricao', e.target.value)}
                              placeholder="Descrição do serviço/produto"
                              style={{ ...inputStyle, padding: '6px 10px', fontSize: 12 }} />
                          </td>
                          <td style={{ padding: '4px 6px', width: 70 }}>
                            <input type="number" value={item.quantidade} onChange={e => setItem(idx, 'quantidade', e.target.value)}
                              style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '4px 6px', width: 130 }}>
                            <input type="number" value={item.valor_unitario} onChange={e => setItem(idx, 'valor_unitario', e.target.value)}
                              placeholder="0,00"
                              style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '6px 10px', fontSize: 12, color: '#e2d9f3', textAlign: 'right', whiteSpace: 'nowrap', width: 110 }}>{fmt(st)}</td>
                          <td style={{ padding: '4px 6px', width: 32 }}>
                            <button onClick={() => removeItem(idx)}
                              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, padding: 4 }}>×</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totais */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <div style={{ width: 280, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#a78bca' }}>
                  <span>Subtotal</span><span style={{ color: '#e2e8f0' }}>{fmt(sub)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#a78bca' }}>Desconto (R$)</span>
                  <input type="number" value={modal.desconto} onChange={e => setModal(m => ({ ...m, desconto: e.target.value }))}
                    style={{ ...inputStyle, width: 110, padding: '4px 8px', fontSize: 13, textAlign: 'right' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, fontSize: 15, fontWeight: 700 }}>
                  <span style={{ color: '#f1f5f9' }}>Total</span>
                  <span style={{ color: '#34d399' }}>{fmt(totalG)}</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: '#a78bca', marginBottom: 4, display: 'block' }}>Observações</label>
              <textarea value={modal.observacoes} rows={3}
                onChange={e => setModal(m => ({ ...m, observacoes: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : 'Salvar e Sincronizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
