import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { FinanceiroTable, inputStyle, Spinner, Vazio, ModalBase, BotoesModal, formatMoeda, formatData } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'
import { useAuth } from '../../../contexts/AuthContext'

const TIPO_COR   = { ENTRADA: '#10b981', SAIDA: '#FF0000' }
const ORIGEM_CFG = { APORTE: '#063BF8', RECEITA: '#10b981', DESPESA: '#f59e0b', MANUAL: '#6b7280' }

export default function LivroCaixaPage() {
  const { usuario } = useAuth()
  const isAdmin = usuario?.perfil === 'ADMIN'

  const [lancamentos, setLancamentos] = useState([])
  const [totais, setTotais] = useState(null)
  const [contas, setContas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtros, setFiltros] = useState({ conta: '', tipo: '', origem: '' })
  const [modalEstorno, setModalEstorno] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = {}
    if (filtros.conta)   params.conta   = filtros.conta
    if (filtros.tipo)    params.tipo    = filtros.tipo
    if (filtros.origem)  params.origem  = filtros.origem
    Promise.all([
      financeiroApi.listarLivroCaixa(params),
      financeiroApi.totaisLivroCaixa(params),
    ]).then(([r, t]) => {
      setLancamentos(r.data.results ?? r.data)
      setTotais(t.data)
    }).catch(() => {}).finally(() => setCarregando(false))
  }, [filtros])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    financeiroApi.listarContas().then(r => setContas(r.data.results ?? r.data)).catch(() => {})
  }, [])

  const handleEstornar = async (e) => {
    e.preventDefault()
    if (!motivo.trim()) return
    setSalvando(true)
    try {
      await financeiroApi.estornar(modalEstorno.id, { motivo })
      setModalEstorno(null); setMotivo(''); carregar()
    } catch { } finally { setSalvando(false) }
  }

  const colunas = [
    { key: 'data', label: 'Data', render: r => formatData(r.data), muted: true },
    { key: 'descricao', label: 'Histórico', render: r => (
      <span style={{ opacity: r.estornado ? 0.45 : 1 }}>
        {r.descricao}
        {r.estornado && <span style={{ marginLeft: 8, fontSize: 10, background: '#f8717122', color: '#f87171', borderRadius: 4, padding: '1px 5px' }}>ESTORNADO</span>}
      </span>
    )},
    { key: 'origem', label: 'Origem', render: r => (
      <span style={{ fontSize: 11, background: (ORIGEM_CFG[r.origem] || '#6b7280') + '22', color: ORIGEM_CFG[r.origem] || '#6b7280', borderRadius: 6, padding: '2px 7px' }}>
        {r.origem}
      </span>
    )},
    { key: 'tipo', label: 'Tipo', render: r => (
      <span style={{ fontSize: 11, background: TIPO_COR[r.tipo] + '22', color: TIPO_COR[r.tipo], borderRadius: 6, padding: '2px 7px' }}>
        {r.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
      </span>
    )},
    { key: 'valor', label: 'Valor', render: r => (
      <span style={{ color: r.tipo === 'ENTRADA' ? '#10b981' : '#FF0000', fontWeight: 600, opacity: r.estornado ? 0.45 : 1 }}>
        {r.tipo === 'SAIDA' ? '- ' : '+ '}{formatMoeda(r.valor)}
      </span>
    )},
    { key: 'saldo_atual', label: 'Saldo', render: r => <span style={{ opacity: r.estornado ? 0.45 : 1 }}>{formatMoeda(r.saldo_atual)}</span>, muted: true },
    { key: 'conta_nome', label: 'Conta', render: r => r.conta_nome || '—', muted: true },
    ...(isAdmin ? [{
      key: '_acoes', label: 'Ações',
      render: r => !r.estornado ? (
        <button
          style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}
          onClick={() => { setModalEstorno(r); setMotivo('') }}>
          Estornar
        </button>
      ) : null
    }] : []),
  ]

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 20 }}>Livro Caixa</h1>

        {totais && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Entradas', valor: totais.total_entradas, cor: '#10b981' },
              { label: 'Total Saídas',   valor: totais.total_saidas,   cor: '#FF0000' },
              { label: 'Saldo Atual',    valor: totais.saldo_atual,    cor: '#063BF8' },
            ].map(({ label, valor, cor }) => (
              <div key={label} style={{ background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, color: '#a78bca', marginBottom: 6 }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: cor }}>{formatMoeda(valor ?? 0)}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <select style={{ ...inputStyle, width: 180 }} value={filtros.conta} onChange={e => setFiltros(f => ({ ...f, conta: e.target.value }))}>
            <option value="">Todas as contas</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select style={{ ...inputStyle, width: 150 }} value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}>
            <option value="">Entrada e Saída</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
          </select>
          <select style={{ ...inputStyle, width: 150 }} value={filtros.origem} onChange={e => setFiltros(f => ({ ...f, origem: e.target.value }))}>
            <option value="">Todas origens</option>
            <option value="APORTE">Aporte</option>
            <option value="RECEITA">Receita</option>
            <option value="DESPESA">Despesa</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>

        {carregando ? <Spinner /> : lancamentos.length === 0 ? <Vazio /> : <FinanceiroTable colunas={colunas} dados={lancamentos} />}
      </div>

      {modalEstorno && (
        <ModalBase titulo="Estornar Lançamento" onClose={() => setModalEstorno(null)} maxW="max-w-md">
          <form onSubmit={handleEstornar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, color: '#a78bca' }}>{modalEstorno.descricao} — {formatMoeda(modalEstorno.valor)}</p>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>Motivo do estorno *</label>
              <textarea style={{ ...inputStyle, minHeight: 70 }} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Lançamento duplicado" />
            </div>
            <BotoesModal onCancel={() => setModalEstorno(null)} salvando={salvando} labelConfirmar="Confirmar Estorno" />
          </form>
        </ModalBase>
      )}
    </SistemaLayout>
  )
}
