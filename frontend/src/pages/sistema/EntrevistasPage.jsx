import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import api from '../../services/api'
import { ModalConfirmar } from '../../components/sistema/FinanceiroTable'

function Chip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
      background: active ? 'rgba(6,59,248,0.15)' : 'rgba(255,255,255,0.04)',
      border: active ? '1px solid #063BF8' : '1px solid rgba(255,255,255,0.1)',
      color: active ? '#6b8fff' : '#a78bca', fontWeight: active ? 600 : 400,
      transition: 'all 0.12s',
    }}>{label}</button>
  )
}

function Toggle({ id, label, sub, checked, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <div style={{ fontSize: 14, color: '#f1f5f9' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: '#6b6b8a', marginTop: 2 }}>{sub}</div>}
      </div>
      <label style={{ position: 'relative', width: 38, height: 22, flexShrink: 0, marginLeft: 16, cursor: 'pointer' }}>
        <input type="checkbox" id={id} checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{
          position: 'absolute', inset: 0, borderRadius: 22,
          background: checked ? '#063BF8' : '#3a3a4a',
          transition: 'background 0.2s',
        }}>
          <span style={{
            position: 'absolute', width: 16, height: 16, left: checked ? 19 : 3, bottom: 3,
            background: 'white', borderRadius: '50%', transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </span>
      </label>
    </div>
  )
}

const Section = ({ num, title, children }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' }}>
    <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b6b8a', marginBottom: '1.25rem', fontFamily: 'monospace' }}>{num} — {title}</div>
    {children}
  </div>
)

const Field = ({ label, required, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: 13, color: '#a78bca', marginBottom: 6, fontWeight: 500 }}>
      {label}{required && <span style={{ color: '#f87171', marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
)

const inputStyle = {
  width: '100%', fontFamily: 'inherit', fontSize: 14, color: '#f1f5f9',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '9px 12px', outline: 'none', boxSizing: 'border-box',
}

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: '#a78bca',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
}

const tdStyle = {
  padding: '10px 14px',
  fontSize: 13,
  color: '#e2e8f0',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
}

const labelStyle = { fontSize: 11, color: '#6b6b8a' }
const valueStyle = { fontSize: 13, color: '#e2d9f3' }

const SEGMENTO_CHOICES = [
  { value: 'SAUDE', label: 'Saúde / Bem-estar' },
  { value: 'BELEZA', label: 'Beleza' },
  { value: 'VAREJO', label: 'Varejo' },
  { value: 'ALIMENTACAO', label: 'Alimentação' },
  { value: 'SERVICOS', label: 'Serviços' },
  { value: 'EDUCACAO', label: 'Educação' },
  { value: 'OUTRO', label: 'Outro' },
]

const ORCAMENTO_CHOICES = [
  { value: 'MEI', label: 'MEI' },
  { value: 'PEQUENO', label: 'Pequeno' },
  { value: 'MEDIO', label: 'Médio' },
]

const ENTREVISTA_VAZIA = {
  prospecto: '', sistema: '', descricao: '',
  cores_empresa: '', dominio: '', whatsapp_business: false,
  redes_sociais: '', palavras_chave: '',
  segmento: '', publico_alvo: '', concorrentes: '',
  prazo_desejado: '', orcamento_faixa: '',
}

export default function EntrevistasPage() {
  const [entrevistas, setEntrevistas] = useState([])
  const [modalConfirmar, setModalConfirmar] = useState(null)
  const [prospectos, setProspectos] = useState([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  const [modal, setModal] = useState(null)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async (pag = 1) => {
    setCarregando(true)
    try {
      const res = await api.get('/entrevistas/', { params: { page: pag } })
      setEntrevistas(res.data.results)
      setTotal(res.data.count)
      setTotalPaginas(Math.ceil(res.data.count / 20))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
    api.get('/prospectos/').then(r => setProspectos(r.data.results)).catch(() => {})
  }, [])

  const set = (k, v) => setModal(m => ({ ...m, [k]: v }))

  const chips = (field, options) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
      {options.map(o => (
        <Chip key={o.value} label={o.label} active={modal[field] === o.value} onClick={() => set(field, o.value)} />
      ))}
    </div>
  )

  const abrirNovo = () => { setModal({ ...ENTREVISTA_VAZIA }); setModoEdicao(false); setErro('') }
  const abrirEditar = (e) => { setModal({ ...e }); setModoEdicao(true); setErro('') }

  const salvar = async () => {
    if (!modal.prospecto || !modal.sistema || !modal.descricao || !modal.segmento || !modal.orcamento_faixa) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        prospecto: modal.prospecto,
        sistema: modal.sistema,
        descricao: modal.descricao,
        cores_empresa: modal.cores_empresa,
        dominio: modal.dominio,
        whatsapp_business: modal.whatsapp_business,
        redes_sociais: modal.redes_sociais,
        palavras_chave: modal.palavras_chave,
        segmento: modal.segmento,
        publico_alvo: modal.publico_alvo,
        concorrentes: modal.concorrentes,
        prazo_desejado: modal.prazo_desejado || null,
        orcamento_faixa: modal.orcamento_faixa,
      }
      if (modoEdicao) {
        await api.patch(`/entrevistas/${modal.id}/`, payload)
      } else {
        await api.post('/entrevistas/', payload)
      }
      setModal(null)
      carregar(pagina)
    } catch (err) {
      const data = err.response?.data
      let msg = data?.detail
      if (!msg && data && typeof data === 'object') {
        msg = Object.values(data).flat().join(' ')
      }
      setErro(msg || 'Erro ao salvar. Verifique os campos obrigatórios.')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id) => {
    setModalConfirmar({ msg: 'Excluir esta entrevista?', onConfirm: async () => { await api.delete(`/entrevistas/${id}/`); carregar(pagina) } })
  }

  const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    overflow: 'hidden',
  }

  const prospectoSelecionado = modal ? prospectos.find(p => String(p.id) === String(modal.prospecto)) : null
  const leadMensagem = prospectoSelecionado?.lead_mensagem || modal?.lead_mensagem || ''

  return (
    <SistemaLayout>
      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Entrevistas</h1>
            <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>{total} entrevista{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={abrirNovo}
            style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ➕ Nova Entrevista
          </button>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {carregando ? (
            <div style={{ textAlign: 'center', color: '#a78bca', padding: 32 }}>Carregando...</div>
          ) : entrevistas.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a78bca', padding: 32 }}>Nenhuma entrevista encontrada</div>
          ) : entrevistas.map(e => (
            <div key={e.id} style={{ ...cardStyle, padding: 16 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{e.sistema}</div>
                <div style={{ fontSize: 12, color: '#a78bca', marginTop: 2 }}>{e.prospecto_nome || '—'}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 10 }}>
                <div>
                  <div style={labelStyle}>Segmento</div>
                  <div style={valueStyle}>{e.segmento_display || '—'}</div>
                </div>
                <div>
                  <div style={labelStyle}>Orçamento</div>
                  <div style={valueStyle}>{e.orcamento_faixa_display || '—'}</div>
                </div>
                <div>
                  <div style={labelStyle}>Prazo</div>
                  <div style={valueStyle}>{e.prazo_desejado || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => abrirEditar(e)}
                  style={{ flex: 1, background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                  ✏️ Editar
                </button>
                <button onClick={() => excluir(e.id)}
                  style={{ flex: 1, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                  🗑️ Excluir
                </button>
              </div>
            </div>
          ))}
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 8 }}>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => { setPagina(p); carregar(p) }}
                  style={{ background: p === pagina ? '#063BF8' : 'rgba(255,255,255,0.06)', color: p === pagina ? '#fff' : '#a78bca', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 13 }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block" style={cardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Sistema', 'Prospecto', 'Segmento', 'Orçamento', 'Prazo', 'Ações'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Carregando...</td></tr>
              ) : entrevistas.length === 0 ? (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#a78bca' }}>Nenhuma entrevista encontrada</td></tr>
              ) : entrevistas.map(e => (
                <tr key={e.id}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(6,59,248,0.06)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <td style={tdStyle}>{e.sistema}</td>
                  <td style={tdStyle}>{e.prospecto_nome || '—'}</td>
                  <td style={tdStyle}>{e.segmento_display || '—'}</td>
                  <td style={tdStyle}>{e.orcamento_faixa_display || '—'}</td>
                  <td style={tdStyle}>{e.prazo_desejado || '—'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => abrirEditar(e)}
                      style={{ background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => excluir(e.id)}
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                      🗑️ Excluir
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

      {/* Modal cadastro/edição */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 680, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {modoEdicao ? 'Editar Entrevista' : 'Nova Entrevista'}
            </h2>

            {erro && <div style={{ background: 'rgba(248,71,71,0.1)', border: '1px solid rgba(248,71,71,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#f87171', fontSize: 14 }}>{erro}</div>}

            <Section num="01" title="Identificação">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Prospecto" required>
                  <select style={inputStyle} value={modal.prospecto || ''} onChange={e => set('prospecto', e.target.value)}>
                    <option value="">Selecione...</option>
                    {prospectos.map(p => <option key={p.id} value={p.id}>{p.nome_empresa}</option>)}
                  </select>
                </Field>
                <Field label="Sistema" required><input style={inputStyle} value={modal.sistema} onChange={e => set('sistema', e.target.value)} placeholder="ex: Sistema de Gestão Salão" /></Field>
              </div>
            </Section>

            <Section num="02" title="Descritivo">
              {leadMensagem && (
                <div style={{ background: 'rgba(6,59,248,0.08)', border: '1px solid rgba(6,59,248,0.25)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b8fff', marginBottom: 6 }}>📨 Resumo do Lead</div>
                  <div style={{ fontSize: 13, color: '#e2d9f3', lineHeight: 1.5 }}>{leadMensagem}</div>
                </div>
              )}
              <Field label="Descrição do projeto" required>
                <textarea style={{ ...inputStyle, minHeight: 160, resize: 'vertical', lineHeight: 1.6 }} value={modal.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descreva o projeto com detalhes — o que o cliente precisa, contexto do negócio, fluxos principais..." />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Segmento" required>
                  <select style={inputStyle} value={modal.segmento} onChange={e => set('segmento', e.target.value)}>
                    <option value="">Selecione...</option>
                    {SEGMENTO_CHOICES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Público-alvo"><input style={inputStyle} value={modal.publico_alvo} onChange={e => set('publico_alvo', e.target.value)} placeholder="ex: mulheres 25-45 anos, classe B/C" /></Field>
              </div>
              <Field label="Concorrentes"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} value={modal.concorrentes} onChange={e => set('concorrentes', e.target.value)} placeholder="ex: SistemaX, AppY" /></Field>
            </Section>

            <Section num="03" title="Marca e Presença">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Cores da empresa"><input style={inputStyle} value={modal.cores_empresa} onChange={e => set('cores_empresa', e.target.value)} placeholder="ex: #FF0000, #063BF8" /></Field>
                <Field label="Domínio"><input style={inputStyle} value={modal.dominio} onChange={e => set('dominio', e.target.value)} placeholder="ex: meusistema.com.br" /></Field>
              </div>
              <Toggle id="whatsapp_business" label="WhatsApp Business" sub="Cliente usa/quer integração com WhatsApp" checked={modal.whatsapp_business} onChange={e => set('whatsapp_business', e.target.checked)} />
              <div style={{ marginTop: 12 }}>
                <Field label="Redes sociais"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} value={modal.redes_sociais} onChange={e => set('redes_sociais', e.target.value)} placeholder="ex: @instagram, facebook.com/pagina" /></Field>
                <Field label="Palavras-chave"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} value={modal.palavras_chave} onChange={e => set('palavras_chave', e.target.value)} placeholder="ex: pilates, funcional, saúde" /></Field>
              </div>
            </Section>

            <Section num="04" title="Prazo e Orçamento">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Prazo desejado"><input type="date" style={inputStyle} value={modal.prazo_desejado || ''} onChange={e => set('prazo_desejado', e.target.value)} /></Field>
                <Field label="Faixa de orçamento" required>
                  {chips('orcamento_faixa', ORCAMENTO_CHOICES)}
                </Field>
              </div>
            </Section>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                ❌ Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : '💾 Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ModalConfirmar config={modalConfirmar} onClose={() => setModalConfirmar(null)} />
    </SistemaLayout>
  )
}
