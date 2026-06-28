import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, formatMoeda, ModalConfirmar } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const TIPOS = { CORRENTE: 'Conta Corrente', POUPANCA: 'Poupança', CAIXA: 'Caixa', CARTEIRA: 'Carteira Digital' }
const formVazio = { nome: '', tipo: 'CORRENTE', banco: '', agencia: '', numero: '', saldo_inicial: '' }
const formTransfVazio = { conta_destino: '', valor: '', descricao: '', data: '' }

const btnEditar    = { background: 'rgba(6,59,248,0.15)',   color: '#6b8fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }
const btnTransf    = { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }
const btnDesativar = { background: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }

export default function ContasPage() {
  const [dados, setDados]               = useState([])
  const [carregando, setCarregando]     = useState(true)
  const [modal, setModal]               = useState(false)
  const [modalTransf, setModalTransf]   = useState(null)   // conta origem
  const [editando, setEditando]         = useState(null)
  const [form, setForm]                 = useState(formVazio)
  const [formTransf, setFormTransf]     = useState(formTransfVazio)
  const [salvando, setSalvando]         = useState(false)
  const [erro, setErro]                 = useState('')
  const [erroTransf, setErroTransf]     = useState('')
  const [sucesso, setSucesso]           = useState('')
  const [modalConfirmar, setModalConfirmar] = useState(null)
  const [saldos, setSaldos]             = useState({})

  const carregar = useCallback(() => {
    setCarregando(true)
    financeiroApi.listarContas()
      .then(async r => {
        const lista = r.data.results ?? r.data
        setDados(lista)
        const saldosMap = {}
        await Promise.all(lista.map(async conta => {
          try {
            const res = await financeiroApi.totaisLivroCaixa({ conta: conta.id })
            saldosMap[conta.id] = res.data.saldo_atual
          } catch {}
        }))
        setSaldos(saldosMap)
      })
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

  const abrirTransferencia = (c) => {
    setModalTransf(c)
    setFormTransf(formTransfVazio)
    setErroTransf('')
    setSucesso('')
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

  const handleTransferir = async (e) => {
    e.preventDefault()
    if (!formTransf.conta_destino || !formTransf.valor) { setErroTransf('Conta destino e valor são obrigatórios.'); return }
    setSalvando(true); setErroTransf('')
    try {
      await financeiroApi.transferir(modalTransf.id, {
        conta_destino: formTransf.conta_destino,
        valor: formTransf.valor,
        descricao: formTransf.descricao || 'Transferencia entre contas',
        data: formTransf.data || new Date().toISOString().slice(0, 10),
      })
      setSucesso(`Transferência de ${formatMoeda(formTransf.valor)} realizada com sucesso!`)
      setFormTransf(formTransfVazio)
      carregar()
    } catch (err) {
      const msg = err.response?.data?.erro || err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erro ao transferir.'
      setErroTransf(msg)
    } finally { setSalvando(false) }
  }

  const deletar = (c) => setModalConfirmar({ msg: `Desativar conta "${c.nome}"?`, onConfirm: async () => { await financeiroApi.deletarConta(c.id); carregar() } })

  const colunas = [
    { key: 'nome', label: 'Nome' },
    { key: 'tipo', label: 'Tipo', render: r => TIPOS[r.tipo] || r.tipo, muted: true },
    { key: 'banco', label: 'Banco', render: r => r.banco || '—', muted: true },
    { key: 'saldo_inicial', label: 'Saldo inicial', render: r => formatMoeda(r.saldo_inicial), muted: true },
    {
      key: '_acoes', label: 'Ações',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={btnTransf}    onClick={() => abrirTransferencia(r)}>🔄 Transferir</button>
          <button style={btnEditar}    onClick={() => abrirEdicao(r)}>✏️ Editar</button>
          <button style={btnDesativar} onClick={() => deletar(r)}>🗑️ Desativar</button>
        </div>
      )
    },
  ]

  // contas disponíveis como destino (exclui a origem)
  const contasDestino = modalTransf ? dados.filter(c => c.id !== modalTransf.id) : []

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Contas Bancárias</h1>
          <button onClick={abrirNovo} style={{ backgroundColor: '#063BF8', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            ➕ Nova Conta
          </button>
        </div>
        {!carregando && dados.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {dados.map(conta => {
              const saldo = saldos[conta.id]
              const corSaldo = saldo != null ? (Number(saldo) >= 0 ? '#10b981' : '#f87171') : '#a78bca'
              return (
                <div key={conta.id} style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, color: '#a78bca', marginBottom: 6, fontWeight: 600 }}>{conta.nome}</div>
                  <div style={{ fontSize: 10, color: '#6b6b8a', marginBottom: 8 }}>{TIPOS[conta.tipo] || conta.tipo}{conta.banco ? ` · ${conta.banco}` : ''}</div>
                  <div style={{ fontSize: 11, color: '#6b6b8a', marginBottom: 2 }}>Saldo atual</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: corSaldo }}>
                    {saldo != null ? Number(saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {carregando ? <Spinner /> : dados.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={dados} />}
      </div>

      {/* Modal Nova/Editar Conta */}
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
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Agencia</label>
                <input style={inputStyle} value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))} placeholder="Ex: 0001" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Numero da conta</label>
                <input style={inputStyle} value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Ex: 12345-6" />
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

      {/* Modal Transferência */}
      {modalTransf && (
        <ModalBase titulo="🔄 Transferência entre Contas" onClose={() => setModalTransf(null)}>
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10 }}>
            <span style={{ fontSize: 12, color: '#a78bca' }}>Conta origem</span>
            <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: '#10b981' }}>{modalTransf.nome}</p>
          </div>

          {sucesso ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <p style={{ color: '#10b981', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{sucesso}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
                <button
                  onClick={() => { setSucesso(''); setFormTransf(formTransfVazio) }}
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Nova transferência
                </button>
                <button
                  onClick={() => setModalTransf(null)}
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, cursor: 'pointer' }}>
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleTransferir} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Conta destino *</label>
                <select style={inputStyle} value={formTransf.conta_destino} onChange={e => setFormTransf(f => ({ ...f, conta_destino: e.target.value }))}>
                  <option value="">Selecione a conta destino</option>
                  {contasDestino.map(c => <option key={c.id} value={c.id}>{c.nome} — {TIPOS[c.tipo] || c.tipo}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Valor (R$) *</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={formTransf.valor}
                    onChange={e => setFormTransf(f => ({ ...f, valor: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Data</label>
                  <input
                    style={inputStyle}
                    type="date"
                    value={formTransf.data}
                    onChange={e => setFormTransf(f => ({ ...f, data: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Descrição</label>
                <input
                  style={inputStyle}
                  placeholder="Ex: Reserva mensal, reforço de caixa..."
                  value={formTransf.descricao}
                  onChange={e => setFormTransf(f => ({ ...f, descricao: e.target.value }))}
                />
              </div>

              {formTransf.valor && formTransf.conta_destino && (
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#a78bca' }}>Valor a transferir</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>{formatMoeda(formTransf.valor)}</span>
                </div>
              )}

              {erroTransf && <p style={{ color: '#f87171', fontSize: 13 }}>{erroTransf}</p>}
              <BotoesModal onCancel={() => setModalTransf(null)} salvando={salvando} labelConfirmar="Confirmar Transferência" />
            </form>
          )}
        </ModalBase>
      )}
      <ModalConfirmar config={modalConfirmar} onClose={() => setModalConfirmar(null)} />
    </SistemaLayout>
  )
}
