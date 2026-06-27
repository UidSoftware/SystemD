import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'

const IS = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13,
  outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
}
const thS = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#a78bca', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'left' }
const tdS = { padding: '10px 14px', fontSize: 13, color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.04)' }
const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }

function Fld({ label, required, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: '#a78bca', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#f87171', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const TIPOS = [
  { key: 'SERVICO', label: 'Serviço', emoji: '⚙️' },
  { key: 'PRODUTO', label: 'Produto', emoji: '📦' },
]
const UNIDADES = [
  { key: 'UN',      label: 'Unidade'  },
  { key: 'HORA',    label: 'Hora'     },
  { key: 'MES',     label: 'Mês'      },
  { key: 'PROJETO', label: 'Projeto'  },
  { key: 'LICENCA', label: 'Licença'  },
  { key: 'GB',      label: 'GB'       },
  { key: 'DIA',     label: 'Dia'      },
]
const TIPO_CORES = {
  SERVICO: { bg: 'rgba(6,59,248,0.15)',   color: '#6b8fff' },
  PRODUTO: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
}
const CATEGORIAS = {
  SERVICO: ['Desenvolvimento', 'Design', 'Manutenção', 'Consultoria', 'Suporte', 'Hospedagem', 'Outro'],
  PRODUTO: ['Software', 'Licença', 'Hardware', 'Material', 'Outro'],
}

function fmt(val) {
  return (parseFloat(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const FORM_VAZIO = {
  nome: '', tipo: 'SERVICO', categoria: '', descricao: '',
  unidade: 'UN', preco_padrao: '', preco_minimo: '',
}

export default function ProdutosPage() {
  const [lista, setLista]               = useState([])
  const [total, setTotal]               = useState(0)
  const [carregando, setCarregando]     = useState(true)
  const [pagina, setPagina]             = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [busca, setBusca]               = useState('')
  const [modal, setModal]               = useState(null)
  const [editandoId, setEditandoId]     = useState(null)
  const [salvando, setSalvando]         = useState(false)
  const [erro, setErro]                 = useState('')

  const carregar = useCallback(async (pag = 1, tipo = filtroTipo, q = busca) => {
    setCarregando(true)
    try {
      const params = { page: pag, todos: 1 }
      if (tipo) params.tipo   = tipo
      if (q)    params.search = q
      const res = await api.get('/produtos/', { params })
      setLista(res.data.results)
      setTotal(res.data.count)
      setTotalPaginas(Math.ceil(res.data.count / 20))
    } finally { setCarregando(false) }
  }, [filtroTipo, busca])

  useEffect(() => { carregar() }, [])

  const abrirNovo = () => { setEditandoId(null); setModal({ ...FORM_VAZIO }); setErro('') }

  const abrirEditar = (p) => {
    setEditandoId(p.id)
    setModal({ nome: p.nome || '', tipo: p.tipo || 'SERVICO', categoria: p.categoria || '',
      descricao: p.descricao || '', unidade: p.unidade || 'UN',
      preco_padrao: p.preco_padrao || '', preco_minimo: p.preco_minimo || '' })
    setErro('')
  }

  const excluir = async (id) => {
    if (!window.confirm('Desativar este item do catálogo?')) return
    await api.delete('/produtos/' + id + '/')
    carregar(pagina)
  }

  const set = (k, v) => setModal(m => ({ ...m, [k]: v }))

  const salvar = async () => {
    if (!modal.nome)         { setErro('Preencha o nome.'); return }
    if (!modal.preco_padrao) { setErro('Preencha o preço padrão.'); return }
    setSalvando(true); setErro('')
    try {
      const payload = { ...modal, preco_minimo: modal.preco_minimo || null }
      if (editandoId) await api.patch('/produtos/' + editandoId + '/', payload)
      else            await api.post('/produtos/', payload)
      setModal(null); carregar(pagina)
    } catch (e) {
      setErro(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const unLabel = (key) => UNIDADES.find(u => u.key === key)?.label || key

  return (
    <SistemaLayout titulo="Produtos e Serviços">
      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Produtos e Serviços</h1>
            <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>{total} item{total !== 1 ? 'ns' : ''} no catálogo</p>
          </div>
          <button onClick={abrirNovo}
            style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Novo Item
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {[{ key: '', label: 'Todos' }, ...TIPOS].map(t => (
            <button key={t.key} onClick={() => { setFiltroTipo(t.key); setPagina(1); carregar(1, t.key, busca) }}
              style={{ background: filtroTipo === t.key ? '#063BF8' : 'rgba(255,255,255,0.06)', color: filtroTipo === t.key ? '#fff' : '#a78bca', border: 'none', borderRadius: 20, padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <input placeholder="Buscar por nome, categoria..." value={busca}
              onChange={e => setBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && carregar(1, filtroTipo, busca)}
              style={{ ...IS, width: 240, padding: '6px 12px' }} />
            <button onClick={() => carregar(1, filtroTipo, busca)}
              style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Buscar
            </button>
          </div>
        </div>

        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Tipo', 'Nome', 'Categoria', 'Unidade', 'Preço Padrão', 'Preço Mínimo', 'Status', 'Ações'].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={8} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Carregando...</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Nenhum item no catálogo</td></tr>
              ) : lista.map(p => {
                const tc = TIPO_CORES[p.tipo] || TIPO_CORES.SERVICO
                return (
                  <tr key={p.id}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(6,59,248,0.05)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <td style={tdS}>
                      <span style={{ background: tc.bg, color: tc.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                        {p.tipo_display}
                      </span>
                    </td>
                    <td style={{ ...tdS, fontWeight: 600 }}>{p.nome}</td>
                    <td style={{ ...tdS, color: '#94a3b8' }}>{p.categoria || '—'}</td>
                    <td style={{ ...tdS, color: '#a78bca', fontSize: 12 }}>{unLabel(p.unidade)}</td>
                    <td style={{ ...tdS, fontWeight: 600, color: '#34d399' }}>{fmt(p.preco_padrao)}</td>
                    <td style={{ ...tdS, color: '#94a3b8' }}>{p.preco_minimo ? fmt(p.preco_minimo) : '—'}</td>
                    <td style={tdS}>
                      {p.ativo
                        ? <span style={{ color: '#34d399', fontSize: 12 }}>● Ativo</span>
                        : <span style={{ color: '#64748b', fontSize: 12 }}>○ Inativo</span>}
                    </td>
                    <td style={tdS}>
                      <button onClick={() => abrirEditar(p)}
                        style={{ background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                        Editar
                      </button>
                      <button onClick={() => excluir(p.id)}
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                        Desativar
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

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 620, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {editandoId ? 'Editar Item' : 'Novo Produto / Serviço'}
            </h2>

            {erro && <div style={{ background: 'rgba(248,71,71,0.1)', border: '1px solid rgba(248,71,71,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>{erro}</div>}

            {/* Toggle Produto / Serviço */}
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 18 }}>
              {TIPOS.map((t, i) => (
                <button key={t.key} onClick={() => set('tipo', t.key)} style={{
                  flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: modal.tipo === t.key ? '#063BF8' : 'rgba(255,255,255,0.04)',
                  color:      modal.tipo === t.key ? '#fff'    : '#a78bca',
                  borderRadius: i === 0 ? '8px 0 0 8px' : '0 8px 8px 0',
                }}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Fld label="Nome" required>
                <input style={IS} value={modal.nome} onChange={e => set('nome', e.target.value)}
                  placeholder="ex: Desenvolvimento de Sistema" />
              </Fld>

              <Fld label="Categoria">
                <input style={IS} list="cat-list" value={modal.categoria}
                  onChange={e => set('categoria', e.target.value)} placeholder="ex: Desenvolvimento" />
                <datalist id="cat-list">
                  {(CATEGORIAS[modal.tipo] || []).map(c => <option key={c} value={c} />)}
                </datalist>
              </Fld>

              <Fld label="Unidade de medida">
                <select style={IS} value={modal.unidade} onChange={e => set('unidade', e.target.value)}>
                  {UNIDADES.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
                </select>
              </Fld>

              <div />

              <Fld label="Preço padrão (R$)" required>
                <input type="number" step="0.01" min="0" style={IS} value={modal.preco_padrao}
                  onChange={e => set('preco_padrao', e.target.value)} placeholder="0,00" />
              </Fld>

              <Fld label="Preço mínimo (R$)">
                <input type="number" step="0.01" min="0" style={IS} value={modal.preco_minimo}
                  onChange={e => set('preco_minimo', e.target.value)} placeholder="Limite de desconto" />
              </Fld>

              <div style={{ gridColumn: '1 / -1' }}>
                <Fld label="Descrição técnica">
                  <textarea rows={3} style={{ ...IS, resize: 'vertical', lineHeight: 1.6 }}
                    value={modal.descricao} onChange={e => set('descricao', e.target.value)}
                    placeholder="Detalhes que aparecem no orçamento / contrato" />
                </Fld>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setModal(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Criar Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
