import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { osApi } from '../../../services/osApi'

// ──────────────────────────── helpers ────────────────────────────
const LABEL = { color: '#6b6b8a', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }
const INPUT = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#f1f5f9',
  padding: '9px 12px', fontSize: 13,
  outline: 'none', transition: 'border-color 0.15s',
}
const BTN_PRIMARY = {
  background: '#063BF8', color: '#fff',
  border: 'none', borderRadius: 8,
  padding: '9px 22px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
}
const BTN_GHOST = {
  background: 'rgba(255,255,255,0.05)',
  color: '#a78bca',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '9px 16px',
  fontSize: 13, cursor: 'pointer',
}

/**
 * Mapa de caminhos conhecidos: titulo_da_os (lowercase parcial) → caminho no servidor.
 * O combobox seleciona a OS e auto-preenche o caminho.
 * Novos projetos devem ser adicionados aqui ou o campo pode ser editado manualmente.
 */
const CAMINHOS_CONHECIDOS = {
  'systemd':      '/root/SystemD',
  'studio fluir': '/var/www/studio-fluir',
  'uid office':   '/opt/uid-office',
}

function inferirCaminho(os) {
  if (!os) return ''
  const titulo = (os.titulo || '').toLowerCase()
  for (const [chave, caminho] of Object.entries(CAMINHOS_CONHECIDOS)) {
    if (titulo.includes(chave)) return caminho
  }
  return ''
}

// ──────────────────────────── componente ─────────────────────────
export default function ManutencaoPage() {
  const [itens, setItens] = useState([])
  const [sistemas, setSistemas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // Filtros
  const [filtroFeito, setFiltroFeito] = useState('') // '' | 'true' | 'false'

  // Modal
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ os: '', descricao: '', caminho: '', feito: false })
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  // ──────── carregamento ────────
  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const params = {}
      if (filtroFeito !== '') params.feito = filtroFeito
      const [resItens, resSistemas] = await Promise.all([
        osApi.listarManutencoes(params),
        osApi.listarSistemasManutencao(),
      ])
      setItens(resItens.data.results || resItens.data)
      setSistemas(resSistemas.data.results || resSistemas.data)
    } catch {
      setErro('Erro ao carregar manutenções.')
    } finally {
      setCarregando(false)
    }
  }, [filtroFeito])

  useEffect(() => { carregar() }, [carregar])

  // ──────── modal ────────
  const abrirNovo = () => {
    setEditando(null)
    setForm({ os: '', descricao: '', caminho: '', feito: false })
    setErroModal('')
    setModal(true)
  }

  const abrirEditar = (item) => {
    setEditando(item)
    setForm({
      os: item.os,
      descricao: item.descricao,
      caminho: item.caminho,
      feito: item.feito,
    })
    setErroModal('')
    setModal(true)
  }

  const fecharModal = () => { setModal(false); setEditando(null) }

  const handleOsChange = (osId) => {
    const osSelecionada = sistemas.find(s => String(s.id) === String(osId))
    const caminho = inferirCaminho(osSelecionada)
    setForm(f => ({ ...f, os: osId, caminho }))
  }

  const salvar = async (e) => {
    e.preventDefault()
    if (!form.os) { setErroModal('Selecione o sistema.'); return }
    if (!form.descricao.trim()) { setErroModal('Informe a descrição.'); return }
    setSalvando(true)
    setErroModal('')
    try {
      const payload = {
        os: form.os,
        descricao: form.descricao,
        caminho: form.caminho,
        feito: form.feito,
      }
      if (editando) {
        await osApi.editarManutencao(editando.id, payload)
      } else {
        await osApi.criarManutencao(payload)
      }
      fecharModal()
      carregar()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | ')
        setErroModal(msgs)
      } else {
        setErroModal('Erro ao salvar. Tente novamente.')
      }
    } finally {
      setSalvando(false)
    }
  }

  const toggleFeito = async (item) => {
    try {
      await osApi.editarManutencao(item.id, { feito: !item.feito })
      carregar()
    } catch {
      // silencia — o estado não muda
    }
  }

  const deletar = async (item) => {
    if (!window.confirm(`Remover manutenção #${item.id}?`)) return
    try {
      await osApi.deletarManutencao(item.id)
      carregar()
    } catch {
      alert('Erro ao remover.')
    }
  }

  // ──────── render ────────
  return (
    <SistemaLayout titulo="Manutenções">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            🔧 Manutenções
          </h1>
          <p style={{ color: '#a78bca', fontSize: 13, margin: '4px 0 0' }}>
            Pedidos de manutenção para o sistema trabalhar sozinho
          </p>
        </div>
        <button onClick={abrirNovo} style={BTN_PRIMARY}>
          + Nova Manutenção
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Todos', value: '' },
          { label: 'Pendentes', value: 'false' },
          { label: 'Concluídos', value: 'true' },
        ].map(op => (
          <button
            key={op.value}
            onClick={() => setFiltroFeito(op.value)}
            style={{
              padding: '6px 14px', fontSize: 12, borderRadius: 20,
              border: filtroFeito === op.value ? '1px solid #063BF8' : '1px solid rgba(255,255,255,0.1)',
              background: filtroFeito === op.value ? 'rgba(6,59,248,0.15)' : 'transparent',
              color: filtroFeito === op.value ? '#6b8fff' : '#a78bca',
              cursor: 'pointer',
            }}
          >
            {op.label}
          </button>
        ))}
      </div>

      {/* Estado de carregamento / erro */}
      {carregando && (
        <p style={{ color: '#a78bca', textAlign: 'center', padding: 40 }}>Carregando...</p>
      )}
      {!carregando && erro && (
        <p style={{ color: '#f87171', textAlign: 'center', padding: 20 }}>{erro}</p>
      )}

      {/* Mobile — cards */}
      {!carregando && !erro && (
        <div className="md:hidden flex flex-col" style={{ gap: 12 }}>
          {itens.length === 0 && (
            <p style={{ color: '#a78bca', textAlign: 'center', padding: 40 }}>Nenhuma manutenção encontrada.</p>
          )}
          {itens.map(item => (
            <div
              key={item.id}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <span style={{ color: '#6b8fff', fontSize: 12, fontWeight: 600 }}>
                    #{item.id} · {item.os_cliente}
                  </span>
                  <p style={{ color: '#f1f5f9', fontWeight: 600, margin: '2px 0 0', fontSize: 14 }}>
                    {item.os_titulo}
                  </p>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: item.feito ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: item.feito ? '#10b981' : '#f59e0b',
                  border: `1px solid ${item.feito ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  flexShrink: 0,
                }}>
                  {item.feito ? 'Concluído' : 'Pendente'}
                </span>
              </div>
              <p style={{ color: '#a78bca', fontSize: 13, margin: '0 0 6px' }}>{item.descricao}</p>
              {item.caminho && (
                <p style={{ color: '#6b6b8a', fontSize: 11, fontFamily: 'monospace', margin: '0 0 10px' }}>
                  {item.caminho}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => toggleFeito(item)}
                  style={{ ...BTN_GHOST, flex: 1, fontSize: 12 }}
                >
                  {item.feito ? '↩ Reabrir' : '✓ Concluir'}
                </button>
                <button
                  onClick={() => abrirEditar(item)}
                  style={{ ...BTN_GHOST, flex: 1, fontSize: 12 }}
                >
                  ✏ Editar
                </button>
                <button
                  onClick={() => deletar(item)}
                  style={{ ...BTN_GHOST, flex: 1, fontSize: 12, color: '#f87171', borderColor: 'rgba(248,113,113,0.2)' }}
                >
                  🗑 Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop — tabela */}
      {!carregando && !erro && (
        <div className="hidden md:block">
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['#', 'Sistema', 'Descrição', 'Caminho', 'Status', 'Ações'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 600,
                      color: '#6b6b8a', textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#6b6b8a', fontSize: 13 }}>
                      Nenhuma manutenção encontrada.
                    </td>
                  </tr>
                )}
                {itens.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                  >
                    <td style={{ padding: '12px 16px', color: '#6b6b8a', fontSize: 13 }}>#{item.id}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500 }}>{item.os_titulo}</span>
                      <br />
                      <span style={{ color: '#6b6b8a', fontSize: 11 }}>{item.os_cliente}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#a78bca', fontSize: 13, maxWidth: 280 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.descricao}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b6b8a', fontSize: 11, fontFamily: 'monospace' }}>
                      {item.caminho || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: item.feito ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: item.feito ? '#10b981' : '#f59e0b',
                        border: `1px solid ${item.feito ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                      }}>
                        {item.feito ? 'Concluído' : 'Pendente'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => toggleFeito(item)}
                          title={item.feito ? 'Reabrir' : 'Marcar concluído'}
                          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#a78bca', fontSize: 12, cursor: 'pointer' }}
                        >
                          {item.feito ? '↩' : '✓'}
                        </button>
                        <button
                          onClick={() => abrirEditar(item)}
                          title="Editar"
                          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#6b8fff', fontSize: 12, cursor: 'pointer' }}
                        >
                          ✏
                        </button>
                        <button
                          onClick={() => deletar(item)}
                          title="Remover"
                          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)', background: 'transparent', color: '#f87171', fontSize: 12, cursor: 'pointer' }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal criar / editar */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.72)',
          zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#1a0a2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: 28,
            width: '100%', maxWidth: 480,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>
              {editando ? '✏ Editar Manutenção' : '🔧 Nova Manutenção'}
            </h2>

            {erroModal && (
              <p style={{
                color: '#f87171', fontSize: 12, marginBottom: 14,
                padding: '8px 12px',
                background: 'rgba(248,113,113,0.08)',
                borderRadius: 7, border: '1px solid rgba(248,113,113,0.15)',
              }}>
                {erroModal}
              </p>
            )}

            <form onSubmit={salvar}>
              {/* Sistema */}
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL}>Sistema</label>
                <select
                  value={form.os}
                  onChange={e => handleOsChange(e.target.value)}
                  style={{ ...INPUT }}
                  onFocus={e => { e.target.style.borderColor = '#063BF8' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                >
                  <option value="">Selecione...</option>
                  {sistemas.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.titulo} — {s.cliente_nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL}>Descrição</label>
                <textarea
                  rows={4}
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Descreva o que deve ser feito..."
                  style={{ ...INPUT, resize: 'vertical', minHeight: 80 }}
                  onFocus={e => { e.target.style.borderColor = '#063BF8' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>

              {/* Caminho */}
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL}>Caminho no servidor</label>
                <input
                  type="text"
                  value={form.caminho}
                  onChange={e => setForm(f => ({ ...f, caminho: e.target.value }))}
                  placeholder="Ex: /root/SystemD (preenchido automaticamente)"
                  style={{ ...INPUT, fontFamily: 'monospace', fontSize: 12 }}
                  onFocus={e => { e.target.style.borderColor = '#063BF8' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>

              {/* Status */}
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="feito"
                  checked={form.feito}
                  onChange={e => setForm(f => ({ ...f, feito: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#063BF8' }}
                />
                <label htmlFor="feito" style={{ color: '#a78bca', fontSize: 13, cursor: 'pointer' }}>
                  Marcar como concluído
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={fecharModal} style={BTN_GHOST} disabled={salvando}>
                  Cancelar
                </button>
                <button type="submit" style={{ ...BTN_PRIMARY, opacity: salvando ? 0.7 : 1 }} disabled={salvando}>
                  {salvando ? 'Salvando...' : '💾 Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
