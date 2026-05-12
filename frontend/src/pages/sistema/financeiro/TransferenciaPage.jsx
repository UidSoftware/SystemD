import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { inputStyle, formatMoeda } from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

export default function TransferenciaPage() {
  const [contas, setContas] = useState([])
  const [form, setForm] = useState({ conta_origem: '', conta_destino: '', valor: '', historico: '', data: '' })
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    financeiroApi.listarContas().then(r => setContas(r.data.results ?? r.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.conta_origem || !form.conta_destino || !form.valor) { setErro('Conta origem, destino e valor são obrigatórios.'); return }
    if (form.conta_origem === form.conta_destino) { setErro('Conta origem e destino devem ser diferentes.'); return }
    setSalvando(true); setErro(''); setSucesso('')
    try {
      await financeiroApi.transferir(form)
      setSucesso(`Transferência de ${formatMoeda(form.valor)} realizada com sucesso.`)
      setForm({ conta_origem: '', conta_destino: '', valor: '', historico: '', data: '' })
    } catch (e) {
      setErro(e.response?.data ? Object.values(e.response.data).flat().join(' ') : 'Erro ao transferir.')
    } finally { setSalvando(false) }
  }

  return (
    <SistemaLayout titulo="Transferência entre Contas">
      <div className="p-6 max-w-lg mx-auto">
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm mb-6" style={{ color: '#a78bca' }}>
            Gera dois lançamentos no Livro Caixa: saída na conta origem e entrada na conta destino.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Conta origem *</label>
              <select value={form.conta_origem} onChange={e => setForm(f => ({ ...f, conta_origem: e.target.value }))} style={inputStyle}>
                <option value="">Selecione</option>
                {contas.map(c => <option key={c.cont_id} value={c.cont_id}>{c.cont_nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Conta destino *</label>
              <select value={form.conta_destino} onChange={e => setForm(f => ({ ...f, conta_destino: e.target.value }))} style={inputStyle}>
                <option value="">Selecione</option>
                {contas.map(c => <option key={c.cont_id} value={c.cont_id}>{c.cont_nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Valor *</label>
              <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} style={inputStyle} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Histórico</label>
              <input value={form.historico} onChange={e => setForm(f => ({ ...f, historico: e.target.value }))} style={inputStyle} placeholder="Descrição da transferência" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#a78bca' }}>Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={inputStyle} />
            </div>
            {erro && <p className="text-xs" style={{ color: '#FF0000' }}>{erro}</p>}
            {sucesso && <p className="text-xs" style={{ color: '#10b981' }}>{sucesso}</p>}
            <button type="submit" disabled={salvando} className="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvando ? 0.6 : 1 }}>
              {salvando ? 'Transferindo...' : 'Confirmar transferência'}
            </button>
          </form>
        </div>
      </div>
    </SistemaLayout>
  )
}
