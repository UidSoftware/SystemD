import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const menuFinanceiro = [
  { label: 'Livro Caixa',     path: '/sistema/financeiro/livro-caixa' },
  { label: 'Contas a Pagar',  path: '/sistema/financeiro/contas-pagar' },
  { label: 'Contas a Receber',path: '/sistema/financeiro/contas-receber' },
  { label: 'Contas Bancárias',path: '/sistema/financeiro/contas' },
  { label: 'Fornecedores',    path: '/sistema/financeiro/fornecedores' },
  { label: 'Serviços',        path: '/sistema/financeiro/servicos' },
  { label: 'Planos',          path: '/sistema/financeiro/planos' },
  { label: 'Folha Pgto',      path: '/sistema/financeiro/folha' },
  { label: 'Transferência',   path: '/sistema/financeiro/transferencia' },
  { label: 'DRE',             path: '/sistema/financeiro/dre' },
  { label: 'Fluxo de Caixa',  path: '/sistema/financeiro/fluxo-caixa' },
  { label: 'Extrato',         path: '/sistema/financeiro/extrato' },
]

const menuPorPerfil = {
  ADMIN: [
    { label: 'Dashboard',     path: '/sistema/',              icone: '⊞' },
    { label: 'Leads',         path: '/sistema/leads',         icone: '📥' },
    { label: 'Prospectos',    path: '/sistema/prospectos',    icone: '🎯' },
    { label: 'Clientes',      path: '/sistema/clientes',      icone: '◎' },
    { label: 'OS',            path: '/sistema/os',            icone: '⊟' },
    { label: 'Financeiro',    path: '/sistema/financeiro',    icone: '$', submenu: menuFinanceiro },
    { label: 'Entregas',      path: '/sistema/entregas',      icone: '📦' },
    { label: 'Email',         path: '/sistema/email',         icone: '✉' },
    { label: 'Usuários',      path: '/sistema/usuarios',      icone: '👤' },
    { label: 'Configurações', path: '/sistema/configuracoes', icone: '⚙' },
  ],
  OPERACIONAL: [
    { label: 'Dashboard',  path: '/sistema/',            icone: '⊞' },
    { label: 'Leads',      path: '/sistema/leads',       icone: '📥' },
    { label: 'Prospectos', path: '/sistema/prospectos',  icone: '🎯' },
    { label: 'Clientes',   path: '/sistema/clientes',    icone: '◎' },
    { label: 'OS',         path: '/sistema/os',          icone: '⊟' },
    { label: 'Entregas',   path: '/sistema/entregas',    icone: '📦' },
    { label: 'Email',      path: '/sistema/email',       icone: '✉' },
  ],
  FINANCEIRO: [
    { label: 'Dashboard',  path: '/sistema/',           icone: '⊞' },
    { label: 'Financeiro', path: '/sistema/financeiro', icone: '$', submenu: menuFinanceiro },
    { label: 'Email',      path: '/sistema/email',      icone: '✉' },
  ],
  CLIENTE: [
    { label: 'Meus Projetos',  path: '/sistema/meus-projetos',  icone: '⊟' },
    { label: 'Entregas',       path: '/sistema/entregas',        icone: '📦' },
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
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  width: '100%',
  textAlign: 'left',
}

const itemAtivo = {
  backgroundColor: 'rgba(6, 59, 248, 0.15)',
  borderLeft: '3px solid #063BF8',
  color: '#f1f5f9',
}

const subitemBase = {
  display: 'block',
  padding: '7px 20px 7px 46px',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#a78bca',
  textDecoration: 'none',
  transition: 'color 0.15s',
}

export default function Sidebar({ onClose }) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const perfil = usuario?.perfil || 'OPERACIONAL'
  const menu = menuPorPerfil[perfil] || []

  const financeiroAberto = location.pathname.startsWith('/sistema/financeiro')
  const [finOpen, setFinOpen] = useState(financeiroAberto)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col h-screen w-56 shrink-0"
      style={{ backgroundColor: '#0a0014', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-6">
        <span className="font-display font-bold text-xl" style={{ color: '#f1f5f9' }}>
          uid<span style={{ color: '#063BF8' }}>.</span>sistema
        </span>
      </div>

      <div className="h-px mx-4" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />

      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {menu.map((item) => {
          const isFinItem = item.submenu != null
          const isActivePath = !isFinItem && location.pathname === item.path || (!isFinItem && item.path !== '/sistema/' && location.pathname.startsWith(item.path))
          const isExactDash = item.path === '/sistema/' && location.pathname === '/sistema/'

          if (isFinItem) {
            return (
              <div key={item.path}>
                <button
                  onClick={() => setFinOpen(o => !o)}
                  style={{ ...itemBase, ...(financeiroAberto ? itemAtivo : {}) }}
                >
                  <span>{item.icone}</span>
                  <span className="flex-1">{item.label}</span>
                  <span style={{ fontSize: '0.7rem', color: '#a78bca' }}>{finOpen ? '▲' : '▼'}</span>
                </button>
                {finOpen && (
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    {item.submenu.map(sub => (
                      <NavLink key={sub.path} to={sub.path} onClick={onClose}
                        style={({ isActive }) => ({ ...subitemBase, color: isActive ? '#f1f5f9' : '#a78bca', borderLeft: isActive ? '2px solid #063BF8' : '2px solid transparent' })}>
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/sistema/'}
              style={({ isActive }) => isActive ? { ...itemBase, ...itemAtivo } : itemBase}
              onClick={onClose}
            >
              <span>{item.icone}</span> {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="h-px mx-4" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />

      <div className="px-5 py-4">
        <p className="text-xs mb-0.5 truncate font-medium" style={{ color: '#f1f5f9' }}>{usuario?.nome || usuario?.email}</p>
        <p className="text-xs mb-2 truncate" style={{ color: '#a78bca' }}>{usuario?.email_corporativo || usuario?.email}</p>
        <button onClick={handleLogout} className="text-sm font-medium transition-colors" style={{ color: '#6b6b8a' }}
          onMouseEnter={e => e.target.style.color = '#f87171'}
          onMouseLeave={e => e.target.style.color = '#6b6b8a'}>
          Sair
        </button>
      </div>
    </aside>
  )
}
