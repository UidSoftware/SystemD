import { useState } from 'react'
import api from '../services/api'

const estadoInicial = {
  nome: '',
  email: '',
  telefone: '',
  empresa: '',
  mensagem: '',
}

const inputStyle = {
  backgroundColor: '#1a0a2e',
  border: '1px solid rgba(6, 59, 248, 0.2)',
  borderRadius: '12px',
  padding: '12px 16px',
  color: '#f1f5f9',
  width: '100%',
  outline: 'none',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '1rem',
}

export default function Contact() {
  const [form, setForm] = useState(estadoInicial)
  const [status, setStatus] = useState(null)
  const [enviando, setEnviando] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setEnviando(true)
    setStatus(null)
    try {
      await api.post('/leads/', { ...form, origem: 'vitrine_contato' })
      setStatus('sucesso')
      setForm(estadoInicial)
    } catch {
      setStatus('erro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section id="contato" className="py-24 px-6" style={{ backgroundColor: '#0a0014' }}>
      <div className="max-w-2xl mx-auto">
        <h2
          className="font-display font-bold text-3xl md:text-4xl text-center mb-4"
          style={{ color: '#f1f5f9' }}
        >
          Pronto pra organizar seu negócio?
        </h2>
        <p className="text-center mb-12" style={{ color: '#a78bca' }}>
          Conta seu desafio. A gente avalia juntos se faz sentido desenvolver um sistema pra você.
          Sem compromisso, sem enrolação.
        </p>

        {status === 'sucesso' && (
          <div
            className="rounded-xl p-4 mb-6 text-center font-medium"
            style={{ backgroundColor: '#063BF8', color: '#fff' }}
          >
            Solicitação recebida! Entraremos em contato em breve.
          </div>
        )}
        {status === 'erro' && (
          <div
            className="rounded-xl p-4 mb-6 text-center font-medium"
            style={{ backgroundColor: '#FF0000', color: '#fff' }}
          >
            Erro ao enviar. Tente novamente ou nos chame pelo WhatsApp.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="nome"
              value={form.nome}
              onChange={handleChange}
              placeholder="Seu nome *"
              required
              style={inputStyle}
            />
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Seu e-mail *"
              required
              style={inputStyle}
            />
            <input
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              placeholder="Telefone / WhatsApp"
              style={inputStyle}
            />
            <input
              name="empresa"
              value={form.empresa}
              onChange={handleChange}
              placeholder="Nome da empresa"
              style={inputStyle}
            />
          </div>
          <textarea
            name="mensagem"
            value={form.mensagem}
            onChange={handleChange}
            placeholder="Conte-me qual o seu problema, para que eu possa te ajudar. *"
            required
            rows={5}
            style={{ ...inputStyle, resize: 'none' }}
          />
          <button
            type="submit"
            disabled={enviando}
            className="font-semibold py-4 rounded-full transition-colors disabled:opacity-50"
            style={{
              backgroundColor: '#063BF8',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(6, 59, 248, 0.4)',
            }}
            onMouseEnter={(e) => !enviando && (e.currentTarget.style.backgroundColor = '#0430cc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#063BF8')}
          >
            {enviando ? 'Enviando...' : 'Quero conversar'}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 mt-8" style={{ color: '#a78bca' }}>
          <span className="text-2xl">💬</span>
          <span>Prefere o WhatsApp?</span>
          <a
            href="https://wa.me/5534991349194"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
            style={{ color: '#6b8fff' }}
          >
            Fala direto com a gente
          </a>
        </div>
      </div>
    </section>
  )
}
