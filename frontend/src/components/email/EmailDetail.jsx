import { emailApi } from '../../services/emailApi'

export default function EmailDetail({ email, pasta, onDeletar, onResponder, onArquivar }) {

  async function handleDownload(indice, nome) {
    try {
      const res = await emailApi.downloadAnexo(email.uid, indice, pasta)
      const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }))
      const a = document.createElement('a')
      a.href = url
      a.download = nome
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao baixar anexo.')
    }
  }

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden"
      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header */}
      <div className="px-6 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-lg truncate" style={{ color: '#f1f5f9' }}>{email.assunto}</h3>
            <p className="text-sm mt-1" style={{ color: '#a78bca' }}>De: {email.remetente}</p>
            <p className="text-sm" style={{ color: '#a78bca' }}>Para: {email.destinatarios}</p>
            <p className="text-xs mt-1" style={{ color: '#6b6b8a' }}>{email.data}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 justify-end">
            <button onClick={onResponder}
              className="text-sm px-4 py-1.5 rounded-lg font-medium transition-colors"
              style={{ border: '1px solid rgba(6,59,248,0.4)', color: '#6b8fff' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(6,59,248,0.1)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              Responder
            </button>
            {onArquivar && (
              <button onClick={onArquivar}
                className="text-sm px-4 py-1.5 rounded-lg font-medium transition-colors"
                style={{ border: '1px solid rgba(167,139,202,0.3)', color: '#a78bca' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(167,139,202,0.1)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                Arquivar
              </button>
            )}
            <button onClick={onDeletar}
              className="text-sm px-4 py-1.5 rounded-lg font-medium transition-colors"
              style={{ border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.1)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              Deletar
            </button>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-auto px-6 py-5 text-sm" style={{ color: '#a78bca', lineHeight: '1.7' }}>
        {email.corpo_html
          ? <div dangerouslySetInnerHTML={{ __html: email.corpo_html }} />
          : <pre className="whitespace-pre-wrap font-sans">{email.corpo_texto}</pre>
        }
      </div>

      {/* Anexos */}
      {email.anexos?.length > 0 && (
        <div className="px-6 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs mb-2" style={{ color: '#6b6b8a' }}>Anexos:</p>
          <div className="flex flex-wrap gap-2">
            {email.anexos.map((a, i) => (
              <button key={i} onClick={() => handleDownload(i, a.nome)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors"
                style={{ backgroundColor: 'rgba(6,59,248,0.1)', color: '#6b8fff', border: '1px solid rgba(6,59,248,0.2)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(6,59,248,0.2)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(6,59,248,0.1)'}>
                ⬇ {a.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
