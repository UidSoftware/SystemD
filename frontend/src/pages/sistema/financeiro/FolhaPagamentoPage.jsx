import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const formVazio = {
  funcionario_nome: '', funcionario_id: '',
  folha_competencia: '', folha_salario_base: '', folha_descontos: '0',
  folha_valor_liquido: '', folha_observacoes: '',
}

const btnEditar = { background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer', flex: 1 }
const btnRemover = { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer', flex: 1 }

export default function FolhaPagamentoPage() {
  const [dados, setDados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    financeiroApi.listarFolha()
      .then(r => setDados(r.data.results ?? r.data))
      .catch(() => setDados([]))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const calcLiquido = (base, descontos) => {
    const b = Number(base) || 0
    const d = Number(descontos) || 0
    return (b - d).toFixed(2)
  }

  const abrirNovo = () => { setEditando(null); setForm(formVazio); setErro(''); setModal(true) }
  const abrirEdicao = (f) => {
    setEditando(f)
    setForm({ funcionario_nome: f.funcionario_nome, funcionario_id: f.funcionario_id || '', folha_competencia: f.folha_competencia?.slice(0, 7) || '', folha_salario_base: f.folha_salario_base, folha_descontos: f.folha_descontos || '0', folha_valor_liquido: f.folha_valor_liquido, folha_observacoes: f.folha_observacoes || '' })
    setErro(''); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.funcionario_nome || !form.folha_salario_base) { setErro('Nome e salário são obrigatórios.'); return }
    setSalvando(true); setErro('')
    try {
      const payload = { ...form, folha_valor_liquido: calcLiquido(form.folha_salario_base, form.folha_descontos) }
      if (!payload.funcionario_id) delete payload.funcionario_id
      if (editando) await financeiroApi.editarFolha(editando.id, payload)
      else await financeiroApi.criarFolha(payload)
      setModal(false); carregar()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const deletar = async (f) => {
    if (!confirm(`Remover folha de "${f.funcionario_nome}"?`)) return
    await financeiroApi.deletarFolha(f.id); carregar()
  }

  const colunas = [
    { key: 'funcionario_nome', label: 'Funcionário' },
    { key: 'folha_competencia', label: 'Competência', render: r => r.folha_competencia?.slice(0, 7) || '—', muted: true },
    { key: 'folha_salario_base', label: 'Salário base', render: r => formatMoeda(r.folha_salario_base), muted: true },
    { key: 'folha_descontos', label: 'Descontos', render: r => formatMoeda(r.folha_descontos), muted: true },
    { key: 'folha_valor_liquido', label: 'Líquido', render: r => <span style={{ color: '#10b981', fontWeight: 600 }}>{formatMoeda(r.folha_valor_liquido)}</span> },
    { key: '_acoes', label: 'Ações', render: r => (
      <div className="flex gap-2 w-full">
        <button onClick={e => { e.stopPropagation(); abrirEdicao(r) }} style={btnEditar}>Editar</button>
        <button onClick={e => { e.stopPropagation(); deletar(r) }} style={btnRemover}>Remover</button>
      </div>
    )},
  ]

  const liquido = calcLiquido(form.folha_salario_base, form.folha_descontos)

  return (
    <SistemaLayout titulo="Folha de Pagamento">
      <div className="p-6">
        <p className="text-xs mb-4" style={{ color: '#a78bca' }}>⚠️ A folha não gera lançamento automático no Livro Caixa — por design.</p>
        <div className="flex justify-end mb-5">
          <button onClick={abrirNovo} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#063BF8', color: '#fff' }}>+ Nova folha</button>
        </div>
        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados} />}
      </div>

      {modal && (
        <ModalBase titulo={editando ? 'Editar folha' : 'Nova folha'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Nome do funcionário *</label>
              <input value={form.funcionario_nome} onChange={e => setForm(f => ({ ...f, funcionario_nome: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Competência (mês/ano)</label>
              <input type="month" value={form.folha_competencia} onChange={e => setForm(f => ({ ...f, folha_competencia: e.target.value + '-01' }))} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Salário base *</label>
                <input type="number" step="0.01" value={form.folha_salario_base} onChange={e => setForm(f => ({ ...f, folha_salario_base: e.target.value }))} style={inputStyle} placeholder="0,00" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Descontos</label>
                <input type="number" step="0.01" value={form.folha_descontos} onChange={e => setForm(f => ({ ...f, folha_descontos: e.target.value }))} style={inputStyle} placeholder="0,00" />
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-xs" style={{ color: '#a78bca' }}>Valor líquido calculado</p>
              <p className="text-lg font-bold" style={{ color: '#10b981' }}>{formatMoeda(liquido)}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Observações</label>
              <textarea value={form.folha_observacoes} onChange={e => setForm(f => ({ ...f, folha_observacoes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
            <BotoesModal onCancel={() => setModal(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}
    </SistemaLayout>
  )
}
