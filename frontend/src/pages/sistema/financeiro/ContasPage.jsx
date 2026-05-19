import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const TIPOS = { corrente: 'Conta Corrente', poupanca: 'Poupança', caixa: 'Caixa Físico' }
const formVazio = { cont_nome: '', cont_tipo: 'corrente', cont_saldo_inicial: '', cont_ativo: true }

const btnEditar = { background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer', flex: 1 }
const btnDesativar = { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer', flex: 1 }

export default function ContasPage() {
  const [dados, setDados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    financeiroApi.listarContas()
      .then(r => setDados(r.data.results ?? r.data))
      .catch(() => setDados([]))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const abrirNovo = () => { setEditando(null); setForm(formVazio); setErro(''); setModal(true) }
  const abrirEdicao = (c) => { setEditando(c); setForm({ cont_nome: c.cont_nome, cont_tipo: c.cont_tipo, cont_saldo_inicial: c.cont_saldo_inicial, cont_ativo: c.cont_ativo }); setErro(''); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.cont_nome) { setErro('Nome é obrigatório.'); return }
    setSalvando(true); setErro('')
    try {
      if (editando) await financeiroApi.editarConta(editando.cont_id, form)
      else await financeiroApi.criarConta(form)
      setModal(false); carregar()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const deletar = async (c) => {
    if (!confirm(`Desativar conta "${c.cont_nome}"?`)) return
    await financeiroApi.deletarConta(c.cont_id); carregar()
  }

  const colunas = [
    { key: 'cont_nome', label: 'Nome' },
    { key: 'cont_tipo', label: 'Tipo', render: r => TIPOS[r.cont_tipo] || r.cont_tipo, muted: true },
    { key: 'cont_saldo_inicial', label: 'Saldo inicial', render: r => formatMoeda(r.cont_saldo_inicial), muted: true },
    { key: 'cont_ativo', label: 'Status', render: r => (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: r.cont_ativo ? '#10b98122' : '#FF000022', color: r.cont_ativo ? '#10b981' : '#FF0000' }}>
        {r.cont_ativo ? 'Ativa' : 'Inativa'}
      </span>
    )},
    { key: '_acoes', label: 'Ações', render: r => (
      <div className="flex gap-2 w-full">
        <button onClick={e => { e.stopPropagation(); abrirEdicao(r) }} style={btnEditar}>Editar</button>
        {r.cont_ativo && <button onClick={e => { e.stopPropagation(); deletar(r) }} style={btnDesativar}>Desativar</button>}
      </div>
    )},
  ]

  return (
    <SistemaLayout titulo="Contas Bancárias">
      <div className="p-6">
        <div className="flex justify-end mb-5">
          <button onClick={abrirNovo} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#063BF8', color: '#fff' }}>
            + Nova conta
          </button>
        </div>
        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados.map(d => ({ ...d, id: d.cont_id }))} />}
      </div>

      {modal && (
        <ModalBase titulo={editando ? 'Editar conta' : 'Nova conta'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Nome *</label>
              <input value={form.cont_nome} onChange={e => setForm(f => ({ ...f, cont_nome: e.target.value }))} style={inputStyle} placeholder="Ex: Bradesco Corrente" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Tipo</label>
              <select value={form.cont_tipo} onChange={e => setForm(f => ({ ...f, cont_tipo: e.target.value }))} style={inputStyle}>
                {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Saldo inicial (R$)</label>
              <input type="number" step="0.01" value={form.cont_saldo_inicial} onChange={e => setForm(f => ({ ...f, cont_saldo_inicial: e.target.value }))} style={inputStyle} placeholder="0,00" />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold" style={{ color: '#a78bca' }}>Ativa</label>
              <button type="button" onClick={() => setForm(f => ({ ...f, cont_ativo: !f.cont_ativo }))}
                className="w-10 h-5 rounded-full transition-colors relative"
                style={{ backgroundColor: form.cont_ativo ? '#063BF8' : 'rgba(255,255,255,0.1)' }}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.cont_ativo ? '22px' : '2px' }} />
              </button>
            </div>
            {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
            <BotoesModal onCancel={() => setModal(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}
    </SistemaLayout>
  )
}
