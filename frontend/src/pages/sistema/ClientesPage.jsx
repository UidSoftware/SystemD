import { useEffect, useState } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'

const segmentoCores = {
  pilates: '#7c3aed', salao: '#db2777', loja: '#2563eb',
  clinica: '#059669', academia: '#ea580c',
}
function badgeColor(s) { return segmentoCores[s?.toLowerCase()] || '#4b5563' }

const camposVazios = {
  nome_empresa: '', nome_contato: '', email: '', telefone: '',
  whatsapp: '', segmento: '', cidade: '', estado: '', cnpj_cpf: '',
  origem: '', observacoes: '',
}

export default function ClientesPage() {
  const [clientes, setClientes]     = useState([])
  const [busca, setBusca]           = useState('')
  const [pagina, setPagina]         = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando]     = useState(null)
  const [form, setForm]             = useState(camposVazios)
  const [salvando, setSalvando]     = useState(false)
  const [confirmando, setConfirmando] = useState(null)

  const carregar = async (pg = 1) => {
    try {
      const res = await api.get(`/clientes/?page=${pg}`)
      setClientes(res.data.results)
      setTotalPaginas(Math.ceil(res.data.count / 20))
    } catch {}
  }

  useEffect(() => { carregar(pagina) }, [pagina])

  const clientesFiltrados = clientes.filter(c =>
    c.nome_empresa.toLowerCase().includes(busca.toLowerCase()) ||
    c.segmento.toLowerCase().includes(busca.toLowerCase())
  )

  const abrirNovo = () => { setEditando(null); setForm(camposVazios); setModalAberto(true) }
  const abrirEditar = (c) => { setEditando(c.id); setForm({ ...c }); setModalAberto(true) }

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      if (editando) await api.patch(`/clientes/${editando}/`, form)
      else await api.post('/clientes/', form)
      setModalAberto(false)
      carregar(pagina)
    } catch {}
    setSalvando(false)
  }

  const desativar = async (id) => {
    try { await api.delete(`/clientes/${id}/`); carregar(pagina) } catch {}
    setConfirmando(null)
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f1f5f9',
  }

  return (
    <SistemaLayout titulo="Clientes">
      <div className="flex flex-col h-full overflow-auto px-8 py-6">

        <div className="flex items-center justify-between mb-6 gap-4">
          <input
            type="text"
            placeholder="Buscar por nome ou segmento..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="rounded-lg px-4 py-2 text-sm outline-none w-72"
            style={inputStyle}
          />
          <button
            onClick={abrirNovo}
            className="px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: '#063BF8', color: '#fff' }}
          >
            + Novo cliente
          </button>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                {['Empresa', 'Segmento', 'Contato', 'Telefone', 'Cidade/UF', 'Ações'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: '#a78bca' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12" style={{ color: '#6b6b8a' }}>
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : clientesFiltrados.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="px-5 py-4 font-medium" style={{ color: '#f1f5f9' }}>{c.nome_empresa}</td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: badgeColor(c.segmento) + '33', color: badgeColor(c.segmento) }}>
                      {c.segmento}
                    </span>
                  </td>
                  <td className="px-5 py-4" style={{ color: '#e2d9f3' }}>{c.nome_contato}</td>
                  <td className="px-5 py-4" style={{ color: '#e2d9f3' }}>{c.telefone}</td>
                  <td className="px-5 py-4" style={{ color: '#e2d9f3' }}>
                    {[c.cidade, c.estado].filter(Boolean).join('/') || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-3">
                      <button onClick={() => abrirEditar(c)} className="text-xs font-medium" style={{ color: '#063BF8' }}>Editar</button>
                      <button onClick={() => setConfirmando(c.id)} className="text-xs font-medium" style={{ color: '#f87171' }}>Desativar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(pg => (
              <button key={pg} onClick={() => setPagina(pg)}
                className="w-8 h-8 rounded-lg text-sm font-medium"
                style={{ backgroundColor: pg === pagina ? '#063BF8' : 'rgba(255,255,255,0.06)', color: pg === pagina ? '#fff' : '#a78bca' }}>
                {pg}
              </button>
            ))}
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-8 overflow-y-auto max-h-[90vh]"
            style={{ backgroundColor: '#12002a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="font-display font-bold text-xl mb-6" style={{ color: '#f1f5f9' }}>
              {editando ? 'Editar cliente' : 'Novo cliente'}
            </h2>
            <form onSubmit={salvar} className="grid grid-cols-2 gap-4">
              {[
                { label: 'Nome da empresa *', key: 'nome_empresa', required: true, col: 2 },
                { label: 'Nome do contato *', key: 'nome_contato', required: true },
                { label: 'E-mail *', key: 'email', required: true, type: 'email' },
                { label: 'Telefone *', key: 'telefone', required: true },
                { label: 'WhatsApp', key: 'whatsapp' },
                { label: 'Segmento *', key: 'segmento', required: true },
                { label: 'Cidade', key: 'cidade' },
                { label: 'UF', key: 'estado' },
                { label: 'CNPJ/CPF', key: 'cnpj_cpf' },
                { label: 'Origem *', key: 'origem', required: true },
              ].map(({ label, key, required, type = 'text', col }) => (
                <div key={key} className="space-y-1" style={{ gridColumn: col === 2 ? 'span 2' : undefined }}>
                  <label className="text-xs" style={{ color: '#a78bca' }}>{label}</label>
                  <input type={type} value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    required={required}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle} />
                </div>
              ))}
              <div className="space-y-1" style={{ gridColumn: 'span 2' }}>
                <label className="text-xs" style={{ color: '#a78bca' }}>Observações</label>
                <textarea value={form.observacoes}
                  onChange={e => setForm({ ...form, observacoes: e.target.value })}
                  rows={3} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  style={inputStyle} />
              </div>
              <div className="flex gap-3 justify-end" style={{ gridColumn: 'span 2' }}>
                <button type="button" onClick={() => setModalAberto(false)}
                  className="px-5 py-2 rounded-lg text-sm"
                  style={{ color: '#a78bca', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="px-5 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvando ? 0.7 : 1 }}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl p-8 w-80 text-center"
            style={{ backgroundColor: '#12002a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="font-medium mb-6" style={{ color: '#f1f5f9' }}>Desativar este cliente?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmando(null)}
                className="px-5 py-2 rounded-lg text-sm"
                style={{ color: '#a78bca', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button onClick={() => desativar(confirmando)}
                className="px-5 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
