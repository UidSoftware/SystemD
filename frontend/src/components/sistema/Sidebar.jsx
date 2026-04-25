import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const itemAtivo = {
  backgroundColor: 'rgba(6, 59, 248, 0.15)',
  borderLeft: '3px solid #063BF8',
  color: '#f1f5f9',
}

const itemBase = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 20px',
  fontSize: '0.9rem',
  fontWeight: 500,
  color: '#a78bca',
  textDecoration: 'none',
  transition: 'all 0.15s',
  borderLeft: '3px solid transparent',
}

const itemDesabilitado = {
  ...itemBase,
  opacity: 0.4,
  cursor: 'not-allowed',
}

export default function Sidebar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className="flex flex-col h-screen w-56 shrink-0"
      style={{ backgroundColor: '#0a0014', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="px-5 py-6">
        <span className="font-display font-bold text-xl" style={{ color: '#f1f5f9' }}>
          uid<span style={{ color: '#063BF8' }}>.</span>sistema
        </span>
      </div>

      <div className="h-px mx-4" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />

      <nav className="flex-1 py-4 space-y-1">
        <NavLink
          to="/sistema/"
          end
          style={({ isActive }) => isActive ? { ...itemBase, ...itemAtivo } : itemBase}
        >
          <span>⊞</span> Dashboard
        </NavLink>

        <NavLink
          to="/sistema/clientes"
          style={({ isActive }) => isActive ? { ...itemBase, ...itemAtivo } : itemBase}
        >
          <span>◎</span> Clientes
        </NavLink>

        <div className="h-px mx-4 my-2" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />

        <div title="Em breve" style={itemDesabilitado}>
          <span>⊟</span> Ordens de Serviço
        </div>

        <div title="Em breve" style={itemDesabilitado}>
          <span>$</span> Financeiro
        </div>
      </nav>

      <div className="h-px mx-4" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />

      <div className="px-5 py-4">
        <p className="text-xs mb-1 truncate" style={{ color: '#a78bca' }}>{usuario?.nome || usuario?.email}</p>
        <button
          onClick={handleLogout}
          className="text-sm font-medium transition-colors"
          style={{ color: '#6b6b8a' }}
          onMouseEnter={(e) => e.target.style.color = '#f87171'}
          onMouseLeave={(e) => e.target.style.color = '#6b6b8a'}
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
