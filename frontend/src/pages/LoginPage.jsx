import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const { login, redirecionarPosLogin } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const perfil = await login(email, senha)
      redirecionarPosLogin(perfil, navigate)
    } catch {
      setErro('E-mail ou senha incorretos')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#0a0014' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="font-display font-bold text-3xl" style={{ color: '#f1f5f9' }}>
            uid<span style={{ color: '#063BF8' }}>.</span>sistema
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-8 space-y-5"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h1 className="font-display font-bold text-xl text-center" style={{ color: '#f1f5f9' }}>
            Entrar
          </h1>

          {erro && (
            <p className="text-sm text-center rounded-lg px-4 py-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
              {erro}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-sm" style={{ color: '#a78bca' }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9',
              }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm" style={{ color: '#a78bca' }}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all"
            style={{ backgroundColor: '#063BF8', color: '#fff', opacity: carregando ? 0.7 : 1 }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
