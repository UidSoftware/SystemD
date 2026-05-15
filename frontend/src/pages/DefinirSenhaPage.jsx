import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'

export default function DefinirSenhaPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const uid = params.get('uid') || ''
  const token = params.get('token') || ''

  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setCarregando(true)
    try {
      await api.post('/auth/definir-senha/', { uid, token, senha })
      setSucesso(true)
    } catch (e) {
      setErro(e.response?.data?.erro || 'Link inválido ou expirado. Solicite um novo email de acesso.')
    } finally {
      setCarregando(false)
    }
  }

  if (!uid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0014' }}>
        <p style={{ color: '#f87171', fontSize: 14 }}>Link inválido. Solicite um novo email de acesso ao administrador.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#0a0014' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="font-display font-bold text-3xl" style={{ color: '#f1f5f9' }}>
            uid<span style={{ color: '#063BF8' }}>.</span>sistema
          </span>
        </div>

        <div className="rounded-2xl p-8 space-y-5"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

          {sucesso ? (
            <div className="text-center space-y-4">
              <div style={{ fontSize: 40 }}>✅</div>
              <h1 className="font-display font-bold text-xl" style={{ color: '#f1f5f9' }}>Senha definida!</h1>
              <p style={{ color: '#a78bca', fontSize: 14 }}>Sua senha foi criada com sucesso.</p>
              <button onClick={() => navigate('/login')}
                className="w-full py-3 rounded-lg font-semibold text-sm"
                style={{ backgroundColor: '#063BF8', color: '#fff' }}>
                Fazer login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h1 className="font-display font-bold text-xl text-center" style={{ color: '#f1f5f9' }}>
                Defina sua senha
              </h1>
              <p className="text-center text-sm" style={{ color: '#a78bca' }}>
                Mínimo 6 caracteres
              </p>

              {erro && (
                <p className="text-sm text-center rounded-lg px-4 py-2"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                  {erro}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-sm" style={{ color: '#a78bca' }}>Nova senha</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                  required autoFocus
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }} />
              </div>

              <div className="space-y-1">
                <label className="text-sm" style={{ color: '#a78bca' }}>Confirmar senha</label>
                <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                  required
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }} />
              </div>

              <button type="submit" disabled={carregando}
                className="w-full py-3 rounded-lg font-semibold text-sm"
                style={{ backgroundColor: '#063BF8', color: '#fff', opacity: carregando ? 0.7 : 1 }}>
                {carregando ? 'Salvando...' : 'Salvar senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
