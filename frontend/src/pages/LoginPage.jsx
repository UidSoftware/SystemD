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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: 'var(--color-bg-dark)',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(6,59,248,0.08) 0%, transparent 70%), var(--color-bg-dark)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }} className="animate-fade-in">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
          }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #063BF8, #3d0361)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <span style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 700,
              fontSize: '1.15rem',
              color: '#f1f5f9',
            }}>
              uid<span style={{ color: '#063BF8' }}>.</span>sistema
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Sistema interno — Uid Software
          </p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-mid)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px 28px',
          boxShadow: 'var(--shadow-modal)',
        }}>
          <h1 style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700,
            fontSize: '1.05rem',
            color: '#f1f5f9',
            margin: '0 0 24px',
            textAlign: 'center',
          }}>
            Entrar na sua conta
          </h1>

          {erro && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.18)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 18,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{erro}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com.br"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border-mid)',
                  borderRadius: 9,
                  color: '#f1f5f9',
                  padding: '10px 14px',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#063BF8'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border-mid)'}
              />
            </div>

            <div>
              <label
                htmlFor="senha"
                style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Senha
              </label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border-mid)',
                  borderRadius: 9,
                  color: '#f1f5f9',
                  padding: '10px 14px',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#063BF8'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border-mid)'}
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                backgroundColor: '#063BF8',
                color: '#fff',
                border: 'none',
                cursor: carregando ? 'not-allowed' : 'pointer',
                opacity: carregando ? 0.7 : 1,
                transition: 'all 0.15s',
                marginTop: 4,
              }}
              onMouseEnter={e => { if (!carregando) e.currentTarget.style.backgroundColor = '#0430cc' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#063BF8' }}
            >
              {carregando ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-9-9" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 24 }}>
          Uid Software e Tecnologia LTDA
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
