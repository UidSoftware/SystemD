import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import { osApi } from '../../../services/osApi'
import { ModalConfirmar } from '../../../components/sistema/FinanceiroTable'

// Kanban da esteira em fila (ver /root/SystemD/plano_execucao.md) —
// cada Manutencao e' um card, coluna = etapa. Substitui a tabela plana
// que existia antes (07/08/2026): agora da pra ver o estado real da
// esteira de relance, sem precisar abrir SSH/log pra saber onde cada
// coisa esta.

const COLUNAS = [
  { etapa: 'PENDENTE',           label: 'Pendente',              cor: '#a78bca' },
  { etapa: 'ORDEM_CRIADA',        label: 'Ordem Criada',          cor: '#6b8fff' },
  { etapa: 'ESPEC_CRIADA',        label: 'Espec. Criada',         cor: '#6b8fff' },
  { etapa: 'BACKEND_PRONTO',      label: 'Backend Pronto',        cor: '#f59e0b' },
  { etapa: 'FRONTEND_PRONTO',     label: 'Frontend Pronto',       cor: '#f59e0b' },
  { etapa: 'SENTINEL_APROVADO',   label: 'Aprovado (Sentinel)',   cor: '#10b981' },
  { etapa: 'SENTINEL_REPROVADO',  label: 'Reprovado (Sentinel)',  cor: '#f87171' },
  { etapa: 'DEPLOYADO',           label: 'Deployado',             cor: '#10b981' },
]

const LABEL = { color: '#6b6b8a', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }
const INPUT = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#f1f5f9',
  padding: '9px 12px', fontSize: 13,
  outline: 'none',
}
const BTN_PRIMARY = {
  background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const BTN_GHOST = {
  background: 'rgba(255,255,255,0.05)', color: '#a78bca',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  padding: '9px 16px', fontSize: 13, cursor: 'pointer',
}

const CAMINHOS_CONHECIDOS = {
  'systemd':      '/root/SystemD',
  'studio fluir': '/var/www/studio-fluir',
}

function inferirCaminho(os) {
  if (!os) return ''
  const titulo = (os.titulo || '').toLowerCase()
  for (const [chave, caminho] of Object.entries(CAMINHOS_CONHECIDOS)) {
    if (titulo.includes(chave)) return caminho
  }
  return ''
}

function tempoDesde(iso) {
  if (!iso) return '—'
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function Card({ item, onClick }) {
  const parado = item.etapa !== 'DEPLOYADO' && (Date.now() - new Date(item.etapa_atualizada_em).getTime()) > 4 * 3600 * 1000
  return (
    <div
      onClick={onClick}
      style={{
        background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: 12, cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(6,59,248,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ color: '#6b8fff', fontSize: 11, fontWeight: 700 }}>#{item.id}</span>
        {item.tentativas_etapa > 0 && (
          <span style={{ color: '#f59e0b', fontSize: 10, fontWeight: 600 }}>
            {item.tentativas_etapa}/3 tentativas
          </span>
        )}
      </div>
      <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>{item.os_titulo}</p>
      <p style={{
        color: '#a78bca', fontSize: 12, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {item.descricao}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ color: parado ? '#f87171' : '#6b6b8a', fontSize: 10 }}>
          {parado ? '⚠ ' : ''}há {tempoDesde(item.etapa_atualizada_em)}
        </span>
      </div>
    </div>
  )
}

export default function ManutencaoPage() {
  const [itens, setItens] = useState([])
  const [modalConfirmar, setModalConfirmar] = useState(null)
  const [sistemas, setSistemas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [detalhe, setDetalhe] = useState(null)
  const [artefatosDetalhe, setArtefatosDetalhe] = useState([])
  const [carregandoArtefatos, setCarregandoArtefatos] = useState(false)

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ os: '', descricao: '', caminho: '' })
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const [resItens, resSistemas] = await Promise.all([
        osApi.listarManutencoes({}),
        osApi.listarSistemasManutencao(),
      ])
      setItens(resItens.data.results || resItens.data)
      setSistemas(resSistemas.data.results || resSistemas.data)
    } catch {
      setErro('Erro ao carregar manutenções.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const abrirNovo = () => {
    setForm({ os: '', descricao: '', caminho: '' })
    setErroModal('')
    setModal(true)
  }
  const fecharModal = () => setModal(false)

  const handleOsChange = (osId) => {
    const osSelecionada = sistemas.find(s => String(s.id) === String(osId))
    const caminho = osSelecionada?.caminho_servidor || inferirCaminho(osSelecionada)
    setForm(f => ({ ...f, os: osId, caminho }))
  }

  const salvar = async (e) => {
    e.preventDefault()
    if (!form.os) { setErroModal('Selecione o sistema.'); return }
    if (!form.descricao.trim()) { setErroModal('Informe a descrição.'); return }
    setSalvando(true)
    setErroModal('')
    try {
      await osApi.criarManutencao({ os: form.os, descricao: form.descricao, caminho: form.caminho })
      fecharModal()
      carregar()
    } catch (err) {
      const data = err.response?.data
      setErroModal(data && typeof data === 'object'
        ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | ')
        : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const deletar = (item) => setModalConfirmar({
    msg: `Remover manutenção #${item.id}?`,
    onConfirm: async () => {
      try { await osApi.deletarManutencao(item.id); setDetalhe(null); carregar() }
      catch { alert('Erro ao remover.') }
    },
  })

  const abrirDetalhe = async (item) => {
    setDetalhe(item)
    setCarregandoArtefatos(true)
    setArtefatosDetalhe([])
    try {
      const r = await osApi.listarArtefatosDaManutencao(item.id)
      setArtefatosDetalhe(r.data.results || r.data)
    } catch {
      // silencia -- artefatos e' informativo, nao bloqueia o detalhe
    } finally {
      setCarregandoArtefatos(false)
    }
  }

  const liberarBloqueio = async (item) => {
    try {
      await osApi.liberarBloqueio(item.id)
      setDetalhe(null)
      carregar()
    } catch {
      alert('Erro ao desbloquear.')
    }
  }

  const bloqueadas = itens.filter(i => i.etapa === 'BLOQUEADA' && i.ativo)
  const itensPorColuna = (etapa) => itens.filter(i => i.etapa === etapa && i.ativo)

  return (
    <SistemaLayout titulo="Manutenções">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>🔧 Manutenções — Kanban</h1>
          <p style={{ color: '#a78bca', fontSize: 13, margin: '4px 0 0' }}>
            Esteira em fila — cada card avança sozinho pelos crons, coluna por coluna.
          </p>
        </div>
        <button onClick={abrirNovo} style={BTN_PRIMARY}>+ Nova Manutenção</button>
      </div>

      {carregando && <p style={{ color: '#a78bca', textAlign: 'center', padding: 40 }}>Carregando...</p>}
      {!carregando && erro && <p style={{ color: '#f87171', textAlign: 'center', padding: 20 }}>{erro}</p>}

      {!carregando && !erro && (
        <>
          {/* Faixa de bloqueadas — precisa de decisao humana */}
          {bloqueadas.length > 0 && (
            <div style={{
              background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 12, padding: 14, marginBottom: 20,
            }}>
              <h3 style={{ color: '#f87171', fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>
                🔒 Precisam de você ({bloqueadas.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {bloqueadas.map(item => (
                  <div key={item.id} onClick={() => abrirDetalhe(item)} style={{
                    background: '#1a0a2e', border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 10, padding: 12, cursor: 'pointer',
                  }}>
                    <span style={{ color: '#f87171', fontSize: 11, fontWeight: 700 }}>#{item.id} · {item.os_titulo}</span>
                    <p style={{ color: '#e2d9f3', fontSize: 12, margin: '4px 0 0' }}>{item.bloqueio_motivo}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Board */}
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
            {COLUNAS.map(col => {
              const cardsColuna = itensPorColuna(col.etapa)
              return (
                <div key={col.etapa} style={{ minWidth: 240, flex: '0 0 240px' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 4px', borderBottom: `2px solid ${col.cor}`, marginBottom: 10,
                  }}>
                    <span style={{ color: col.cor, fontSize: 12, fontWeight: 700 }}>{col.label}</span>
                    <span style={{ color: '#6b6b8a', fontSize: 11 }}>{cardsColuna.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cardsColuna.map(item => (
                      <Card key={item.id} item={item} onClick={() => abrirDetalhe(item)} />
                    ))}
                    {cardsColuna.length === 0 && (
                      <p style={{ color: '#4a4a5e', fontSize: 11, textAlign: 'center', padding: '12px 0' }}>vazio</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Modal de detalhe */}
      {detalhe && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          backdropFilter: 'blur(4px)',
        }} onClick={() => setDetalhe(null)}>
          <div style={{
            background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
            padding: 28, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, margin: 0 }}>
                  #{detalhe.id} · {detalhe.os_titulo}
                </h2>
                <p style={{ color: '#6b6b8a', fontSize: 12, margin: '4px 0 0' }}>{detalhe.os_cliente}</p>
              </div>
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: 'rgba(107,143,255,0.15)', color: '#6b8fff',
              }}>
                {detalhe.etapa_display}
              </span>
            </div>

            <p style={{ color: '#e2d9f3', fontSize: 13, whiteSpace: 'pre-wrap', margin: '0 0 16px', lineHeight: 1.5 }}>
              {detalhe.descricao}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, fontSize: 12 }}>
              <div><span style={LABEL}>Caminho</span><span style={{ color: '#a78bca', fontFamily: 'monospace', fontSize: 11 }}>{detalhe.caminho || '—'}</span></div>
              <div><span style={LABEL}>Etapa atualizada</span><span style={{ color: '#a78bca' }}>há {tempoDesde(detalhe.etapa_atualizada_em)}</span></div>
              <div><span style={LABEL}>Tentativas na etapa</span><span style={{ color: '#a78bca' }}>{detalhe.tentativas_etapa}/3</span></div>
              <div><span style={LABEL}>Criada em</span><span style={{ color: '#a78bca' }}>{new Date(detalhe.criado_em).toLocaleDateString('pt-BR')}</span></div>
            </div>

            {detalhe.etapa === 'BLOQUEADA' && (
              <div style={{
                background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: 10, padding: 14, marginBottom: 16,
              }}>
                <p style={{ color: '#f87171', fontSize: 12, fontWeight: 700, margin: '0 0 6px' }}>🔒 Bloqueada — precisa de você</p>
                <p style={{ color: '#e2d9f3', fontSize: 13, margin: '0 0 12px' }}>{detalhe.bloqueio_motivo}</p>
                <button onClick={() => liberarBloqueio(detalhe)} style={{ ...BTN_PRIMARY, background: '#10b981' }}>
                  ✓ Aprovar e liberar
                </button>
              </div>
            )}

            {/* Artefatos vinculados */}
            <div style={{ marginBottom: 16 }}>
              <span style={LABEL}>Artefatos gerados</span>
              {carregandoArtefatos && <p style={{ color: '#6b6b8a', fontSize: 12 }}>Carregando...</p>}
              {!carregandoArtefatos && artefatosDetalhe.length === 0 && (
                <p style={{ color: '#6b6b8a', fontSize: 12 }}>Nenhum artefato registrado ainda.</p>
              )}
              {!carregandoArtefatos && artefatosDetalhe.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {artefatosDetalhe.map(a => (
                    <a key={a.id} href="/sistema/office/artefatos" style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                      textDecoration: 'none',
                    }}>
                      <span style={{ color: '#e2d9f3', fontSize: 12 }}>{a.titulo}</span>
                      <span style={{ color: '#6b6b8a', fontSize: 10 }}>{a.agente}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => deletar(detalhe)} style={{ ...BTN_GHOST, color: '#f87171', borderColor: 'rgba(248,113,113,0.2)' }}>
                🗑 Remover
              </button>
              <button onClick={() => setDetalhe(null)} style={BTN_GHOST}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
            padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>🔧 Nova Manutenção</h2>
            {erroModal && (
              <p style={{ color: '#f87171', fontSize: 12, marginBottom: 14, padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 7 }}>
                {erroModal}
              </p>
            )}
            <form onSubmit={salvar}>
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL}>Sistema</label>
                <select value={form.os} onChange={e => handleOsChange(e.target.value)} style={INPUT}>
                  <option value="">Selecione...</option>
                  {sistemas.map(s => <option key={s.id} value={s.id}>{s.titulo} — {s.cliente_nome}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL}>Descrição</label>
                <textarea rows={5} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Descreva o que deve ser feito..." style={{ ...INPUT, resize: 'vertical', minHeight: 100 }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={LABEL}>Caminho no servidor</label>
                <input type="text" value={form.caminho} onChange={e => setForm(f => ({ ...f, caminho: e.target.value }))}
                  placeholder="Preenchido automaticamente" style={{ ...INPUT, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={fecharModal} style={BTN_GHOST} disabled={salvando}>Cancelar</button>
                <button type="submit" style={{ ...BTN_PRIMARY, opacity: salvando ? 0.7 : 1 }} disabled={salvando}>
                  {salvando ? 'Salvando...' : '💾 Criar (entra em PENDENTE)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ModalConfirmar config={modalConfirmar} onClose={() => setModalConfirmar(null)} />
    </SistemaLayout>
  )
}
