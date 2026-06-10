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

export default function ArquiteturaTecnicaFormPage() {
  const hoje = new Date().toISOString().split('T')[0]

  const [entrevistas, setEntrevistas] = useState([])

  const [form, setForm] = useState({
    entrevista: '',
    projeto: '', cliente: '', versao: '1.0.0', data_levantamento: hoje, responsavel: '',
    linguagem: 'Python', framework: 'Django REST Framework', banco: 'PostgreSQL',
    autenticacao: 'JWT', padrao_api: 'REST',
    frontend_fw: 'React 18', build_tool: 'Vite', estilizacao: 'Tailwind CSS',
    estado_global: 'Zustand', server_state: 'TanStack Query',
    ambiente_deploy: 'VPS própria (Uid Software)', servidor_web: 'Nginx',
    docker: true, ssl: true, cicd: false, pwa: false, dominio_uid: false,
    padrao_rotas: '', perfis_acesso: '',
    integracoes: '', restricoes: '', notas_claude: '',
  })

  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/entrevistas/').then(r => setEntrevistas(r.data.results)).catch(() => {})
  }, [])

  const entrevistaSelecionada = entrevistas.find(e => String(e.id) === String(form.entrevista))

  const selecionarEntrevista = (id) => {
    const e = entrevistas.find(ent => String(ent.id) === String(id))
    setForm(f => ({
      ...f,
      entrevista: id,
      projeto: e?.sistema || f.projeto,
      cliente: e?.prospecto_nome || f.cliente,
    }))
  }

  const chips = (field, options) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
      {options.map(op => (
        <Chip key={op} label={op} active={form[field] === op} onClick={() => set(field, op)} />
      ))}
    </div>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.entrevista) { setErro('Selecione a entrevista de origem.'); return }
    if (!form.projeto || !form.cliente) { setErro('Preencha o nome do projeto e o cliente.'); return }
    setSalvando(true); setErro('')
    try {
      await api.post('/arquitetura-tecnica/', form)
      setSucesso(true)
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  if (sucesso) return (
    <SistemaLayout titulo="Novo Projeto">
      <div style={{ maxWidth: 540, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏗️</div>
        <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Arquitetura salva!</h2>
        <p style={{ color: '#a78bca', fontSize: 14, marginBottom: 24 }}>O Planner já pode ler via MCP e iniciar a esteira.</p>
        <div style={{ background: 'rgba(6,59,248,0.1)', border: '1px solid rgba(6,59,248,0.3)', borderRadius: 10, padding: '12px 20px', marginBottom: 24, textAlign: 'left' }}>
          <p style={{ color: '#6b8fff', fontSize: 13, fontFamily: 'monospace' }}>
            "Planner, nova arquitetura salva para <strong>{form.projeto}</strong>. Inicie o pipeline."
          </p>
        </div>
        <button onClick={() => { setSucesso(false); setForm(f => ({ ...f, entrevista: '', projeto: '', cliente: '' })) }}
          style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          ➕ Novo projeto
        </button>
      </div>
    </SistemaLayout>
  )

  return (
    <SistemaLayout titulo="Novo Projeto">
      <form onSubmit={handleSubmit} style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>Arquitetura Técnica</h1>
          <p style={{ fontSize: 14, color: '#a78bca' }}>Preencha os dados do projeto. Tudo salvo no banco — o Planner lê via MCP.</p>
        </div>

        {erro && <div style={{ background: 'rgba(248,71,71,0.1)', border: '1px solid rgba(248,71,71,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#f87171', fontSize: 14 }}>{erro}</div>}

        <Section num="01" title="Identificação">
          <Field label="Entrevista" required>
            <select style={inputStyle} value={form.entrevista} onChange={e => selecionarEntrevista(e.target.value)}>
              <option value="">Selecione...</option>
              {entrevistas.map(en => <option key={en.id} value={en.id}>{en.sistema} — {en.prospecto_nome}</option>)}
            </select>
          </Field>

          {entrevistaSelecionada && (
            <div style={{ background: 'rgba(6,59,248,0.08)', border: '1px solid rgba(6,59,248,0.25)', borderRadius: 8, padding: '12px 14px', marginBottom: '1rem' }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b8fff', marginBottom: 8 }}>🔗 Cadeia Lead → Prospecto → Entrevista</div>
              {entrevistaSelecionada.lead_mensagem && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#6b6b8a' }}>📨 Mensagem do Lead ({entrevistaSelecionada.lead_nome})</div>
                  <div style={{ fontSize: 13, color: '#e2d9f3', lineHeight: 1.5 }}>{entrevistaSelecionada.lead_mensagem}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6b6b8a' }}>Prospecto</div>
                  <div style={{ fontSize: 13, color: '#e2d9f3' }}>{entrevistaSelecionada.prospecto_nome}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6b6b8a' }}>Sistema (Entrevista)</div>
                  <div style={{ fontSize: 13, color: '#e2d9f3' }}>{entrevistaSelecionada.sistema}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Nome do projeto" required><input style={inputStyle} value={form.projeto} onChange={e => set('projeto', e.target.value)} placeholder="ex: Sistema Salão Corte & Estilo" /></Field>
            <Field label="Cliente" required><input style={inputStyle} value={form.cliente} onChange={e => set('cliente', e.target.value)} placeholder="ex: Corte & Estilo" /></Field>
            <Field label="Versão"><input style={inputStyle} value={form.versao} onChange={e => set('versao', e.target.value)} /></Field>
            <Field label="Data de levantamento"><input type="date" style={inputStyle} value={form.data_levantamento} onChange={e => set('data_levantamento', e.target.value)} /></Field>
          </div>
          <Field label="Responsável técnico"><input style={inputStyle} value={form.responsavel} onChange={e => set('responsavel', e.target.value)} placeholder="seu nome" /></Field>
        </Section>

        <Section num="02" title="Stack Backend">
          <Field label="Linguagem">{chips('linguagem', ['Python', 'PHP', 'Node.js', 'Java', 'Go', 'Outro'])}</Field>
          <Field label="Framework">{chips('framework', ['Django REST Framework', 'FastAPI', 'Laravel', 'Express', 'Spring Boot', 'Nenhum'])}</Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <Field label="Banco de dados">
              <select style={inputStyle} value={form.banco} onChange={e => set('banco', e.target.value)}>
                {['PostgreSQL','MySQL','SQLite','MongoDB','Redis'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Autenticação">
              <select style={inputStyle} value={form.autenticacao} onChange={e => set('autenticacao', e.target.value)}>
                {['JWT','Session / Cookie','OAuth2','API Key'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Padrão de API">{chips('padrao_api', ['REST', 'GraphQL', 'gRPC', 'Sem API'])}</Field>
        </Section>

        <Section num="03" title="Stack Frontend">
          <Field label="Framework">{chips('frontend_fw', ['React 18', 'Vue 3', 'Angular', 'Next.js', 'HTML/CSS puro', 'Sem frontend'])}</Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <Field label="Build tool">
              <select style={inputStyle} value={form.build_tool} onChange={e => set('build_tool', e.target.value)}>
                {['Vite','Webpack','Create React App','Não aplicável'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Estilização">
              <select style={inputStyle} value={form.estilizacao} onChange={e => set('estilizacao', e.target.value)}>
                {['Tailwind CSS','CSS Modules','Styled Components','SASS/SCSS','CSS puro'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Estado global">{chips('estado_global', ['Zustand', 'Redux Toolkit', 'Context API', 'Pinia', 'Não aplicável'])}</Field>
          <Field label="Server state">{chips('server_state', ['TanStack Query', 'SWR', 'Apollo Client', 'Fetch direto', 'Não aplicável'])}</Field>
        </Section>

        <Section num="04" title="Infraestrutura">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Ambiente de deploy">
              <select style={inputStyle} value={form.ambiente_deploy} onChange={e => set('ambiente_deploy', e.target.value)}>
                {['VPS própria (Uid Software)','VPS do cliente','Vercel / Netlify','AWS / GCP / Azure','Shared hosting'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Servidor web">
              <select style={inputStyle} value={form.servidor_web} onChange={e => set('servidor_web', e.target.value)}>
                {['Nginx','Apache','Caddy','Não aplicável'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 8 }}>
            {[
              { id: 'docker', label: 'Docker / Docker Compose', sub: 'Containerização do ambiente' },
              { id: 'ssl', label: 'SSL / HTTPS', sub: "Let's Encrypt via Certbot" },
              { id: 'cicd', label: 'CI/CD', sub: 'GitHub Actions — deploy automático' },
              { id: 'pwa', label: 'PWA', sub: 'Instalável em mobile' },
              { id: 'dominio_uid', label: 'Domínio gerenciado pela Uid', sub: 'Uid compra e configura o domínio' },
            ].map(t => <Toggle key={t.id} {...t} checked={form[t.id]} onChange={e => set(t.id, e.target.checked)} />)}
          </div>
        </Section>

        <Section num="05" title="Estrutura de Rotas">
          <Field label="Padrão de URL"><input style={inputStyle} value={form.padrao_rotas} onChange={e => set('padrao_rotas', e.target.value)} placeholder="ex: / (site), /sistema/ (app), /api/ (backend)" /></Field>
          <Field label="Perfis de acesso"><input style={inputStyle} value={form.perfis_acesso} onChange={e => set('perfis_acesso', e.target.value)} placeholder="ex: Administrador, Recepcionista, Financeiro, Cliente" /></Field>
        </Section>

        <Section num="06" title="Observações">
          <Field label="Integrações externas"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} value={form.integracoes} onChange={e => set('integracoes', e.target.value)} placeholder="ex: WhatsApp API, Stripe, Instagram Graph API..." /></Field>
          <Field label="Restrições ou requisitos especiais"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} value={form.restricoes} onChange={e => set('restricoes', e.target.value)} placeholder="ex: dados sensíveis — aplicar LGPD..." /></Field>
          <Field label="Notas para o Claude Code"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} value={form.notas_claude} onChange={e => set('notas_claude', e.target.value)} placeholder="ex: seguir padrão de cores do cliente, paginação .results sempre..." /></Field>
        </Section>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="button" onClick={() => window.history.back()}
            style={{ padding: '11px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#a78bca' }}>
            Voltar
          </button>
          <button type="submit" disabled={salvando}
            style={{ flex: 1, padding: '11px 20px', background: salvando ? '#1a2a6b' : '#063BF8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {salvando ? 'Salvando no banco...' : '💾 Salvar Arquitetura Técnica →'}
          </button>
        </div>

      </form>
    </SistemaLayout>
  )
}
