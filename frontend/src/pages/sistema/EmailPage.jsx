import { useState, useEffect } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import EmailList from '../../components/email/EmailList'
import EmailDetail from '../../components/email/EmailDetail'
import EmailCompose from '../../components/email/EmailCompose'
import { emailApi } from '../../services/emailApi'

const PASTAS_LABEL = {
  'INBOX':  { label: 'Caixa de entrada', icon: '✉' },
  'Sent':   { label: 'Enviados',         icon: '↗' },
  'Junk':   { label: 'Spam',             icon: '⚠' },
  'Trash':  { label: 'Lixeira',          icon: '🗑' },
  'Drafts': { label: 'Rascunhos',        icon: '✏' },
}

function labelPasta(nome) {
  return PASTAS_LABEL[nome]?.label || nome
}
function iconePasta(nome) {
  return PASTAS_LABEL[nome]?.icon || '📁'
}

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

  useEffect(() => {
    emailApi.pastas().then(res => {
      const nomes = res.data.results.map(p => p.nome)
      const ordem = ['INBOX', 'Sent', 'Drafts', 'Junk', 'Trash']
      const ordenadas = [
        ...ordem.filter(p => nomes.includes(p)),
        ...nomes.filter(p => !ordem.includes(p)),
      ]
      setPastas(ordenadas)
    }).catch(() => setPastas(['INBOX']))
  }, [])

  useEffect(() => {
    carregarEmails()
  }, [pagina, pastaAtual])

  async function carregarEmails() {
    setCarregando(true)
    setErro(null)
    try {
      const res = await emailApi.inbox(pagina, pastaAtual)
      setEmails(res.data.results)
      setTotal(res.data.count)
    } catch {
      setErro('Erro ao carregar emails.')
    } finally {
      setCarregando(false)
    }
  }

  function trocarPasta(pasta) {
    setPastaAtual(pasta)
    setPagina(1)
    setEmailSelecionado(null)
    setCompondo(false)
  }

  async function abrirEmail(uid) {
    try {
      const res = await emailApi.detalhe(uid, pastaAtual)
      setEmailSelecionado(res.data)
      setCompondo(false)
      setRespondendo(false)
      setEmails(prev => prev.map(e => e.uid === uid ? { ...e, lido: true } : e))
    } catch {
      setErro('Erro ao abrir email.')
    }
  }

  async function deletarEmail(uid) {
    try {
      await emailApi.deletar(uid, pastaAtual)
      setEmailSelecionado(null)
      carregarEmails()
    } catch {
      setErro('Erro ao deletar email.')
    }
  }

  function iniciarResposta() {
    setRespondendo(true)
    setCompondo(true)
  }

  async function aoEnviar() {
    setCompondo(false)
    setRespondendo(false)
    if (!respondendo) carregarEmails()
  }

  const naoLidos = pastaAtual === 'INBOX' ? emails.filter(e => !e.lido).length : 0

  return (
    <SistemaLayout titulo="Email">
      <div className="flex flex-1 overflow-hidden h-full">

        {/* Painel esquerdo: pastas + lista */}
        <div className="flex flex-col w-72 shrink-0 overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Navegação de pastas */}
          <div className="px-4 pt-4 pb-2 space-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b6b8a' }}>Pastas</span>
              <button
                onClick={() => { setCompondo(true); setRespondendo(false); setEmailSelecionado(null) }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: '#063BF8', color: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0430cc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#063BF8'}
              >
                + Novo
              </button>
            </div>

            {pastas.map(pasta => (
              <button
                key={pasta}
                onClick={() => trocarPasta(pasta)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors"
                style={{
                  backgroundColor: pastaAtual === pasta ? 'rgba(6,59,248,0.15)' : 'transparent',
                  color: pastaAtual === pasta ? '#f1f5f9' : '#a78bca',
                  borderLeft: pastaAtual === pasta ? '2px solid #063BF8' : '2px solid transparent',
                }}
              >
                <span className="text-base leading-none">{iconePasta(pasta)}</span>
                <span className="flex-1 truncate">{labelPasta(pasta)}</span>
                {pasta === 'INBOX' && naoLidos > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#063BF8', color: '#fff' }}>
                    {naoLidos}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="h-px mx-4 my-2" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />

          {/* Lista de emails */}
          <div className="flex flex-col flex-1 overflow-hidden px-4 pb-4 gap-2">
            {carregando && <p className="text-xs" style={{ color: '#6b6b8a' }}>Carregando...</p>}
            {erro && <p className="text-xs" style={{ color: '#f87171' }}>{erro}</p>}
            <EmailList
              emails={emails}
              total={total}
              pagina={pagina}
              onPagina={setPagina}
              onSelecionar={abrirEmail}
              uidSelecionado={emailSelecionado?.uid}
            />
          </div>
        </div>

        {/* Painel direito: conteúdo */}
        <div className="flex-1 min-w-0 p-4">
          {compondo && (
            <EmailCompose
              onEnviado={aoEnviar}
              onCancelar={() => { setCompondo(false); setRespondendo(false) }}
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
    </SistemaLayout>
  )
}
