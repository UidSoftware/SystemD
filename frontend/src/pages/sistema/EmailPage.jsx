import { useState, useEffect } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import EmailList from '../../components/email/EmailList'
import EmailDetail from '../../components/email/EmailDetail'
import EmailCompose from '../../components/email/EmailCompose'
import { emailApi } from '../../services/emailApi'

const PASTAS_META = {
  'INBOX':   { label: 'Entrada',   icone: '✉' },
  'Sent':    { label: 'Enviados',  icone: '↗' },
  'Drafts':  { label: 'Rascunhos', icone: '✏' },
  'Junk':    { label: 'Spam',      icone: '⚠' },
  'Trash':   { label: 'Lixeira',   icone: '🗑' },
  'Archive': { label: 'Arquivo',   icone: '📁' },
}
const ORDEM = ['INBOX', 'Sent', 'Drafts', 'Junk', 'Trash', 'Archive']

function labelPasta(n) { return PASTAS_META[n]?.label || n }
function iconePasta(n) { return PASTAS_META[n]?.icone || '📁' }

export default function EmailPage() {
  const [emails, setEmails]                     = useState([])
  const [total, setTotal]                       = useState(0)
  const [pagina, setPagina]                     = useState(1)
  const [pastaAtual, setPastaAtual]             = useState('INBOX')
  const [pastas, setPastas]                     = useState([])
  const [emailSelecionado, setEmailSelecionado] = useState(null)
  const [compondo, setCompondo]                 = useState(false)
  const [respondendo, setRespondendo]           = useState(false)
  const [carregando, setCarregando]             = useState(false)
  const [erro, setErro]                         = useState(null)
  const [vista, setVista]                       = useState('lista')
  const [busca, setBusca]                       = useState('')
  const [buscaAtiva, setBuscaAtiva]             = useState('')

  useEffect(() => {
    emailApi.pastas().then(res => {
      const nomes = res.data.results.map(p => p.nome)
      setPastas([...ORDEM.filter(p => nomes.includes(p)), ...nomes.filter(p => !ORDEM.includes(p))])
    }).catch(() => setPastas(['INBOX']))
  }, [])

  useEffect(() => { carregarEmails() }, [pagina, pastaAtual])

  useEffect(() => {
    const t = setTimeout(() => setBuscaAtiva(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  async function carregarEmails() {
    setCarregando(true); setErro(null)
    try {
      const res = await emailApi.inbox(pagina, pastaAtual)
      setEmails(res.data.results); setTotal(res.data.count)
    } catch { setErro('Erro ao carregar emails.') }
    finally { setCarregando(false) }
  }

  function trocarPasta(pasta) {
    setPastaAtual(pasta); setPagina(1)
    setEmailSelecionado(null); setCompondo(false); setVista('lista')
  }

  async function abrirEmail(uid) {
    try {
      const res = await emailApi.detalhe(uid, pastaAtual)
      setEmailSelecionado(res.data); setCompondo(false); setRespondendo(false)
      setEmails(prev => prev.map(e => e.uid === uid ? { ...e, lido: true } : e))
      setVista('detalhe')
    } catch { setErro('Erro ao abrir email.') }
  }

  async function deletarEmail(uid) {
    try {
      await emailApi.deletar(uid, pastaAtual)
      setEmailSelecionado(null); setVista('lista'); carregarEmails()
    } catch { setErro('Erro ao deletar email.') }
  }

  function abrirCompose() { setRespondendo(false); setCompondo(true); setVista('compose') }
  function iniciarResposta() { setRespondendo(true); setCompondo(true); setVista('compose') }
  function voltarParaLista() { setCompondo(false); setRespondendo(false); setVista('lista') }
  async function aoEnviar() {
    setCompondo(false); setRespondendo(false); setVista('lista')
    if (!respondendo) carregarEmails()
  }

  const naoLidos = pastaAtual === 'INBOX' ? emails.filter(e => !e.lido).length : 0

  const emailsFiltrados = buscaAtiva
    ? emails.filter(e =>
        e.remetente?.toLowerCase().includes(buscaAtiva.toLowerCase()) ||
        e.assunto?.toLowerCase().includes(buscaAtiva.toLowerCase())
      )
    : emails

  // ── Tab strip de pastas (mobile + tablet) ─────────────────────────────
  const TabsPastas = () => (
    <div className="lg:hidden flex items-center justify-around px-4 py-2 shrink-0"
      style={{
        backgroundColor: '#1a0035',
        borderBottom: '1px solid rgba(6,59,248,0.25)',
      }}>
      {pastas.slice(0, 5).map(pasta => {
        const ativo = pastaAtual === pasta
        return (
          <button key={pasta} onClick={() => trocarPasta(pasta)}
            className="relative flex items-center justify-center w-10 h-10 rounded-full transition-all"
            style={{ backgroundColor: ativo ? '#063BF8' : 'rgba(255,255,255,0.08)' }}>
            <span className="text-base leading-none">{iconePasta(pasta)}</span>
            {pasta === 'INBOX' && naoLidos > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-white"
                style={{ backgroundColor: '#f87171', fontSize: '9px', fontWeight: 700 }}>
                {naoLidos > 9 ? '9+' : naoLidos}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  // ── Painel de pastas (desktop) ─────────────────────────────────────────
  const PainelPastas = () => (
    <div className="hidden lg:flex flex-col w-48 shrink-0 pt-4 pb-2 gap-0.5 px-2"
      style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
      <button onClick={abrirCompose}
        className="w-full mb-3 py-2 rounded-lg text-sm font-semibold transition-colors"
        style={{ backgroundColor: '#063BF8', color: '#fff' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0430cc'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#063BF8'}>
        + Novo
      </button>
      {pastas.map(pasta => (
        <button key={pasta} onClick={() => trocarPasta(pasta)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors"
          style={{
            backgroundColor: pastaAtual === pasta ? 'rgba(6,59,248,0.15)' : 'transparent',
            color: pastaAtual === pasta ? '#f1f5f9' : '#a78bca',
            borderLeft: pastaAtual === pasta ? '2px solid #063BF8' : '2px solid transparent',
          }}>
          <span>{iconePasta(pasta)}</span>
          <span className="flex-1 truncate">{labelPasta(pasta)}</span>
          {pasta === 'INBOX' && naoLidos > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#063BF8', color: '#fff' }}>{naoLidos}</span>
          )}
        </button>
      ))}
    </div>
  )

  // ── Painel lista de emails ─────────────────────────────────────────────
  const PainelLista = ({ classe = '' }) => (
    <div className={`flex flex-col overflow-hidden ${classe}`}
      style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header mobile/tablet */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
          {labelPasta(pastaAtual)}
          {naoLidos > 0 && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#063BF8', color: '#fff' }}>{naoLidos}</span>
          )}
        </span>
        <button onClick={abrirCompose}
          className="text-xs font-semibold px-4 py-1.5 rounded-lg"
          style={{ backgroundColor: '#063BF8', color: '#fff' }}>
          + Novo
        </button>
      </div>

      {/* Tabs de pastas — mobile/tablet, entre o header e a lista */}
      <TabsPastas />

      {/* Header desktop */}
      <div className="hidden lg:flex items-center px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="text-sm font-medium" style={{ color: '#a78bca' }}>
          {labelPasta(pastaAtual)}
        </span>
      </div>

      {/* Busca */}
      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <span className="text-xs" style={{ color: '#6b6b8a' }}>🔍</span>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar..."
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: '#f1f5f9' }}
          />
          {busca && (
            <button onClick={() => { setBusca(''); setBuscaAtiva('') }}
              className="text-xs leading-none" style={{ color: '#6b6b8a' }}>✕</button>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden px-3 pb-2">
        {carregando && <p className="text-xs px-1 pb-1" style={{ color: '#6b6b8a' }}>Carregando...</p>}
        {erro && <p className="text-xs px-1 pb-1" style={{ color: '#f87171' }}>{erro}</p>}
        <EmailList
          emails={emailsFiltrados} total={buscaAtiva ? emailsFiltrados.length : total} pagina={pagina}
          onPagina={setPagina} onSelecionar={abrirEmail}
          uidSelecionado={emailSelecionado?.uid}
        />
      </div>
    </div>
  )

  // ── Painel leitura / compose ───────────────────────────────────────────
  const PainelConteudo = ({ classe = '' }) => (
    <div className={`flex flex-col flex-1 min-w-0 overflow-hidden ${classe}`}>
      {/* Header mobile: voltar + tabs */}
      <div className="lg:hidden shrink-0">
        <div className="flex items-center px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={voltarParaLista}
            className="text-sm font-medium flex items-center gap-1"
            style={{ color: '#063BF8' }}>
            ← Voltar
          </button>
        </div>
        {/* Tabs também no painel de leitura para trocar pasta sem voltar */}
        <TabsPastas />
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {compondo && (
          <EmailCompose
            onEnviado={aoEnviar}
            onCancelar={voltarParaLista}
            destinatarioPadrao={respondendo ? emailSelecionado?.remetente : ''}
            assuntoPadrao={respondendo ? 'Re: ' + emailSelecionado?.assunto : ''}
          />
        )}
        {emailSelecionado && !compondo && (
          <EmailDetail
            email={emailSelecionado}
            onDeletar={() => deletarEmail(emailSelecionado.uid)}
            onResponder={iniciarResposta}
          />
        )}
        {!compondo && !emailSelecionado && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: '#6b6b8a' }}>Selecione um email para ler</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <SistemaLayout titulo="Email">
      <div className="flex flex-1 overflow-hidden h-full">
        <PainelPastas />

        <PainelLista classe={`
          ${vista === 'lista' ? 'flex' : 'hidden'}
          lg:flex w-full lg:w-72 lg:shrink-0
        `} />

        <PainelConteudo classe={`
          ${vista === 'detalhe' || vista === 'compose' ? 'flex' : 'hidden'}
          lg:flex
        `} />
      </div>
    </SistemaLayout>
  )
}
