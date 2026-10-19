import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../hooks/useTheme'

const LogoutIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)

export default function Header({ titulo, onMenuToggle }) {
  const { logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 24px',
        height: 56,
        flexShrink: 0,
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-dark)',
      }}
    >
      {/* Hamburguer — mobile only */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden"
        aria-label="Abrir menu"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          padding: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          borderRadius: 6,
          transition: 'color 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-main)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
      >
        <span style={{ display: 'block', width: 18, height: 1.5, backgroundColor: 'currentColor', borderRadius: 2 }} />
        <span style={{ display: 'block', width: 18, height: 1.5, backgroundColor: 'currentColor', borderRadius: 2 }} />
        <span style={{ display: 'block', width: 12, height: 1.5, backgroundColor: 'currentColor', borderRadius: 2 }} />
      </button>

      {/* Divisor vertical — separador sutil antes do titulo */}
      <div className="lg:hidden" style={{ width: 1, height: 20, backgroundColor: 'var(--color-border)', flexShrink: 0 }} />

      {/* Titulo */}
      <h1
        style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 700,
          fontSize: '1rem',
          color: 'var(--color-text-main)',
          margin: 0,
          flex: 1,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {titulo}
      </h1>

      {/* Grupo de acoes — tema + Sair, colados entre si, à direita do título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Botao de tema */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            padding: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
            color: 'var(--color-text-muted)',
            borderRadius: 6,
            transition: 'color 0.15s, background-color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--color-text-main)'
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--color-text-muted)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Botao Sair */}
        <button
          onClick={handleLogout}
          title="Sair"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 32,
            padding: '0 10px',
            fontSize: '0.78rem',
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 6,
            transition: 'color 0.15s, background-color 0.15s',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--color-danger)'
            e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--color-text-muted)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <LogoutIcon />
          <span>Sair</span>
        </button>
      </div>
    </header>
  )
}
