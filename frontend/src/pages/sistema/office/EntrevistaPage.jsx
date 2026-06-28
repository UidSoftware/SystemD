import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import api from '../../../services/api'
import { ModalConfirmar } from '../../../components/sistema/FinanceiroTable'

// ── Estilos compartilhados ─────────────────────────────────────────────────
const IS = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13,
  outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
}
const thS = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#a78bca', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'left' }
const tdS = { padding: '10px 14px', fontSize: 13, color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.04)' }
const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }

// ── Chips e Toggles (usados dentro do modal) ───────────────────────────────
function Chip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
      background: active ? 'rgba(6,59,248,0.15)' : 'rgba(255,255,255,0.04)',
      border: active ? '1px solid #063BF8' : '1px solid rgba(255,255,255,0.1)',
      color: active ? '#6b8fff' : '#a78bca', fontWeight: active ? 600 : 400,
    }}>{label}</button>
  )
}
function Toggle({ label, sub, checked, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <div style={{ fontSize: 13, color: '#f1f5f9' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#6b6b8a', marginTop: 2 }}>{sub}</div>}
      </div>
      <label style={{ position: 'relative', width: 38, height: 22, flexShrink: 0, marginLeft: 16, cursor: 'pointer' }}>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: 22, background: checked ? '#063BF8' : '#3a3a4a', transition: 'background 0.2s' }}>
          <span style={{ position: 'absolute', width: 16, height: 16, left: checked ? 19 : 3, bottom: 3, background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
        </span>
      </label>
    </div>
  )
}
function Sec({ num, title, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '16px', marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b6b8a', marginBottom: 12, fontFamily: 'monospace' }}>{num} — {title}</div>
      {children}
    </div>
  )
}
function Fld({ label, required, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 11, color: '#a78bca', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#f87171', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Constantes ─────────────────────────────────────────────────────────────
const SEGMENTOS = [
  { key: 'SAUDE', label: 'Saúde / Bem-estar' }, { key: 'BELEZA', label: 'Beleza' },
  { key: 'VAREJO', label: 'Varejo' }, { key: 'ALIMENTACAO', label: 'Alimentação' },
  { key: 'SERVICOS', label: 'Serviços' }, { key: 'EDUCACAO', label: 'Educação' },
  { key: 'OUTRO', label: 'Outro' },
]
const ORCAMENTOS = [{ key: 'MEI', label: 'MEI' }, { key: 'PEQUENO', label: 'Pequeno' }, { key: 'MEDIO', label: 'Médio' }]

const FORM_VAZIO = {
  prospecto: '', sistema: '', descricao: '', cores_empresa: '', dominio: '',
  whatsapp_business: false, redes_sociais: '', palavras_chave: '', segmento: '',
  publico_alvo: '', concorrentes: '', prazo_desejado: '', orcamento_faixa: '',
}

// ── Página principal ───────────────────────────────────────────────────────
export default function EntrevistaPage() {
  const [lista, setLista]             = useState([])
  const [modalConfirmar, setModalConfirmar] = useState(null)
  const [total, setTotal]             = useState(0)
  const [carregando, setCarregando]   = useState(true)
  const [pagina, setPagina]           = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [prospectos, setProspectos]   = useState([])
  const [modal, setModal]             = useState(null)
  const [editandoId, setEditandoId]   = useState(null)
  const [salvando, setSalvando]       = useState(false)
  const [erro, setErro]               = useState('')

  const carregar = useCallback(async (pag = 1) => {
    setCarregando(true)
    try {
      const res = await api.get('/entrevistas/', { params: { page: pag } })
      setLista(res.data.results)
      setTotal(res.data.count)
      setTotalPaginas(Math.ceil(res.data.count / 20))
    } finally { setCarregando(false) }
  }, [])

  useEffect(() => {
    carregar()
    api.get('/prospectos/?page_size=200').then(r => setProspectos(r.data.results || [])).catch(() => {})
  }, [])

  const abrirNovo = () => {
    setEditandoId(null)
    setModal({ ...FORM_VAZIO })
    setErro('')
  }

  const abrirEditar = (e) => {
    setEditandoId(e.id)
    setModal({
      prospecto:        e.prospecto || '',
      sistema:          e.sistema || '',
      descricao:        e.descricao || '',
      cores_empresa:    e.cores_empresa || '',
      dominio:          e.dominio || '',
      whatsapp_business: e.whatsapp_business || false,
      redes_sociais:    e.redes_sociais || '',
      palavras_chave:   e.palavras_chave || '',
      segmento:         e.segmento || '',
      publico_alvo:     e.publico_alvo || '',
      concorrentes:     e.concorrentes || '',
      prazo_desejado:   e.prazo_desejado || '',
      orcamento_faixa:  e.orcamento_faixa || '',
    })
    setErro('')
  }

  const excluir = async (id) => {
    setModalConfirmar({ msg: 'Excluir esta entrevista?', onConfirm: async () => { await api.delete('/entrevistas/' + id + '/'); carregar(pagina) } })
  }

  const set = (k, v) => setModal(m => ({ ...m, [k]: v }))

  const salvar = async () => {
    if (!modal.prospecto) { setErro('Selecione o prospecto.'); return }
    if (!modal.sistema)   { setErro('Preencha o nome do sistema.'); return }
    if (modal.descricao.length < 500) { setErro('A descrição precisa ter no mínimo 500 caracteres.'); return }
    setSalvando(true); setErro('')
    try {
      const payload = { ...modal, prazo_desejado: modal.prazo_desejado || null }
      if (editandoId) await api.patch('/entrevistas/' + editandoId + '/', payload)
      else            await api.post('/entrevistas/', payload)
      setModal(null); carregar(pagina)
    } catch (e) {
      const data = e.response?.data
      if (data && typeof data === 'object' && !data.detail)
        setErro(Object.entries(data).map(([c, er]) => `${c}: ${Array.isArray(er) ? er.join(', ') : er}`).join(' | '))
      else
        setErro(data?.detail || 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const segLabel = (key) => SEGMENTOS.find(s => s.key === key)?.label || key || '—'
  const orcLabel = (key) => ORCAMENTOS.find(o => o.key === key)?.label || key || '—'

  return (
    <SistemaLayout titulo="Novo Projeto">
      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Entrevistas</h1>
            <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>{total} entrevista{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={abrirNovo}
            style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova Entrevista
          </button>
        </div>

        {/* Tabela */}
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Sistema', 'Prospecto', 'Segmento', 'Orçamento', 'Prazo', 'Criada em', 'Ações'].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={7} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Carregando...</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={7} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Nenhuma entrevista encontrada</td></tr>
              ) : lista.map(e => (
                <tr key={e.id}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(6,59,248,0.05)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...tdS, fontWeight: 600 }}>{e.sistema}</td>
                  <td style={tdS}>{e.prospecto_nome || '—'}</td>
                  <td style={tdS}>{segLabel(e.segmento)}</td>
                  <td style={tdS}>{orcLabel(e.orcamento_faixa)}</td>
                  <td style={tdS}>{e.prazo_desejado ? new Date(e.prazo_desejado + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td style={{ ...tdS, color: '#94a3b8', fontSize: 12 }}>{new Date(e.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td style={tdS}>
                    <button onClick={() => abrirEditar(e)}
                      style={{ background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                      Editar
                    </button>
                    <button onClick={() => excluir(e.id)}
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => { setPagina(p); carregar(p) }}
                  style={{ background: p === pagina ? '#063BF8' : 'rgba(255,255,255,0.06)', color: p === pagina ? '#fff' : '#a78bca', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 13 }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 760, padding: 28, marginTop: 20, marginBottom: 20 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {editandoId ? 'Editar Entrevista' : 'Nova Entrevista'}
            </h2>

            {erro && <div style={{ background: 'rgba(248,71,71,0.1)', border: '1px solid rgba(248,71,71,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>{erro}</div>}

            <Sec num="01" title="Identificação">
              <Fld label="Prospecto" required>
                <select style={IS} value={modal.prospecto} onChange={e => set('prospecto', e.target.value)}>
                  <option value="">Selecione...</option>
                  {prospectos.map(p => <option key={p.id} value={p.id}>{p.nome_empresa}</option>)}
                </select>
              </Fld>
              <Fld label="Nome do sistema" required>
                <input style={IS} value={modal.sistema} onChange={e => set('sistema', e.target.value)} maxLength={100} placeholder="ex: Sistema Gestão Salão" />
              </Fld>
              <Fld label="Descrição do projeto" required>
                <textarea style={{ ...IS, minHeight: 120, resize: 'vertical', lineHeight: 1.6 }} value={modal.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Mínimo 500 caracteres" />
                <div style={{ fontSize: 11, color: modal.descricao.length >= 500 ? '#10b981' : '#6b6b8a', marginTop: 3 }}>
                  {modal.descricao.length}/500 caracteres
                </div>
              </Fld>
            </Sec>

            <Sec num="02" title="Marca e Presença">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Fld label="Cores da empresa">
                  <input style={IS} value={modal.cores_empresa} onChange={e => set('cores_empresa', e.target.value)} placeholder="ex: Azul Royal, Branco" />
                </Fld>
                <Fld label="Domínio">
                  <input style={IS} value={modal.dominio} onChange={e => set('dominio', e.target.value)} placeholder="ex: meusistema.com.br" />
                </Fld>
              </div>
              <Toggle label="WhatsApp Business" sub="O cliente usa WhatsApp Business?" checked={modal.whatsapp_business} onChange={e => set('whatsapp_business', e.target.checked)} />
              <Fld label="Redes sociais" required={false}>
                <textarea style={{ ...IS, minHeight: 60, resize: 'vertical', lineHeight: 1.6, marginTop: 8 }} value={modal.redes_sociais} onChange={e => set('redes_sociais', e.target.value)} placeholder="ex: Instagram @salao" />
              </Fld>
            </Sec>

            <Sec num="03" title="Mercado">
              <Fld label="Palavras-chave">
                <textarea style={{ ...IS, minHeight: 60, resize: 'vertical', lineHeight: 1.6 }} value={modal.palavras_chave} onChange={e => set('palavras_chave', e.target.value)} />
              </Fld>
              <Fld label="Segmento">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {SEGMENTOS.map(s => <Chip key={s.key} label={s.label} active={modal.segmento === s.key} onClick={() => set('segmento', s.key)} />)}
                </div>
              </Fld>
              <Fld label="Público-alvo">
                <textarea style={{ ...IS, minHeight: 60, resize: 'vertical', lineHeight: 1.6 }} value={modal.publico_alvo} onChange={e => set('publico_alvo', e.target.value)} />
              </Fld>
              <Fld label="Concorrentes">
                <textarea style={{ ...IS, minHeight: 60, resize: 'vertical', lineHeight: 1.6 }} value={modal.concorrentes} onChange={e => set('concorrentes', e.target.value)} />
              </Fld>
            </Sec>

            <Sec num="04" title="Escopo">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Fld label="Prazo desejado">
                  <input type="date" style={IS} value={modal.prazo_desejado} onChange={e => set('prazo_desejado', e.target.value)} />
                </Fld>
                <Fld label="Faixa de orçamento">
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {ORCAMENTOS.map(o => <Chip key={o.key} label={o.label} active={modal.orcamento_faixa === o.key} onClick={() => set('orcamento_faixa', o.key)} />)}
                  </div>
                </Fld>
              </div>
            </Sec>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setModal(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Criar Entrevista'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ModalConfirmar config={modalConfirmar} onClose={() => setModalConfirmar(null)} />
    </SistemaLayout>
  )
}
