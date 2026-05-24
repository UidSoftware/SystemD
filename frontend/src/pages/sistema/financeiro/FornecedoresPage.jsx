import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, inputStyle, Spinner, Vazio, ModalBase, BotoesModal } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const formVazio = { forn_nome_empresa: '', forn_nome_dono: '', forn_cnpj: '', forn_endereco: '', forn_telefone: '', forn_email: '', forn_ativo: true }

const btnEditar = { background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }
const btnDesativar = { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }

export default function FornecedoresPage() {
  const [dados, setDados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    financeiroApi.listarFornecedores({ search: busca || undefined })
      .then(r => setDados(r.data.results ?? r.data))
      .catch(() => setDados([]))
      .finally(() => setCarregando(false))
  }, [busca])

  useEffect(() => { carregar() }, [carregar])

  const abrirNovo = () => { setEditando(null); setForm(formVazio); setErro(''); setModal(true) }
  const abrirEdicao = (c) => { setEditando(c); setForm({ forn_nome_empresa: c.forn_nome_empresa, forn_nome_dono: c.forn_nome_dono || '', forn_cnpj: c.forn_cnpj || '', forn_endereco: c.forn_endereco || '', forn_telefone: c.forn_telefone || '', forn_email: c.forn_email || '', forn_ativo: c.forn_ativo }); setErro(''); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.forn_nome_empresa) { setErro('Nome é obrigatório.'); return }
    setSalvando(true); setErro('')
    try {
      if (editando) await financeiroApi.editarFornecedor(editando.forn_id, form)
      else await financeiroApi.criarFornecedor(form)
      setModal(false); carregar()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const deletar = async (c) => {
    if (!confirm(`Desativar "${c.forn_nome_empresa}"?`)) return
    await financeiroApi.deletarFornecedor(c.forn_id); carregar()
  }

  const colunas = [
    { key: 'forn_nome_empresa', label: 'Empresa' },
    { key: 'forn_cnpj', label: 'CNPJ', muted: true },
    { key: 'forn_telefone', label: 'Telefone', muted: true },
    { key: 'forn_email', label: 'E-mail', muted: true },
    { key: 'forn_ativo', label: 'Status', render: r => (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: r.forn_ativo ? '#10b98122' : '#FF000022', color: r.forn_ativo ? '#10b981' : '#FF0000' }}>
        {r.forn_ativo ? 'Ativo' : 'Inativo'}
      </span>
    )},
    { key: '_acoes', label: 'Ações', render: r => (
      <div className="flex gap-2">
        <button onClick={e => { e.stopPropagation(); abrirEdicao(r) }} style={btnEditar}>Editar</button>
        {r.forn_ativo && <button onClick={e => { e.stopPropagation(); deletar(r) }} style={btnDesativar}>Desativar</button>}
      </div>
    )},
  ]

  return (
    <SistemaLayout titulo="Fornecedores">
      <div className="p-6">
        <div className="flex gap-3 mb-5 items-center">
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="flex-1" style={inputStyle} />
          <button onClick={abrirNovo} className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap" style={{ backgroundColor: '#063BF8', color: '#fff' }}>+ Novo fornecedor</button>
        </div>
        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados.map(d => ({ ...d, id: d.forn_id }))} />}
      </div>

      {modal && (
        <ModalBase titulo={editando ? 'Editar fornecedor' : 'Novo fornecedor'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Razão social *', field: 'forn_nome_empresa', placeholder: 'Nome da empresa' },
              { label: 'Responsável', field: 'forn_nome_dono', placeholder: '' },
              { label: 'CNPJ', field: 'forn_cnpj', placeholder: '00.000.000/0001-00' },
              { label: 'Telefone', field: 'forn_telefone', placeholder: '' },
              { label: 'E-mail', field: 'forn_email', placeholder: '' },
              { label: 'Endereço', field: 'forn_endereco', placeholder: '' },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>{label}</label>
                <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={inputStyle} placeholder={placeholder} />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold" style={{ color: '#a78bca' }}>Ativo</label>
              <button type="button" onClick={() => setForm(f => ({ ...f, forn_ativo: !f.forn_ativo }))}
                className="w-10 h-5 rounded-full transition-colors relative" style={{ backgroundColor: form.forn_ativo ? '#063BF8' : 'rgba(255,255,255,0.1)' }}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.forn_ativo ? '22px' : '2px' }} />
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
