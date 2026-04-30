import { useState } from 'react'
import { emailApi } from '../../services/emailApi'

const inputStyle = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.875rem',
  color: '#f1f5f9',
  outline: 'none',
  width: '100%',
}

export default function EmailCompose({ onEnviado, onCancelar, destinatarioPadrao = '', assuntoPadrao = '' }) {
  const [form, setForm] = useState({ destinatario: destinatarioPadrao, assunto: assuntoPadrao, corpo: '' })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  async function handleEnviar() {
    if (!form.destinatario || !form.assunto) {
      setErro('Destinatário e assunto são obrigatórios.')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      await emailApi.enviar(form)
      onEnviado()
    } catch {
      setErro('Erro ao enviar email.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 className="font-display font-bold text-lg" style={{ color: '#f1f5f9' }}>Novo email</h3>
      </div>

      <div className="flex-1 flex flex-col gap-3 px-6 py-5">
        {erro && <p className="text-sm" style={{ color: '#f87171' }}>{erro}</p>}

        <input
          placeholder="Para"
          value={form.destinatario}
          onChange={set('destinatario')}
          style={inputStyle}
        />
        <input
          placeholder="Assunto"
          value={form.assunto}
          onChange={set('assunto')}
          style={inputStyle}
        />
        <textarea
          placeholder="Mensagem..."
          value={form.corpo}
          onChange={set('corpo')}
          className="flex-1 resize-none"
          style={{ ...inputStyle, minHeight: '200px' }}
        />
      </div>

      <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={onCancelar}
          className="text-sm px-4 py-2 rounded-lg transition-colors"
          style={{ color: '#6b6b8a' }}
          onMouseEnter={e => e.currentTarget.style.color = '#a78bca'}
          onMouseLeave={e => e.currentTarget.style.color = '#6b6b8a'}
        >
          Cancelar
        </button>
        <button
          onClick={handleEnviar}
          disabled={enviando}
          className="text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#063BF8', color: '#fff' }}
          onMouseEnter={e => !enviando && (e.currentTarget.style.backgroundColor = '#0430cc')}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#063BF8'}
        >
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
