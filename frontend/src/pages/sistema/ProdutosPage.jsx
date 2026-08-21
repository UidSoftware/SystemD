import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'
import { ModalConfirmar } from '../../components/sistema/FinanceiroTable'

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
  { key: 'PT',      label: 'Pacote'   },
  { key: 'CX',      label: 'Caixa'    },
  { key: 'KG',      label: 'Quilograma' },
  { key: 'L',       label: 'Litro'    },
  { key: 'M',       label: 'Metro'    },
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
  codigo_barras: '', estoque_minimo: '',
}

export default function ProdutosPage() {
  const [lista, setLista]               = useState([])
  const [modalConfirmar, setModalConfirmar] = useState(null)
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

  // Combos
  const [combos, setCombos]             = useState([])
  const [carregandoCombos, setCarregandoCombos] = useState(true)
  const [produtosCombo, setProdutosCombo] = useState([])
  const [modalCombo, setModalCombo]     = useState(null)
  const [editandoComboId, setEditandoComboId] = useState(null)
  const [salvandoCombo, setSalvandoCombo] = useState(false)
  const [erroCombo, setErroCombo]       = useState('')

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

  useEffect(() => { carregar(); carregarCombos() }, [])

  const abrirNovo = () => { setEditandoId(null); setModal({ ...FORM_VAZIO }); setErro('') }

  const abrirEditar = (p) => {
    setEditandoId(p.id)
    setModal({ nome: p.nome || '', tipo: p.tipo || 'SERVICO', categoria: p.categoria || '',
      descricao: p.descricao || '', unidade: p.unidade || 'UN',
      preco_padrao: p.preco_padrao || '', preco_minimo: p.preco_minimo || '',
      codigo_barras: p.codigo_barras || '', estoque_minimo: p.estoque_minimo || '',
      quantidade_estoque: p.quantidade_estoque })
    setErro('')
  }

  const [modalEntrada, setModalEntrada] = useState(null)
  const abrirEntrada = (p) => setModalEntrada({ produto: p, quantidade: '', unidade: p.unidade, nota_fiscal: '' })
  const salvarEntrada = async () => {
    if (!modalEntrada.quantidade) { return }
    try {
      await api.post('/entradas-estoque/', {
        produto: modalEntrada.produto.id,
        quantidade: modalEntrada.quantidade,
        unidade: modalEntrada.unidade,
        nota_fiscal: modalEntrada.nota_fiscal,
      })
      setModalEntrada(null)
      carregar(pagina)
    } catch (e) {
      alert(e.response?.data?.detail || 'Erro ao registrar entrada de estoque.')
    }
  }

  const excluir = async (id) => {
    setModalConfirmar({ msg: 'Desativar este item do catálogo?', onConfirm: async () => { await api.delete('/produtos/' + id + '/'); carregar(pagina) } })
  }

  const set = (k, v) => setModal(m => ({ ...m, [k]: v }))

  // ---------- Combos ----------

  const carregarCombos = useCallback(async () => {
    setCarregandoCombos(true)
    try {
      let pag = 1, all = []
      while (true) {
        const res = await api.get('/combos/', { params: { page: pag } })
        all = all.concat(res.data.results)
        if (!res.data.next) break
        pag++
      }
      setCombos(all)
    } finally { setCarregandoCombos(false) }
  }, [])

  const carregarProdutosParaCombo = async () => {
    let pag = 1, all = []
    while (true) {
      const res = await api.get('/produtos/', { params: { page: pag } })
      all = all.concat(res.data.results)
      if (!res.data.next) break
      pag++
    }
    setProdutosCombo(all)
  }

  const abrirNovoCombo = () => {
    setEditandoComboId(null)
    setModalCombo({ nome: '', descricao: '', itens: [] })
    setErroCombo('')
    if (produtosCombo.length === 0) carregarProdutosParaCombo()
  }

  const abrirEditarCombo = (c) => {
    setEditandoComboId(c.id)
    setModalCombo({
      nome: c.nome || '',
      descricao: c.descricao || '',
      itens: (c.itens || []).map(it => ({ produto: it.produto, quantidade: it.quantidade, valor_unitario: it.valor_unitario })),
    })
    setErroCombo('')
    if (produtosCombo.length === 0) carregarProdutosParaCombo()
  }

  const adicionarItem = () => setModalCombo(m => ({ ...m, itens: [...m.itens, { produto: '', quantidade: '1', valor_unitario: '' }] }))

  const removerItem = (i) => setModalCombo(m => ({ ...m, itens: m.itens.filter((_, idx) => idx !== i) }))

  const atualizarItem = (i, campo, valor) => {
    setModalCombo(m => {
      const itens = [...m.itens]
      itens[i] = { ...itens[i], [campo]: valor }
      if (campo === 'produto') {
        const p = produtosCombo.find(pr => String(pr.id) === String(valor))
        if (p) itens[i].valor_unitario = p.preco_padrao
      }
      return { ...m, itens }
    })
  }

  const valorTotalItens = (itens) => (itens || []).reduce(
    (acc, it) => acc + (parseFloat(it.quantidade) || 0) * (parseFloat(it.valor_unitario) || 0), 0,
  )

  const excluirCombo = (id) => {
    setModalConfirmar({ msg: 'Desativar este combo?', onConfirm: async () => { await api.delete('/combos/' + id + '/'); carregarCombos() } })
  }

  const salvarCombo = async () => {
    if (!modalCombo.nome) { setErroCombo('Preencha o nome do combo.'); return }
    if (!modalCombo.itens.length) { setErroCombo('Adicione pelo menos 1 produto ao combo.'); return }
    for (const it of modalCombo.itens) {
      if (!it.produto) { setErroCombo('Selecione um produto em todas as linhas.'); return }
      if (!(parseFloat(it.quantidade) > 0)) { setErroCombo('Quantidade de cada item deve ser maior que zero.'); return }
    }
    setSalvandoCombo(true); setErroCombo('')
    try {
      const payload = {
        nome: modalCombo.nome,
        descricao: modalCombo.descricao,
        itens: modalCombo.itens.map(it => ({
          produto: it.produto,
          quantidade: it.quantidade,
          valor_unitario: it.valor_unitario || 0,
        })),
      }
      if (editandoComboId) await api.patch('/combos/' + editandoComboId + '/', payload)
      else                 await api.post('/combos/', payload)
      setModalCombo(null); carregarCombos()
    } catch (e) {
      setErroCombo(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Erro ao salvar combo.')
    } finally { setSalvandoCombo(false) }
  }

  const salvar = async () => {
    if (!modal.nome)         { setErro('Preencha o nome.'); return }
    if (!modal.preco_padrao) { setErro('Preencha o preço padrão.'); return }
    setSalvando(true); setErro('')
    try {
      const { quantidade_estoque, ...resto } = modal
      const payload = { ...resto, preco_minimo: modal.preco_minimo || null, estoque_minimo: modal.estoque_minimo || 0 }
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
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={abrirNovo}
              style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Novo Item
            </button>
            <button onClick={abrirNovoCombo}
              style={{ background: 'transparent', border: '1px solid #063BF8', color: '#6b8fff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              🎁 Combo
            </button>
          </div>
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
                {['Tipo', 'Nome', 'Categoria', 'Unidade', 'Estoque', 'Preço Padrão', 'Preço Mínimo', 'Status', 'Ações'].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={9} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Carregando...</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={9} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Nenhum item no catálogo</td></tr>
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
                    <td style={tdS}>
                      {p.tipo !== 'PRODUTO' ? <span style={{ color: '#64748b' }}>—</span> : (
                        <span style={{ color: parseFloat(p.quantidade_estoque) <= parseFloat(p.estoque_minimo) ? '#f87171' : '#e2e8f0', fontWeight: 600 }}>
                          {parseFloat(p.quantidade_estoque).toLocaleString('pt-BR')} {unLabel(p.unidade)}
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdS, fontWeight: 600, color: '#34d399' }}>{fmt(p.preco_padrao)}</td>
                    <td style={{ ...tdS, color: '#94a3b8' }}>{p.preco_minimo ? fmt(p.preco_minimo) : '—'}</td>
                    <td style={tdS}>
                      {p.ativo
                        ? <span style={{ color: '#34d399', fontSize: 12 }}>● Ativo</span>
                        : <span style={{ color: '#64748b', fontSize: 12 }}>○ Inativo</span>}
                    </td>
                    <td style={tdS}>
                      {p.tipo === 'PRODUTO' && (
                        <button onClick={() => abrirEntrada(p)}
                          style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                          + Estoque
                        </button>
                      )}
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

        {/* Combos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 0 16px' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Combos</h2>
            <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>{combos.length} combo{combos.length !== 1 ? 's' : ''} cadastrado{combos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Combos — desktop */}
        <div style={card} className="hidden md:block">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Data', 'Nome', 'Valor', 'Ações'].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregandoCombos ? (
                <tr><td colSpan={4} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Carregando...</td></tr>
              ) : combos.length === 0 ? (
                <tr><td colSpan={4} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Nenhum combo cadastrado</td></tr>
              ) : combos.map(c => (
                <tr key={c.id}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(6,59,248,0.05)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...tdS, color: '#94a3b8' }}>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td style={{ ...tdS, fontWeight: 600 }}>{c.nome}</td>
                  <td style={{ ...tdS, fontWeight: 600, color: '#34d399' }}>{fmt(c.valor_total)}</td>
                  <td style={tdS}>
                    <button onClick={() => abrirEditarCombo(c)}
                      style={{ background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => excluirCombo(c.id)}
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                      🗑️ Desativar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Combos — mobile */}
        <div className="md:hidden flex flex-col gap-3">
          {carregandoCombos ? (
            <p style={{ textAlign: 'center', color: '#a78bca', padding: 24 }}>Carregando...</p>
          ) : combos.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#a78bca', padding: 24 }}>Nenhum combo cadastrado</p>
          ) : combos.map(c => (
            <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>{c.nome}</span>
                <span style={{ fontWeight: 700, color: '#34d399', fontSize: 14 }}>{fmt(c.valor_total)}</span>
              </div>
              <div style={{ color: '#a78bca', fontSize: 11, marginTop: 4 }}>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => abrirEditarCombo(c)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', fontSize: 12, cursor: 'pointer' }}>
                  ✏️ Editar
                </button>
                <button onClick={() => excluirCombo(c.id)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', fontSize: 12, cursor: 'pointer' }}>
                  🗑️ Desativar
                </button>
              </div>
            </div>
          ))}
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

              {modal.tipo === 'PRODUTO' && (
                <>
                  <Fld label="Código de barras">
                    <input style={IS} value={modal.codigo_barras}
                      onChange={e => set('codigo_barras', e.target.value)} placeholder="Opcional" />
                  </Fld>

                  <Fld label="Estoque mínimo">
                    <input type="number" step="0.001" min="0" style={IS} value={modal.estoque_minimo}
                      onChange={e => set('estoque_minimo', e.target.value)} placeholder="Alerta abaixo deste valor" />
                  </Fld>

                  {editandoId && (
                    <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#a78bca' }}>
                      Estoque atual: <strong style={{ color: '#e2e8f0' }}>{parseFloat(modal.quantidade_estoque || 0).toLocaleString('pt-BR')} {unLabel(modal.unidade)}</strong> — só muda via "+ Estoque" na listagem.
                    </div>
                  )}
                </>
              )}

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
      {/* Modal — Entrada de Estoque */}
      {modalEntrada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 420, padding: 28 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>+ Estoque</h2>
            <p style={{ color: '#a78bca', fontSize: 13, marginBottom: 18 }}>{modalEntrada.produto.nome} — atual: {parseFloat(modalEntrada.produto.quantidade_estoque).toLocaleString('pt-BR')} {unLabel(modalEntrada.produto.unidade)}</p>

            <Fld label="Quantidade" required>
              <input type="number" step="0.001" min="0" style={IS} value={modalEntrada.quantidade}
                onChange={e => setModalEntrada(m => ({ ...m, quantidade: e.target.value }))} placeholder="0" />
            </Fld>
            <Fld label="Unidade da entrada">
              <select style={IS} value={modalEntrada.unidade}
                onChange={e => setModalEntrada(m => ({ ...m, unidade: e.target.value }))}>
                {UNIDADES.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
              </select>
            </Fld>
            <Fld label="Nota fiscal">
              <input style={IS} value={modalEntrada.nota_fiscal}
                onChange={e => setModalEntrada(m => ({ ...m, nota_fiscal: e.target.value }))} placeholder="Opcional" />
            </Fld>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={() => setModalEntrada(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvarEntrada}
                style={{ background: '#34d399', color: '#052e1b', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Registrar entrada
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal — Combo */}
      {modalCombo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 205, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 620, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {editandoComboId ? 'Editar Combo' : 'Novo Combo'}
            </h2>

            {erroCombo && <div style={{ background: 'rgba(248,71,71,0.1)', border: '1px solid rgba(248,71,71,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>{erroCombo}</div>}

            <Fld label="Nome do Combo" required>
              <input style={IS} value={modalCombo.nome} onChange={e => setModalCombo(m => ({ ...m, nome: e.target.value }))}
                placeholder="ex: Combo Site + Hospedagem + Manutenção 1 ano" />
            </Fld>

            <Fld label="Descrição">
              <textarea rows={2} style={{ ...IS, resize: 'vertical', lineHeight: 1.6 }}
                value={modalCombo.descricao} onChange={e => setModalCombo(m => ({ ...m, descricao: e.target.value }))}
                placeholder="Detalhes que aparecem no orçamento (opcional)" />
            </Fld>

            <label style={{ display: 'block', fontSize: 11, color: '#a78bca', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Itens do Combo
            </label>

            {modalCombo.itens.length === 0 && (
              <p style={{ color: '#a78bca', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Adicione pelo menos 1 produto ao combo</p>
            )}

            {modalCombo.itens.map((it, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end">
                  <select style={IS} value={it.produto} onChange={e => atualizarItem(i, 'produto', e.target.value)}>
                    <option value="">Selecione um produto...</option>
                    {produtosCombo.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  <input type="number" step="0.001" min="0.001" style={IS} value={it.quantidade}
                    onChange={e => atualizarItem(i, 'quantidade', e.target.value)} placeholder="1" />
                  <input type="number" step="0.01" min="0" style={IS} value={it.valor_unitario}
                    onChange={e => atualizarItem(i, 'valor_unitario', e.target.value)} placeholder="0,00" />
                  <button onClick={() => removerItem(i)} title="Remover item"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 6, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    🗑️
                  </button>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 11, textAlign: 'right', marginTop: 2 }}>
                  {fmt((parseFloat(it.quantidade) || 0) * (parseFloat(it.valor_unitario) || 0))}
                </div>
              </div>
            ))}

            <button onClick={adicionarItem}
              style={{ width: '100%', background: 'transparent', border: '1px dashed rgba(107,143,255,0.4)', color: '#6b8fff', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              + Adicionar item
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: '#a78bca', fontSize: 13, fontWeight: 600 }}>Valor total do combo</span>
              <span style={{ color: '#34d399', fontSize: 20, fontWeight: 700 }}>{fmt(valorTotalItens(modalCombo.itens))}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setModalCombo(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvarCombo} disabled={salvandoCombo}
                style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvandoCombo ? 0.7 : 1 }}>
                {salvandoCombo ? 'Salvando...' : editandoComboId ? 'Salvar alterações' : 'Criar Combo'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ModalConfirmar config={modalConfirmar} onClose={() => setModalConfirmar(null)} />
    </SistemaLayout>
  )
}
