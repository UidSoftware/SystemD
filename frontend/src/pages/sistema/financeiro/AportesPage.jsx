import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, BadgeStatus, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const TIPO_CFG = {
  CAPITAL_SOCIAL: { label: 'Capital Social', cor: '#063BF8' },
  SOCIO:          { label: 'Aporte do Fundador', cor: '#3d0361' },
  INVESTIDOR:     { label: 'Investidor',       cor: '#10b981' },
  EMPRESTIMO:     { label: 'Empréstimo',       cor: '#f59e0b' },
}

const formVazio = { tipo: 'CAPITAL_SOCIAL', descricao: '', valor: '', conta: '', data: new Date().toISOString().slice(0,10), responsavel: 'Luiz Eduardo', observacoes: '' }
const btnAcao = (cor) => ({ background: `${cor}22`, color: cor, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' })

export default function AportesPage() {
  const [dados, setDados] = useState([])
  const [contas, setContas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    Promise.all([financeiroApi.listarAportes(), financeiroApi.listarContas()])
      .then(([a, c]) => {
        setDados(a.data.results ?? a.data)
        setContas(c.data.results ?? c.data)
      }).catch(() => {}).finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const abrirNovo = () => { setEditando(null); setForm(formVazio); setErro(''); setModal(true) }
  const abrirEdicao = (a) => {
    setEditando(a)
    setForm({ tipo: a.tipo, descricao: a.descricao, valor: a.valor, conta: a.conta, data: a.data, responsavel: a.responsavel, observacoes: a.observacoes || '' })
    setErro(''); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.descricao || !form.valor || !form.conta || !form.data) { setErro('Preencha os campos obrigatórios.'); return }
    setSalvando(true); setErro('')
    try {
      if (editando) await financeiroApi.editarAporte(editando.id, form)
      else await financeiroApi.criarAporte(form)
      setModal(false); carregar()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const colunas = [
    { key: 'descricao', label: 'Descrição' },
    { key: 'tipo', label: 'Tipo', render: r => <BadgeStatus status={r.tipo} config={TIPO_CFG} /> },
    { key: 'responsavel', label: 'Responsável', render: r => r.responsavel, muted: true },
    { key: 'valor', label: 'Valor', render: r => formatMoeda(r.valor) },
    { key: 'conta_nome', label: 'Conta', render: r => r.conta_nome, muted: true },
    { key: 'data', label: 'Data', render: r => formatData(r.data), muted: true },
    {
      key: '_acoes', label: 'Ações',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={btnAcao('#6b8fff')} onClick={() => abrirEdicao(r)}>Editar</button>
        </div>
      )
    },
  ]

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Aportes</h1>
          <button onClick={abrirNovo} style={{ backgroundColor: '#063BF8', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            + Novo Aporte
          </button>
        </div>
        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados} />}
      </div>

      {modal && (
        <ModalBase titulo={editando ? 'Editar Aporte' : 'Novo Aporte'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Tipo *</label>
              <select style={inputStyle} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Descrição *</label>
              <input style={inputStyle} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Capital social inicial" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Valor (R$) *</label>
                <input style={inputStyle} type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Data *</label>
                <input style={inputStyle} type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Conta *</label>
                <select style={inputStyle} value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}>
                  <option value="">Selecione</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Responsável</label>
                <input style={inputStyle} value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} />
              </div>
            </div>
            {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
            <BotoesModal onCancel={() => setModal(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}
    </SistemaLayout>
  )
}
