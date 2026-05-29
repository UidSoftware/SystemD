import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const TIPOS = { CORRENTE: 'Conta Corrente', POUPANCA: 'Poupança', CAIXA: 'Caixa', CARTEIRA: 'Carteira Digital' }
const formVazio = { nome: '', tipo: 'CORRENTE', banco: '', agencia: '', numero: '', saldo_inicial: '' }

const btnEditar   = { background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }
const btnDesativar = { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }

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
  const abrirEdicao = (c) => {
    setEditando(c)
    setForm({ nome: c.nome, tipo: c.tipo, banco: c.banco || '', agencia: c.agencia || '', numero: c.numero || '', saldo_inicial: c.saldo_inicial })
    setErro(''); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome) { setErro('Nome é obrigatório.'); return }
    setSalvando(true); setErro('')
    try {
      if (editando) await financeiroApi.editarConta(editando.id, form)
      else await financeiroApi.criarConta(form)
      setModal(false); carregar()
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const deletar = async (c) => {
    if (!confirm(`Desativar conta "${c.nome}"?`)) return
    await financeiroApi.deletarConta(c.id); carregar()
  }

  const colunas = [
    { key: 'nome', label: 'Nome' },
    { key: 'tipo', label: 'Tipo', render: r => TIPOS[r.tipo] || r.tipo, muted: true },
    { key: 'banco', label: 'Banco', render: r => r.banco || '—', muted: true },
    { key: 'saldo_inicial', label: 'Saldo inicial', render: r => formatMoeda(r.saldo_inicial), muted: true },
    {
      key: '_acoes', label: 'Ações',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={btnEditar} onClick={() => abrirEdicao(r)}>✏️ Editar</button>
          <button style={btnDesativar} onClick={() => deletar(r)}>🗑️ Desativar</button>
        </div>
      )
    },
  ]

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Contas Bancárias</h1>
          <button onClick={abrirNovo} style={{ backgroundColor: '#063BF8', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            ➕ Nova Conta
          </button>
        </div>
        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados} />}
      </div>

      {modal && (
        <ModalBase titulo={editando ? 'Editar Conta' : 'Nova Conta'} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Nome *</label>
              <input style={inputStyle} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Nubank PJ" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Tipo *</label>
              <select style={inputStyle} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Banco</label>
                <input style={inputStyle} value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Saldo inicial (R$)</label>
                <input style={inputStyle} type="number" step="0.01" value={form.saldo_inicial} onChange={e => setForm(f => ({ ...f, saldo_inicial: e.target.value }))} />
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
