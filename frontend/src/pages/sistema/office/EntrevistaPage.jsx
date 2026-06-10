import { useState, useEffect } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import api from '../../../services/api'

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

const SEGMENTOS = [
  { key: 'SAUDE', label: 'Saúde / Bem-estar' },
  { key: 'BELEZA', label: 'Beleza' },
  { key: 'VAREJO', label: 'Varejo' },
  { key: 'ALIMENTACAO', label: 'Alimentação' },
  { key: 'SERVICOS', label: 'Serviços' },
  { key: 'EDUCACAO', label: 'Educação' },
  { key: 'OUTRO', label: 'Outro' },
]

const ORCAMENTOS = [
  { key: 'MEI', label: 'MEI' },
  { key: 'PEQUENO', label: 'Pequeno' },
  { key: 'MEDIO', label: 'Médio' },
]

export default function EntrevistaPage() {
  const [prospectos, setProspectos] = useState([])

  const [form, setForm] = useState({
    prospecto: '',
    sistema: '',
    descricao: '',
    cores_empresa: '',
    dominio: '',
    whatsapp_business: false,
    redes_sociais: '',
    palavras_chave: '',
    segmento: '',
    publico_alvo: '',
    concorrentes: '',
    prazo_desejado: '',
    orcamento_faixa: '',
  })

  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/prospectos/').then(r => setProspectos(r.data.results)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.prospecto) { setErro('Selecione o prospecto.'); return }
    if (!form.sistema) { setErro('Preencha o nome do sistema.'); return }
    if (form.descricao.length < 500) { setErro('A descrição precisa ter no mínimo 500 caracteres.'); return }
    setSalvando(true); setErro('')
    try {
      const payload = {
        ...form,
        prazo_desejado: form.prazo_desejado || null,
      }
      await api.post('/entrevistas/', payload)
      setSucesso(true)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !data.detail) {
        const msgs = Object.entries(data).map(([campo, erros]) =>
          `${campo}: ${Array.isArray(erros) ? erros.join(', ') : erros}`
        )
        setErro(msgs.join(' | '))
      } else {
        setErro(data?.detail || 'Erro ao salvar. Tente novamente.')
      }
    } finally {
      setSalvando(false)
    }
  }

  if (sucesso) return (
    <SistemaLayout titulo="Novo Projeto">
      <div style={{ maxWidth: 540, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
        <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Entrevista salva!</h2>
        <p style={{ color: '#a78bca', fontSize: 14, marginBottom: 24 }}>O próximo passo é preencher a Arquitetura Técnica.</p>
        <button onClick={() => { setSucesso(false); setForm(f => ({ ...f, prospecto: '', sistema: '', descricao: '', cores_empresa: '', dominio: '', whatsapp_business: false, redes_sociais: '', palavras_chave: '', segmento: '', publico_alvo: '', concorrentes: '', prazo_desejado: '', orcamento_faixa: '' })) }}
          style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          ➕ Nova entrevista
        </button>
      </div>
    </SistemaLayout>
  )

  return (
    <SistemaLayout titulo="Novo Projeto">
      <form onSubmit={handleSubmit} style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>Entrevista</h1>
          <p style={{ fontSize: 14, color: '#a78bca' }}>Levantamento de requisitos do projeto. Preencha os dados e salve no banco.</p>
        </div>

        {erro && <div style={{ background: 'rgba(248,71,71,0.1)', border: '1px solid rgba(248,71,71,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#f87171', fontSize: 14 }}>{erro}</div>}

        <Section num="01" title="Identificação">
          <Field label="Prospecto" required>
            <select style={inputStyle} value={form.prospecto} onChange={e => set('prospecto', e.target.value)}>
              <option value="">Selecione...</option>
              {prospectos.map(p => <option key={p.id} value={p.id}>{p.nome_empresa}</option>)}
            </select>
          </Field>
          <Field label="Nome do sistema" required>
            <input style={inputStyle} value={form.sistema} onChange={e => set('sistema', e.target.value)} maxLength={100} placeholder="ex: Sistema Gestão Salão" />
          </Field>
          <Field label="Descrição do projeto" required>
            <textarea style={{ ...inputStyle, minHeight: 140, resize: 'vertical', lineHeight: 1.6 }} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descreva o projeto com detalhes — mínimo 500 caracteres" />
            <div style={{ fontSize: 12, color: form.descricao.length >= 500 ? '#10b981' : '#6b6b8a', marginTop: 4 }}>
              {form.descricao.length}/500 caracteres
            </div>
          </Field>
        </Section>

        <Section num="02" title="Marca e Presença">
          <Field label="Cores da empresa">
            <input style={inputStyle} value={form.cores_empresa} onChange={e => set('cores_empresa', e.target.value)} maxLength={100} placeholder="ex: Azul Royal, Branco" />
          </Field>
          <Field label="Domínio">
            <input style={inputStyle} value={form.dominio} onChange={e => set('dominio', e.target.value)} maxLength={200} placeholder="ex: meusistema.com.br" />
          </Field>
          <Toggle id="whatsapp_business" label="WhatsApp Business" sub="O cliente usa WhatsApp Business?" checked={form.whatsapp_business} onChange={e => set('whatsapp_business', e.target.checked)} />
          <Field label="Redes sociais">
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.6 }} value={form.redes_sociais} onChange={e => set('redes_sociais', e.target.value)} placeholder="ex: Instagram @salao, Facebook /salao" />
          </Field>
        </Section>

        <Section num="03" title="Mercado">
          <Field label="Palavras-chave">
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.6 }} value={form.palavras_chave} onChange={e => set('palavras_chave', e.target.value)} placeholder="ex: agendamento, gestão de clientes, controle financeiro" />
          </Field>
          <Field label="Segmento">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {SEGMENTOS.map(s => (
                <Chip key={s.key} label={s.label} active={form.segmento === s.key} onClick={() => set('segmento', s.key)} />
              ))}
            </div>
          </Field>
          <Field label="Público-alvo">
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.6 }} value={form.publico_alvo} onChange={e => set('publico_alvo', e.target.value)} placeholder="ex: Donos de estúdios de pilates, 30-50 anos, Uberlândia/MG" />
          </Field>
          <Field label="Concorrentes">
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.6 }} value={form.concorrentes} onChange={e => set('concorrentes', e.target.value)} placeholder="ex: Zenfit, Tecnofit, planilhas manuais" />
          </Field>
        </Section>

        <Section num="04" title="Escopo">
          <Field label="Prazo desejado">
            <input type="date" style={inputStyle} value={form.prazo_desejado} onChange={e => set('prazo_desejado', e.target.value)} />
          </Field>
          <Field label="Faixa de orçamento">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {ORCAMENTOS.map(o => (
                <Chip key={o.key} label={o.label} active={form.orcamento_faixa === o.key} onClick={() => set('orcamento_faixa', o.key)} />
              ))}
            </div>
          </Field>
        </Section>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="button" onClick={() => window.history.back()}
            style={{ padding: '11px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#a78bca' }}>
            Voltar
          </button>
          <button type="submit" disabled={salvando || form.descricao.length < 500}
            style={{ flex: 1, padding: '11px 20px', background: (salvando || form.descricao.length < 500) ? '#1a2a6b' : '#063BF8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (salvando || form.descricao.length < 500) ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {salvando ? 'Salvando...' : '💾 Salvar Entrevista →'}
          </button>
        </div>

      </form>
    </SistemaLayout>
  )
}
