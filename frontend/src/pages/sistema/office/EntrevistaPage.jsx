import { useEffect, useState } from 'react'
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

export default function EntrevistaPage() {
  const [clientes, setClientes] = useState([])

  const [form, setForm] = useState({
    cliente: '', sistema: '', descricao: '',
    cores_empresa: '', dominio: '', whatsapp_business: false,
    redes_sociais: '', palavras_chave: '',
    segmento: '', publico_alvo: '', concorrentes: '',
    prazo_desejado: '', orcamento_faixa: '',
  })

  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/clientes/').then(response => {
      setClientes(response.data.results)
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.cliente || !form.sistema || !form.descricao || !form.segmento || !form.orcamento_faixa) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }
    setSalvando(true); setErro('')
    try {
      const payload = {
        ...form,
        prazo_desejado: form.prazo_desejado ? form.prazo_desejado : null,
      }
      await api.post('/entrevistas/', payload)
      setSucesso(true)
    } catch (err) {
      const data = err.response?.data
      let msg = data?.detail
      if (!msg && data && typeof data === 'object') {
        msg = Object.values(data).flat().join(' ')
      }
      setErro(msg || 'Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const resetForm = () => {
    setSucesso(false)
    setForm({
      cliente: '', sistema: '', descricao: '',
      cores_empresa: '', dominio: '', whatsapp_business: false,
      redes_sociais: '', palavras_chave: '',
      segmento: '', publico_alvo: '', concorrentes: '',
      prazo_desejado: '', orcamento_faixa: '',
    })
  }

  if (sucesso) return (
    <SistemaLayout titulo="Novo Projeto — Entrevista">
      <div style={{ maxWidth: 540, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
        <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Entrevista salva!</h2>
        <p style={{ color: '#a78bca', fontSize: 14, marginBottom: 24 }}>O Planner já pode ler via MCP e iniciar a próxima fase.</p>
        <div style={{ background: 'rgba(6,59,248,0.1)', border: '1px solid rgba(6,59,248,0.3)', borderRadius: 10, padding: '12px 20px', marginBottom: 24, textAlign: 'left' }}>
          <p style={{ color: '#6b8fff', fontSize: 13, fontFamily: 'monospace' }}>
            "Planner, nova entrevista salva para <strong>{form.sistema}</strong>. Inicie a próxima fase."
          </p>
        </div>
        <button onClick={resetForm}
          style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          ➕ Nova entrevista
        </button>
      </div>
    </SistemaLayout>
  )

  return (
    <SistemaLayout titulo="Novo Projeto — Entrevista">
      <form onSubmit={handleSubmit} style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>Entrevista</h1>
          <p style={{ fontSize: 14, color: '#a78bca' }}>Levantamento de requisitos — dados salvos no banco para o Planner.</p>
        </div>

        {erro && <div style={{ background: 'rgba(248,71,71,0.1)', border: '1px solid rgba(248,71,71,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#f87171', fontSize: 14 }}>{erro}</div>}

        <Section num="01" title="Identificação">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Cliente" required>
              <select style={inputStyle} value={form.cliente} onChange={e => set('cliente', e.target.value)}>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
              </select>
            </Field>
            <Field label="Sistema" required><input style={inputStyle} value={form.sistema} onChange={e => set('sistema', e.target.value)} placeholder="ex: Sistema de Gestão Salão" /></Field>
          </div>
        </Section>

        <Section num="02" title="Descritivo">
          <Field label="Descrição do projeto" required>
            <textarea style={{ ...inputStyle, minHeight: 160, resize: 'vertical', lineHeight: 1.6 }} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descreva o projeto com detalhes — o que o cliente precisa, contexto do negócio, fluxos principais..." />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Segmento" required>
              <select style={inputStyle} value={form.segmento} onChange={e => set('segmento', e.target.value)}>
                <option value="">Selecione...</option>
                {SEGMENTO_CHOICES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Público-alvo"><input style={inputStyle} value={form.publico_alvo} onChange={e => set('publico_alvo', e.target.value)} placeholder="ex: mulheres 25-45 anos, classe B/C" /></Field>
          </div>
          <Field label="Concorrentes"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} value={form.concorrentes} onChange={e => set('concorrentes', e.target.value)} placeholder="ex: SistemaX, AppY" /></Field>
        </Section>

        <Section num="03" title="Marca e Presença">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Cores da empresa"><input style={inputStyle} value={form.cores_empresa} onChange={e => set('cores_empresa', e.target.value)} placeholder="ex: #FF0000, #063BF8" /></Field>
            <Field label="Domínio"><input style={inputStyle} value={form.dominio} onChange={e => set('dominio', e.target.value)} placeholder="ex: meusistema.com.br" /></Field>
          </div>
          <Toggle id="whatsapp_business" label="WhatsApp Business" sub="Cliente usa/quer integração com WhatsApp" checked={form.whatsapp_business} onChange={e => set('whatsapp_business', e.target.checked)} />
          <div style={{ marginTop: 12 }}>
            <Field label="Redes sociais"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} value={form.redes_sociais} onChange={e => set('redes_sociais', e.target.value)} placeholder="ex: @instagram, facebook.com/pagina" /></Field>
            <Field label="Palavras-chave"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} value={form.palavras_chave} onChange={e => set('palavras_chave', e.target.value)} placeholder="ex: pilates, funcional, saúde" /></Field>
          </div>
        </Section>

        <Section num="04" title="Prazo e Orçamento">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Prazo desejado"><input type="date" style={inputStyle} value={form.prazo_desejado} onChange={e => set('prazo_desejado', e.target.value)} /></Field>
            <Field label="Faixa de orçamento" required>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {ORCAMENTO_CHOICES.map(o => (
                  <Chip key={o.value} label={o.label} active={form.orcamento_faixa === o.value} onClick={() => set('orcamento_faixa', o.value)} />
                ))}
              </div>
            </Field>
          </div>
        </Section>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="button" onClick={() => window.history.back()}
            style={{ padding: '11px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#a78bca' }}>
            Voltar
          </button>
          <button type="submit" disabled={salvando}
            style={{ flex: 1, padding: '11px 20px', background: salvando ? '#1a2a6b' : '#063BF8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {salvando ? 'Salvando no banco...' : '💾 Salvar Entrevista →'}
          </button>
        </div>

      </form>
    </SistemaLayout>
  )
}
