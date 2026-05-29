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

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  padding: '10px 24px',
}

export default function EmailCompose({ onEnviado, onCancelar, destinatarioPadrao = '', assuntoPadrao = '' }) {
  const [form, setForm] = useState({
    destinatario: destinatarioPadrao,
    cc: '',
    assunto: assuntoPadrao,
    corpo: '',
  })
  const [mostrarCC, setMostrarCC] = useState(false)
  const [enviando, setEnviando]   = useState(false)
  const [erro, setErro]           = useState(null)

  const set = campo => e => setForm(f => ({ ...f, [campo]: e.target.value }))

  async function handleEnviar() {
    if (!form.destinatario || !form.assunto) {
      setErro('Destinatário e assunto são obrigatórios.')
      return
    }
    if (!form.destinatario.includes('@')) {
      setErro('Email inválido — use o formato nome@dominio.com')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      await emailApi.enviar({
        destinatario: form.destinatario,
        assunto: form.assunto,
        corpo: form.corpo,
        cc: form.cc || undefined,
      })
      onEnviado()
    } catch {
      setErro('Erro ao enviar email.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 className="font-semibold text-base" style={{ color: '#f1f5f9' }}>
          {destinatarioPadrao ? 'Responder' : 'Novo email'}
        </h3>
      </div>

      {/* Campos */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {erro && <p className="text-xs px-6 pt-3" style={{ color: '#f87171' }}>{erro}</p>}

        {/* Para */}
        <div style={rowStyle}>
          <span className="text-xs w-12 shrink-0" style={{ color: '#6b6b8a' }}>Para</span>
          <input
            value={form.destinatario}
            onChange={set('destinatario')}
            placeholder="destinatario@email.com"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#f1f5f9' }}
          />
          <button
            onClick={() => setMostrarCC(v => !v)}
            className="text-xs shrink-0 px-2 py-1 rounded transition-colors"
            style={{
              color: mostrarCC ? '#063BF8' : '#6b6b8a',
              backgroundColor: mostrarCC ? 'rgba(6,59,248,0.1)' : 'transparent',
            }}>
            CC
          </button>
        </div>

        {/* CC (expansível) */}
        {mostrarCC && (
          <div style={rowStyle}>
            <span className="text-xs w-12 shrink-0" style={{ color: '#6b6b8a' }}>CC</span>
            <input
              value={form.cc}
              onChange={set('cc')}
              placeholder="cc@email.com"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#f1f5f9' }}
              autoFocus
            />
          </div>
        )}

        {/* Assunto */}
        <div style={rowStyle}>
          <span className="text-xs w-12 shrink-0" style={{ color: '#6b6b8a' }}>Assunto</span>
          <input
            value={form.assunto}
            onChange={set('assunto')}
            placeholder="Assunto"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#f1f5f9' }}
          />
        </div>

        {/* Corpo */}
        <textarea
          value={form.corpo}
          onChange={set('corpo')}
          placeholder="Escreva sua mensagem..."
          className="flex-1 resize-none bg-transparent text-sm outline-none px-6 py-4"
          style={{ color: '#f1f5f9', minHeight: '180px' }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onCancelar}
          className="text-sm px-4 py-2 rounded-lg transition-colors"
          style={{ color: '#6b6b8a' }}
          onMouseEnter={e => e.currentTarget.style.color = '#a78bca'}
          onMouseLeave={e => e.currentTarget.style.color = '#6b6b8a'}>
          ❌ Cancelar
        </button>
        <button onClick={handleEnviar} disabled={enviando}
          className="text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#063BF8', color: '#fff' }}
          onMouseEnter={e => !enviando && (e.currentTarget.style.backgroundColor = '#0430cc')}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#063BF8'}>
          {enviando ? 'Enviando...' : '📤 Enviar'}
        </button>
      </div>
    </div>
  )
}
