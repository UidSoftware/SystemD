import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import {
  FinanceiroTable, inputStyle, Spinner, Vazio,
  ModalBase, BotoesModal,
} from '../../../components/sistema/FinanceiroTable'
import { financeiroApi } from '../../../services/financeiroApi'

const formVazio = {
  forn_nome: '',
  forn_cnpj: '',
  forn_email: '',
  forn_telefone: '',
  forn_observacoes: '',
  forn_ativo: true,
}

const btnAcao = (cor) => ({
  background: `${cor}22`, color: cor, border: 'none', borderRadius: 8,
  padding: '5px 10px', fontSize: 12, cursor: 'pointer',
})

export default function FornecedoresPage() {
  const [dados, setDados]           = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal]           = useState(false)
  const [editando, setEditando]     = useState(null)
  const [form, setForm]             = useState(formVazio)
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState('')
  const [busca, setBusca]           = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    const params = {}
    if (busca) params.search = busca
    financeiroApi.listarFornecedores(params)
      .then(r => setDados(r.data.results ?? r.data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [busca])

  useEffect(() => { carregar() }, [carregar])

  const abrirNovo = () => {
    setEditando(null)
    setForm(formVazio)
    setErro('')
    setModal(true)
  }

  const abrirEdicao = (d) => {
    setEditando(d)
    setForm({
      forn_nome:        d.forn_nome || '',
      forn_cnpj:        d.forn_cnpj || '',
      forn_email:       d.forn_email || '',
      forn_telefone:    d.forn_telefone || '',
      forn_observacoes: d.forn_observacoes || '',
      forn_ativo:       d.forn_ativo,
    })
    setErro('')
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.forn_nome.trim()) {
      setErro('Nome do fornecedor e obrigatorio.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      if (editando) {
        await financeiroApi.editarFornecedor(editando.id, form)
      } else {
        await financeiroApi.criarFornecedor(form)
      }
      setModal(false)
      carregar()
    } catch (err) {
      setErro(
        err.response?.data
          ? Object.values(err.response.data).flat().join(' ')
          : 'Erro ao salvar.'
      )
    } finally {
      setSalvando(false)
    }
  }

  const desativar = async (d) => {
    if (!confirm(`Desativar fornecedor "${d.forn_nome}"?`)) return
    await financeiroApi.deletarFornecedor(d.id)
    carregar()
  }

  const colunas = [
    { key: 'forn_nome',     label: 'Nome' },
    { key: 'forn_cnpj',     label: 'CNPJ',     render: r => r.forn_cnpj || '—', muted: true },
    { key: 'forn_email',    label: 'Email',     render: r => r.forn_email || '—', muted: true },
    { key: 'forn_telefone', label: 'Telefone',  render: r => r.forn_telefone || '—', muted: true },
    {
      key: 'forn_ativo', label: 'Status',
      render: r => (
        <span style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          background: r.forn_ativo ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
          color: r.forn_ativo ? '#10b981' : '#6b7280',
        }}>
          {r.forn_ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: '_acoes', label: 'Acoes',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={btnAcao('#6b8fff')} onClick={() => abrirEdicao(r)} title="Editar">
            Editar
          </button>
          {r.forn_ativo && (
            <button style={btnAcao('#f87171')} onClick={() => desativar(r)} title="Desativar">
              Desativar
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Fornecedores</h1>
          <button
            onClick={abrirNovo}
            style={{
              backgroundColor: '#063BF8', color: '#fff', border: 'none',
              borderRadius: 10, padding: '9px 18px', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Novo Fornecedor
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            style={{ ...inputStyle, width: 280 }}
            placeholder="Buscar por nome ou CNPJ..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        {carregando ? (
          <Spinner />
        ) : dados.length === 0 ? (
          <Vazio />
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden flex flex-col gap-3">
              {dados.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 12 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: '#6b6b8a', fontSize: 11 }}>Nome</span>
                      <br />
                      <span style={{ color: '#e2d9f3', fontWeight: 600 }}>{item.forn_nome}</span>
                    </div>
                    <div>
                      <span style={{ color: '#6b6b8a', fontSize: 11 }}>CNPJ</span>
                      <br />
                      <span style={{ color: '#e2d9f3' }}>{item.forn_cnpj || '—'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#6b6b8a', fontSize: 11 }}>Telefone</span>
                      <br />
                      <span style={{ color: '#e2d9f3' }}>{item.forn_telefone || '—'}</span>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: '#6b6b8a', fontSize: 11 }}>Email</span>
                      <br />
                      <span style={{ color: '#e2d9f3' }}>{item.forn_email || '—'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(107,143,255,0.15)', color: '#6b8fff', border: 'none', fontSize: 13, cursor: 'pointer' }}
                      onClick={() => abrirEdicao(item)}
                    >
                      Editar
                    </button>
                    {item.forn_ativo && (
                      <button
                        style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(248,113,113,0.15)', color: '#f87171', border: 'none', fontSize: 13, cursor: 'pointer' }}
                        onClick={() => desativar(item)}
                      >
                        Desativar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: tabela */}
            <div className="hidden md:block">
              <FinanceiroTable colunas={colunas} dados={dados} />
            </div>
          </>
        )}
      </div>

      {modal && (
        <ModalBase
          titulo={editando ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          onClose={() => setModal(false)}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>
                Nome *
              </label>
              <input
                style={inputStyle}
                value={form.forn_nome}
                onChange={e => setForm(f => ({ ...f, forn_nome: e.target.value }))}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>
                CNPJ
              </label>
              <input
                style={inputStyle}
                value={form.forn_cnpj}
                onChange={e => setForm(f => ({ ...f, forn_cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>
                  Email
                </label>
                <input
                  style={inputStyle}
                  type="email"
                  value={form.forn_email}
                  onChange={e => setForm(f => ({ ...f, forn_email: e.target.value }))}
                  placeholder="contato@fornecedor.com"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>
                  Telefone
                </label>
                <input
                  style={inputStyle}
                  value={form.forn_telefone}
                  onChange={e => setForm(f => ({ ...f, forn_telefone: e.target.value }))}
                  placeholder="(34) 99999-9999"
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#a78bca', display: 'block', marginBottom: 4 }}>
                Observacoes
              </label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                value={form.forn_observacoes}
                onChange={e => setForm(f => ({ ...f, forn_observacoes: e.target.value }))}
                placeholder="Informacoes adicionais..."
              />
            </div>
            {editando && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="forn_ativo"
                  checked={form.forn_ativo}
                  onChange={e => setForm(f => ({ ...f, forn_ativo: e.target.checked }))}
                  style={{ accentColor: '#063BF8', width: 16, height: 16 }}
                />
                <label htmlFor="forn_ativo" style={{ fontSize: 13, color: '#a78bca', cursor: 'pointer' }}>
                  Fornecedor ativo
                </label>
              </div>
            )}
            {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
            <BotoesModal onCancel={() => setModal(false)} salvando={salvando} />
          </form>
        </ModalBase>
      )}
    </SistemaLayout>
  )
}
