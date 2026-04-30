export default function EmailList({ emails, total, pagina, onPagina, onSelecionar, uidSelecionado }) {
  const pageSize = 20
  const totalPaginas = Math.ceil(total / pageSize)

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: '#a78bca' }}>
        <p className="text-sm">Nenhum email</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {emails.map(email => (
          <div
            key={email.uid}
            onClick={() => onSelecionar(email.uid)}
            className="cursor-pointer rounded-lg px-4 py-3 transition-all"
            style={{
              backgroundColor: email.uid === uidSelecionado
                ? 'rgba(6, 59, 248, 0.15)'
                : 'rgba(255,255,255,0.03)',
              borderLeft: email.uid === uidSelecionado
                ? '3px solid #063BF8'
                : '3px solid transparent',
            }}
          >
            <p className="text-sm truncate" style={{ color: email.lido ? '#a78bca' : '#f1f5f9', fontWeight: email.lido ? 400 : 600 }}>
              {email.remetente}
            </p>
            <p className="text-sm truncate mt-0.5" style={{ color: '#a78bca' }}>{email.assunto}</p>
            <p className="text-xs mt-1" style={{ color: '#6b6b8a' }}>{email.data}</p>
          </div>
        ))}
      </div>

      {totalPaginas > 1 && (
        <div className="flex justify-between items-center pt-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            disabled={pagina === 1}
            onClick={() => onPagina(p => p - 1)}
            className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-30"
            style={{ color: '#063BF8' }}
          >
            ← Anterior
          </button>
          <span className="text-xs" style={{ color: '#6b6b8a' }}>{pagina} / {totalPaginas}</span>
          <button
            disabled={pagina === totalPaginas}
            onClick={() => onPagina(p => p + 1)}
            className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-30"
            style={{ color: '#063BF8' }}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
