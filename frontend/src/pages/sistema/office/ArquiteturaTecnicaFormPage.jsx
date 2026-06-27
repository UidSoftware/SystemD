import { useState, useEffect, useCallback } from 'react'
import SistemaLayout from '../../../components/sistema/SistemaLayout'
import api from '../../../services/api'

// ── Estilos compartilhados ─────────────────────────────────────────────────
const IS = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#f1f5f9', padding: '8px 12px', fontSize: 13,
  outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
}
const thS = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#a78bca', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'left' }
const tdS = { padding: '10px 14px', fontSize: 13, color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.04)' }
const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }

function Chip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
      background: active ? 'rgba(6,59,248,0.15)' : 'rgba(255,255,255,0.04)',
      border: active ? '1px solid #063BF8' : '1px solid rgba(255,255,255,0.1)',
      color: active ? '#6b8fff' : '#a78bca', fontWeight: active ? 600 : 400,
    }}>{label}</button>
  )
}
function Toggle({ label, sub, checked, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <div style={{ fontSize: 13, color: '#f1f5f9' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#6b6b8a', marginTop: 1 }}>{sub}</div>}
      </div>
      <label style={{ position: 'relative', width: 38, height: 22, flexShrink: 0, marginLeft: 16, cursor: 'pointer' }}>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: 22, background: checked ? '#063BF8' : '#3a3a4a', transition: 'background 0.2s' }}>
          <span style={{ position: 'absolute', width: 16, height: 16, left: checked ? 19 : 3, bottom: 3, background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
        </span>
      </label>
    </div>
  )
}
function Sec({ num, title, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px', marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b6b8a', marginBottom: 10, fontFamily: 'monospace' }}>{num} — {title}</div>
      {children}
    </div>
  )
}
function Fld({ label, required, children }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <label style={{ display: 'block', fontSize: 11, color: '#a78bca', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#f87171', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Stack padrão Uid ───────────────────────────────────────────────────────
const STACK_PADRAO = {
  linguagem: 'Python', framework: 'Django REST Framework', banco: 'PostgreSQL',
  autenticacao: 'JWT', padrao_api: 'REST', frontend_fw: 'React 18',
  build_tool: 'Vite', estilizacao: 'Tailwind CSS', estado_global: 'Zustand',
  server_state: 'TanStack Query',
}
const STACK_LABELS = {
  linguagem: 'Linguagem', framework: 'Framework', banco: 'Banco', autenticacao: 'Autenticação',
  padrao_api: 'API', frontend_fw: 'Framework FE', build_tool: 'Build', estilizacao: 'Estilização',
  estado_global: 'Estado global', server_state: 'Server state',
}

const hoje = new Date().toISOString().split('T')[0]
const FORM_VAZIO = {
  entrevista: '',
  projeto: '', cliente: '', versao: '1.0.0', data_levantamento: hoje, responsavel: '',
  linguagem: 'Python', framework: 'Django REST Framework', banco: 'PostgreSQL',
  autenticacao: 'JWT', padrao_api: 'REST',
  frontend_fw: 'React 18', build_tool: 'Vite', estilizacao: 'Tailwind CSS',
  estado_global: 'Zustand', server_state: 'TanStack Query',
  ambiente_deploy: 'VPS própria (Uid Software)', servidor_web: 'Nginx',
  docker: true, ssl: true, cicd: false, pwa: false, dominio_uid: false,
  padrao_rotas: '', perfis_acesso: '', integracoes: '', restricoes: '', notas_claude: '',
}

// ── Página principal ───────────────────────────────────────────────────────
export default function ArquiteturaTecnicaFormPage() {
  const [lista, setLista]             = useState([])
  const [total, setTotal]             = useState(0)
  const [carregando, setCarregando]   = useState(true)
  const [pagina, setPagina]           = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [entrevistas, setEntrevistas] = useState([])
  const [modal, setModal]             = useState(null)
  const [editandoId, setEditandoId]   = useState(null)
  const [salvando, setSalvando]       = useState(false)
  const [erro, setErro]               = useState('')

  const carregar = useCallback(async (pag = 1) => {
    setCarregando(true)
    try {
      const res = await api.get('/arquitetura-tecnica/', { params: { page: pag } })
      setLista(res.data.results)
      setTotal(res.data.count)
      setTotalPaginas(Math.ceil(res.data.count / 20))
    } finally { setCarregando(false) }
  }, [])

  useEffect(() => {
    carregar()
    api.get('/entrevistas/?page_size=200').then(r => setEntrevistas(r.data.results || [])).catch(() => {})
  }, [])

  const abrirNovo = () => {
    setEditandoId(null)
    setModal({ ...FORM_VAZIO })
    setErro('')
  }

  const abrirEditar = (a) => {
    setEditandoId(a.id)
    const m = { ...FORM_VAZIO }
    Object.keys(m).forEach(k => { if (a[k] !== undefined) m[k] = a[k] })
    setModal(m)
    setErro('')
  }

  const excluir = async (id) => {
    if (!window.confirm('Excluir esta arquitetura técnica?')) return
    await api.delete('/arquitetura-tecnica/' + id + '/')
    carregar(pagina)
  }

  const set = (k, v) => setModal(m => ({ ...m, [k]: v }))

  const selecionarEntrevista = (id) => {
    const e = entrevistas.find(en => String(en.id) === String(id))
    setModal(m => ({
      ...m,
      entrevista: id,
      projeto: e?.sistema || m.projeto,
      cliente: e?.prospecto_nome || m.cliente,
    }))
  }

  const chips = (field, options) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {options.map(op => <Chip key={op} label={op} active={modal[field] === op} onClick={() => set(field, op)} />)}
    </div>
  )

  const salvar = async () => {
    if (!modal.entrevista) { setErro('Selecione a entrevista de origem.'); return }
    if (!modal.projeto || !modal.cliente) { setErro('Preencha o nome do projeto e o cliente.'); return }
    setSalvando(true); setErro('')
    try {
      if (editandoId) await api.patch('/arquitetura-tecnica/' + editandoId + '/', modal)
      else            await api.post('/arquitetura-tecnica/', modal)
      setModal(null); carregar(pagina)
    } catch (e) {
      setErro(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const divergencias = modal
    ? Object.entries(STACK_PADRAO).filter(([c, p]) => modal[c] !== p).map(([c, p]) => ({ c, label: STACK_LABELS[c], padrao: p, atual: modal[c] }))
    : []

  const entrevistaSelecionada = modal ? entrevistas.find(e => String(e.id) === String(modal?.entrevista)) : null

  return (
    <SistemaLayout titulo="Novo Projeto">
      <div style={{ padding: '24px 28px', maxWidth: 1300, margin: '0 auto' }}>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Arquitetura Técnica</h1>
            <p style={{ fontSize: 13, color: '#a78bca', marginTop: 4 }}>{total} arquitetura{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={abrirNovo}
            style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova Arquitetura
          </button>
        </div>

        {/* Tabela */}
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Projeto', 'Cliente', 'Stack BE', 'Stack FE', 'Deploy', 'Versão', 'Data', 'Ações'].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={8} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Carregando...</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdS, textAlign: 'center', color: '#a78bca', padding: 32 }}>Nenhuma arquitetura encontrada</td></tr>
              ) : lista.map(a => (
                <tr key={a.id}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(6,59,248,0.05)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...tdS, fontWeight: 600 }}>{a.projeto}</td>
                  <td style={tdS}>{a.cliente}</td>
                  <td style={{ ...tdS, fontSize: 12, color: '#a78bca' }}>{a.linguagem} / {a.framework?.split(' ')[0]}</td>
                  <td style={{ ...tdS, fontSize: 12, color: '#a78bca' }}>{a.frontend_fw}</td>
                  <td style={{ ...tdS, fontSize: 12 }}>{a.ambiente_deploy?.replace(' (Uid Software)', '')}</td>
                  <td style={{ ...tdS, fontFamily: 'monospace', fontSize: 12 }}>{a.versao}</td>
                  <td style={{ ...tdS, color: '#94a3b8', fontSize: 12 }}>{new Date(a.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td style={tdS}>
                    <button onClick={() => abrirEditar(a)}
                      style={{ background: 'rgba(6,59,248,0.15)', color: '#6b8fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                      Editar
                    </button>
                    <button onClick={() => excluir(a.id)}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div style={{ background: '#0f0020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 820, padding: 24, marginTop: 16, marginBottom: 16 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 18 }}>
              {editandoId ? 'Editar Arquitetura Técnica' : 'Nova Arquitetura Técnica'}
            </h2>

            {erro && <div style={{ background: 'rgba(248,71,71,0.1)', border: '1px solid rgba(248,71,71,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>{erro}</div>}

            {/* Alerta de divergência de stack */}
            {divergencias.length > 0 && (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>⚠️ Stack fora do padrão Uid</div>
                {divergencias.map(d => (
                  <div key={d.c} style={{ fontSize: 11, color: '#e2d9f3', lineHeight: 1.7 }}>• {d.label}: <strong>{d.atual}</strong> (padrão: {d.padrao})</div>
                ))}
              </div>
            )}

            <Sec num="01" title="Identificação">
              <Fld label="Entrevista de origem" required>
                <select style={IS} value={modal.entrevista} onChange={e => selecionarEntrevista(e.target.value)}>
                  <option value="">Selecione...</option>
                  {entrevistas.map(en => <option key={en.id} value={en.id}>{en.sistema} — {en.prospecto_nome}</option>)}
                </select>
              </Fld>

              {entrevistaSelecionada && (
                <div style={{ background: 'rgba(6,59,248,0.08)', border: '1px solid rgba(6,59,248,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b8fff', marginBottom: 6 }}>🔗 Lead → Prospecto → Entrevista</div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div><div style={{ fontSize: 10, color: '#6b6b8a' }}>Prospecto</div><div style={{ fontSize: 13, color: '#e2d9f3' }}>{entrevistaSelecionada.prospecto_nome}</div></div>
                    <div><div style={{ fontSize: 10, color: '#6b6b8a' }}>Sistema</div><div style={{ fontSize: 13, color: '#e2d9f3' }}>{entrevistaSelecionada.sistema}</div></div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Fld label="Nome do projeto" required><input style={IS} value={modal.projeto} onChange={e => set('projeto', e.target.value)} /></Fld>
                <Fld label="Cliente" required><input style={IS} value={modal.cliente} onChange={e => set('cliente', e.target.value)} /></Fld>
                <Fld label="Versão"><input style={IS} value={modal.versao} onChange={e => set('versao', e.target.value)} /></Fld>
                <Fld label="Data de levantamento"><input type="date" style={IS} value={modal.data_levantamento} onChange={e => set('data_levantamento', e.target.value)} /></Fld>
              </div>
              <Fld label="Responsável técnico"><input style={IS} value={modal.responsavel} onChange={e => set('responsavel', e.target.value)} placeholder="seu nome" /></Fld>
            </Sec>

            <Sec num="02" title="Stack Backend">
              <Fld label="Linguagem">{chips('linguagem', ['Python', 'PHP', 'Node.js', 'Java', 'Go', 'Outro'])}</Fld>
              <Fld label="Framework">{chips('framework', ['Django REST Framework', 'FastAPI', 'Laravel', 'Express', 'Spring Boot', 'Nenhum'])}</Fld>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <Fld label="Banco de dados">
                  <select style={IS} value={modal.banco} onChange={e => set('banco', e.target.value)}>
                    {['PostgreSQL','MySQL','SQLite','MongoDB','Redis'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Fld>
                <Fld label="Autenticação">
                  <select style={IS} value={modal.autenticacao} onChange={e => set('autenticacao', e.target.value)}>
                    {['JWT','Session / Cookie','OAuth2','API Key'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Fld>
              </div>
              <Fld label="Padrão de API">{chips('padrao_api', ['REST', 'GraphQL', 'gRPC', 'Sem API'])}</Fld>
            </Sec>

            <Sec num="03" title="Stack Frontend">
              <Fld label="Framework">{chips('frontend_fw', ['React 18', 'Vue 3', 'Angular', 'Next.js', 'HTML/CSS puro', 'Sem frontend'])}</Fld>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <Fld label="Build tool">
                  <select style={IS} value={modal.build_tool} onChange={e => set('build_tool', e.target.value)}>
                    {['Vite','Webpack','Create React App','Não aplicável'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Fld>
                <Fld label="Estilização">
                  <select style={IS} value={modal.estilizacao} onChange={e => set('estilizacao', e.target.value)}>
                    {['Tailwind CSS','CSS Modules','Styled Components','SASS/SCSS','CSS puro'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Fld>
              </div>
              <Fld label="Estado global">{chips('estado_global', ['Zustand', 'Redux Toolkit', 'Context API', 'Pinia', 'Não aplicável'])}</Fld>
              <Fld label="Server state">{chips('server_state', ['TanStack Query', 'SWR', 'Apollo Client', 'Fetch direto', 'Não aplicável'])}</Fld>
            </Sec>

            <Sec num="04" title="Infraestrutura">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <Fld label="Ambiente de deploy">
                  <select style={IS} value={modal.ambiente_deploy} onChange={e => set('ambiente_deploy', e.target.value)}>
                    {['VPS própria (Uid Software)','VPS do cliente','Vercel / Netlify','AWS / GCP / Azure','Shared hosting'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Fld>
                <Fld label="Servidor web">
                  <select style={IS} value={modal.servidor_web} onChange={e => set('servidor_web', e.target.value)}>
                    {['Nginx','Apache','Caddy','Não aplicável'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Fld>
              </div>
              {[
                { id: 'docker', label: 'Docker / Docker Compose', sub: 'Containerização do ambiente' },
                { id: 'ssl', label: 'SSL / HTTPS', sub: "Let's Encrypt via Certbot" },
                { id: 'cicd', label: 'CI/CD', sub: 'GitHub Actions' },
                { id: 'pwa', label: 'PWA', sub: 'Instalável em mobile' },
                { id: 'dominio_uid', label: 'Domínio gerenciado pela Uid' },
              ].map(t => <Toggle key={t.id} {...t} checked={modal[t.id]} onChange={e => set(t.id, e.target.checked)} />)}
            </Sec>

            <Sec num="05" title="Estrutura e Observações">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Fld label="Padrão de URL"><input style={IS} value={modal.padrao_rotas} onChange={e => set('padrao_rotas', e.target.value)} placeholder="ex: /sistema/, /api/" /></Fld>
                <Fld label="Perfis de acesso"><input style={IS} value={modal.perfis_acesso} onChange={e => set('perfis_acesso', e.target.value)} placeholder="ex: Admin, Recepcionista" /></Fld>
              </div>
              <Fld label="Integrações externas">
                <textarea style={{ ...IS, minHeight: 60, resize: 'vertical', lineHeight: 1.6 }} value={modal.integracoes} onChange={e => set('integracoes', e.target.value)} placeholder="ex: WhatsApp API, Stripe..." />
              </Fld>
              <Fld label="Restrições / requisitos especiais">
                <textarea style={{ ...IS, minHeight: 60, resize: 'vertical', lineHeight: 1.6 }} value={modal.restricoes} onChange={e => set('restricoes', e.target.value)} />
              </Fld>
              <Fld label="Notas para o Claude Code">
                <textarea style={{ ...IS, minHeight: 60, resize: 'vertical', lineHeight: 1.6 }} value={modal.notas_claude} onChange={e => set('notas_claude', e.target.value)} />
              </Fld>
            </Sec>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setModal(null)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a78bca', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Criar Arquitetura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SistemaLayout>
  )
}
