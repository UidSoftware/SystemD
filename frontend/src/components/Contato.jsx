import { useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

const estadoInicial = {
  nome: '',
  email: '',
  telefone: '',
  empresa: '',
  mensagem: '',
}

export default function Contato() {
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
      await axios.post(`${API_URL}/leads/`, { ...form, origem: 'vitrine_contato' })
      setStatus('sucesso')
      setForm(estadoInicial)
    } catch {
      setStatus('erro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section id="contato" className="py-20 px-6 bg-uid-dark text-white">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Fale conosco</h2>
        <p className="text-center text-gray-400 mb-10">
          Conte seu desafio. Vamos avaliar juntos se faz sentido desenvolver um sistema para você.
        </p>

        {status === 'sucesso' && (
          <div className="bg-green-700 text-white rounded-xl p-4 mb-6 text-center">
            Solicitação recebida! Entraremos em contato em breve.
          </div>
        )}
        {status === 'erro' && (
          <div className="bg-red-700 text-white rounded-xl p-4 mb-6 text-center">
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
              className="bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Seu e-mail *"
              required
              className="bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              placeholder="Telefone / WhatsApp"
              className="bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="empresa"
              value={form.empresa}
              onChange={handleChange}
              placeholder="Nome da empresa"
              className="bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <textarea
            name="mensagem"
            value={form.mensagem}
            onChange={handleChange}
            placeholder="Descreva o que você precisa *"
            required
            rows={5}
            className="bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            type="submit"
            disabled={enviando}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition-colors"
          >
            {enviando ? 'Enviando...' : 'Enviar solicitação'}
          </button>
        </form>
      </div>
    </section>
  )
}
