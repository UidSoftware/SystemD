import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const formVazio = { serv_nome: '', serv_descricao: '', serv_valor_base: '', serv_ativo: true }

const btnEditar = { background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }
const btnDesativar = { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }

export default function ServicosPage() {
  const [dados, setDados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    financeiroApi.listarServicos()
      .then(r => setDados(r.data.results ?? r.data))
      .catch(() => setDados([]))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const abrirNovo = () => { setEditando(null); setForm(formVazio); setErro(''); setModal(true) }
  const abrirEdicao = (s) => { setEditando(s); setForm({ serv_nome: s.serv_nome, serv_descricao: s.serv_descricao || '', serv_valor_base: s.serv_valor_base, serv_ativo: s.serv_ativo }); setErro(''); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.serv_nome || !form.serv_valor_base) { setErro('Nome e valor são obrigatórios.'); return }
    setSalvando(true); setErro('')
    try {
      if (editando) await financeiroApi.editarServico(editando.serv_id, form)
      else await financeiroApi.criarServico(form)
      setModal(false); carregar()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const deletar = async (s) => {
    if (!confirm(`Desativar "${s.serv_nome}"?`)) return
    await financeiroApi.deletarServico(s.serv_id); carregar()
  }

  const colunas = [
    { key: 'serv_nome', label: 'Nome' },
    { key: 'serv_descricao', label: 'Descrição', muted: true },
    { key: 'serv_valor_base', label: 'Valor base', render: r => formatMoeda(r.serv_valor_base) },
    { key: 'serv_ativo', label: 'Status', render: r => (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: r.serv_ativo ? '#10b98122' : '#FF000022', color: r.serv_ativo ? '#10b981' : '#FF0000' }}>
        {r.serv_ativo ? 'Ativo' : 'Inativo'}
      </span>
    )},
    { key: '_acoes', label: 'Ações', render: r => (
      <div className="flex gap-2">
        <button onClick={e => { e.stopPropagation(); abrirEdicao(r) }} style={btnEditar}>Editar</button>
        {r.serv_ativo && <button onClick={e => { e.stopPropagation(); deletar(r) }} style={btnDesativar}>Desativar</button>}
      </div>
    )},
  ]

  return (
    <SistemaLayout titulo="Serviços">
      <div className="p-6">
        <div className="flex justify-end mb-5">
          <button onClick={abrirNovo} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#063BF8', color: '#fff' }}>+ Novo serviço</button>
        </div>
        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados.map(d => ({ ...d, id: d.serv_id }))} />}
      </div>

      {modal && (
        <ModalBase titulo={editando ? 'Editar serviço' : 'Novo serviço'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Nome *</label>
              <input value={form.serv_nome} onChange={e => setForm(f => ({ ...f, serv_nome: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Descrição</label>
              <textarea value={form.serv_descricao} onChange={e => setForm(f => ({ ...f, serv_descricao: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Valor base *</label>
              <input type="number" step="0.01" value={form.serv_valor_base} onChange={e => setForm(f => ({ ...f, serv_valor_base: e.target.value }))} style={inputStyle} placeholder="0,00" />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold" style={{ color: '#a78bca' }}>Ativo</label>
              <button type="button" onClick={() => setForm(f => ({ ...f, serv_ativo: !f.serv_ativo }))}
                className="w-10 h-5 rounded-full transition-colors relative" style={{ backgroundColor: form.serv_ativo ? '#063BF8' : 'rgba(255,255,255,0.1)' }}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.serv_ativo ? '22px' : '2px' }} />
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
