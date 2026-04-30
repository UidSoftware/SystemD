import { useState, useEffect } from 'react'
import SistemaLayout from '../../components/sistema/SistemaLayout'
import EmailList from '../../components/email/EmailList'
import EmailDetail from '../../components/email/EmailDetail'
import EmailCompose from '../../components/email/EmailCompose'
import { emailApi } from '../../services/emailApi'

export default function EmailPage() {
  const [emails, setEmails]                     = useState([])
  const [total, setTotal]                       = useState(0)
  const [pagina, setPagina]                     = useState(1)
  const [emailSelecionado, setEmailSelecionado] = useState(null)
  const [compondo, setCompondo]                 = useState(false)
  const [respondendo, setRespondendo]           = useState(false)
  const [carregando, setCarregando]             = useState(false)
  const [erro, setErro]                         = useState(null)

  useEffect(() => { carregarInbox() }, [pagina])

  async function carregarInbox() {
    setCarregando(true)
    setErro(null)
    try {
      const res = await emailApi.inbox(pagina)
      setEmails(res.data.results)
      setTotal(res.data.count)
    } catch {
      setErro('Erro ao carregar emails.')
    } finally {
      setCarregando(false)
    }
  }

  async function abrirEmail(uid) {
    try {
      const res = await emailApi.detalhe(uid)
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
      await emailApi.deletar(uid)
      setEmailSelecionado(null)
      carregarInbox()
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
    if (!respondendo) carregarInbox()
  }

  const naoLidos = emails.filter(e => !e.lido).length

  return (
    <SistemaLayout titulo="Email">
      <div className="flex flex-1 overflow-hidden h-full">

          <div className="flex flex-col w-72 shrink-0 overflow-hidden p-4 gap-3" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>Caixa de entrada</span>
                {naoLidos > 0 && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#063BF8', color: '#fff' }}>
                    {naoLidos}
                  </span>
                )}
              </div>
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
