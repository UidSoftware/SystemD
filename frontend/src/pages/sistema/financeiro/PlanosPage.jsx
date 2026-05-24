import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const TIPO_PLANO = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral' }
const formVazio = { serv: '', plan_tipo_plano: 'mensal', plan_valor_plano: '' }

const btnEditar = { background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }
const btnRemover = { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }

export default function PlanosPage() {
  const [dados, setDados] = useState([])
  const [servicos, setServicos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    financeiroApi.listarPlanos()
      .then(r => setDados(r.data.results ?? r.data))
      .catch(() => setDados([]))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { financeiroApi.listarServicos({ page_size: 100 }).then(r => setServicos(r.data.results ?? r.data)).catch(() => {}) }, [])

  const abrirNovo = () => { setEditando(null); setForm(formVazio); setErro(''); setModal(true) }
  const abrirEdicao = (p) => { setEditando(p); setForm({ serv: p.serv, plan_tipo_plano: p.plan_tipo_plano, plan_valor_plano: p.plan_valor_plano }); setErro(''); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.serv || !form.plan_valor_plano) { setErro('Serviço e valor são obrigatórios.'); return }
    setSalvando(true); setErro('')
    try {
      if (editando) await financeiroApi.editarPlano(editando.plan_id, form)
      else await financeiroApi.criarPlano(form)
      setModal(false); carregar()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const deletar = async (p) => {
    if (!confirm('Remover este plano?')) return
    await financeiroApi.deletarPlano(p.plan_id); carregar()
  }

  const colunas = [
    { key: 'serv_nome', label: 'Serviço', render: r => r.serv_nome || '—' },
    { key: 'plan_tipo_plano', label: 'Tipo', render: r => TIPO_PLANO[r.plan_tipo_plano], muted: true },
    { key: 'plan_valor_plano', label: 'Valor mensal', render: r => formatMoeda(r.plan_valor_plano) },
    { key: '_acoes', label: 'Ações', render: r => (
      <div className="flex gap-2">
        <button onClick={e => { e.stopPropagation(); abrirEdicao(r) }} style={btnEditar}>Editar</button>
        <button onClick={e => { e.stopPropagation(); deletar(r) }} style={btnRemover}>Remover</button>
      </div>
    )},
  ]

  return (
    <SistemaLayout titulo="Planos de Pagamento">
      <div className="p-6">
        <div className="flex justify-end mb-5">
          <button onClick={abrirNovo} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#063BF8', color: '#fff' }}>+ Novo plano</button>
        </div>
        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados.map(d => ({ ...d, id: d.plan_id }))} />}
      </div>

      {modal && (
        <ModalBase titulo={editando ? 'Editar plano' : 'Novo plano'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Serviço *</label>
              <select value={form.serv} onChange={e => setForm(f => ({ ...f, serv: e.target.value }))} style={inputStyle}>
                <option value="">Selecione</option>
                {servicos.map(s => <option key={s.serv_id} value={s.serv_id}>{s.serv_nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Tipo</label>
              <select value={form.plan_tipo_plano} onChange={e => setForm(f => ({ ...f, plan_tipo_plano: e.target.value }))} style={inputStyle}>
                {Object.entries(TIPO_PLANO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Valor mensal *</label>
              <input type="number" step="0.01" value={form.plan_valor_plano} onChange={e => setForm(f => ({ ...f, plan_valor_plano: e.target.value }))} style={inputStyle} placeholder="0,00" />
            </div>
            {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
            <BotoesModal onCancel={() => setModal(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}
    </SistemaLayout>
  )
}
