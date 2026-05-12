import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const menuPorPerfil = {
  ADMIN: [
    { label: 'Dashboard',     path: '/sistema/',              icone: '⊞' },
    { label: 'Clientes',      path: '/sistema/clientes',      icone: '◎' },
    { label: 'OS',            path: '/sistema/os',            icone: '⊟' },
    { label: 'Financeiro',    path: '/sistema/financeiro',    icone: '$' },
    { label: 'Email',         path: '/sistema/email',         icone: '✉' },
    { label: 'Usuários',      path: '/sistema/usuarios',      icone: '👤' },
    { label: 'Configurações', path: '/sistema/configuracoes', icone: '⚙' },
  ],
  OPERACIONAL: [
    { label: 'Dashboard', path: '/sistema/',         icone: '⊞' },
    { label: 'Clientes',  path: '/sistema/clientes', icone: '◎' },
    { label: 'OS',        path: '/sistema/os',       icone: '⊟' },
    { label: 'Email',     path: '/sistema/email',    icone: '✉' },
  ],
  FINANCEIRO: [
    { label: 'Dashboard',  path: '/sistema/',            icone: '⊞' },
    { label: 'Financeiro', path: '/sistema/financeiro',  icone: '$' },
    { label: 'Email',      path: '/sistema/email',       icone: '✉' },
  ],
  CLIENTE: [
    { label: 'Meus Projetos',  path: '/sistema/meus-projetos',  icone: '⊟' },
    { label: 'Suporte',        path: '/sistema/suporte',         icone: '◎' },
    { label: 'Minhas Faturas', path: '/sistema/minhas-faturas',  icone: '$' },
  ],
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

const itemAtivo = {
  backgroundColor: 'rgba(6, 59, 248, 0.15)',
  borderLeft: '3px solid #063BF8',
  color: '#f1f5f9',
}

export default function Sidebar({ onClose }) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const perfil = usuario?.perfil || 'OPERACIONAL'
  const menu = menuPorPerfil[perfil] || []

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

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/sistema/'}
            style={({ isActive }) => isActive ? { ...itemBase, ...itemAtivo } : itemBase}
            onClick={onClose}
          >
            <span>{item.icone}</span> {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="h-px mx-4" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />

      <div className="px-5 py-4">
        <p className="text-xs mb-0.5 truncate font-medium" style={{ color: '#f1f5f9' }}>
          {usuario?.nome || usuario?.email}
        </p>
        <p className="text-xs mb-2 truncate" style={{ color: '#a78bca' }}>
          {usuario?.email_corporativo || usuario?.email}
        </p>
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
