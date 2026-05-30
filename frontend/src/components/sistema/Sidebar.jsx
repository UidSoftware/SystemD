import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

// SVG Icons — Lucide-style, 20x20 viewBox
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
)

const icons = {
  dashboard:  'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  office:     ['M2 20h20', 'M6 20V10', 'M18 20V10', 'M12 20V4', 'M2 10l10-8 10 8'],
  clientes:   ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'],
  os:         ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2', 'M9 5a2 2 0 002 2h2a2 2 0 002-2', 'M9 5a2 2 0 012-2h2a2 2 0 012 2', 'M9 12h6', 'M9 16h4'],
  entregas:   ['M5 12h14', 'M12 5l7 7-7 7'],
  financeiro: ['M12 2v20', 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'],
  email:      ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'],
  usuarios:   ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8'],
  config:     ['M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z'],
  leads:      ['M4 4h16', 'M4 8h16', 'M4 12h10'],
  prospectos: ['M22 11.08V12a10 10 0 11-5.93-9.14', 'M22 4L12 14.01l-3-3'],
  projetos:   ['M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'],
  suporte:    ['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'],
  faturas:    ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  chevron:    'M6 9l6 6 6-6',
  lock:       ['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z', 'M7 11V7a5 5 0 0110 0v4'],
  logout:     ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
}

const menuFinanceiro = [
  { label: 'Visao Geral',      path: '/sistema/financeiro/visao-geral',  emoji: '📊' },
  { label: 'Contas a Receber', path: '/sistema/financeiro/receitas',     emoji: '📥' },
  { label: 'Contas a Pagar',   path: '/sistema/financeiro/despesas',     emoji: '📤' },
  { label: 'Aportes',          path: '/sistema/financeiro/aportes',      emoji: '💰' },
  { label: 'Contas Bancarias', path: '/sistema/financeiro/contas',       emoji: '🏦' },
  { label: 'Livro Caixa',      path: '/sistema/financeiro/livro-caixa',  emoji: '📒' },
  { label: 'Fornecedores',     path: '/sistema/financeiro/fornecedores',  emoji: '🤝' },
  { label: 'Relatorios',       path: 'relatorios', submenu: menuRelatorios, emoji: '📋' },
]

const menuRelatorios = [
  { label: 'Fluxo de Caixa', path: '/sistema/financeiro/fluxo-caixa',     emoji: '📈' },
  { label: 'DRE',            path: '/sistema/financeiro/dre',              emoji: '📉' },
  { label: 'Receitas',       path: '/sistema/relatorios/receitas',         emoji: '💵' },
  { label: 'Despesas',       path: '/sistema/relatorios/despesas',         emoji: '💸' },
  { label: 'Por Cliente',    path: '/sistema/financeiro/por-cliente',      emoji: '👥' },
]

const menuNovoProjeto = [
  { label: 'Leads',               path: '/sistema/office/novo-projeto/leads',               emoji: '📝' },
  { label: 'Prospectos',          path: '/sistema/prospectos',                               emoji: '🔍' },
  { label: 'Entrevista',          path: '/sistema/office/novo-projeto/entrevista',           emoji: '🎤' },
  { label: 'Arquitetura Tecnica', path: '/sistema/office/novo-projeto/arquitetura-tecnica', emoji: '🏗️' },
]

const menuOffice = [
  { label: 'Escritorio',    path: '/sistema/office/escritorio',   emoji: '🖥️' },
  { label: 'Board',         path: '/sistema/office/board',        emoji: '📌' },
  { label: 'Agents',        path: '/sistema/office/agents',       emoji: '🤖' },
  { label: 'Activity Feed', path: '/sistema/office/activity',     emoji: '📡' },
  { label: 'Novo Projeto',  path: '/sistema/office/novo-projeto', emoji: '🚀', submenu: menuNovoProjeto },
]

const menuPorPerfil = {
  ADMIN: [
    { label: 'Dashboard',     path: '/sistema/',              emoji: '🏠', submenu: undefined },
    { label: 'Office',        path: '/sistema/office',         emoji: '🏢', submenu: menuOffice },
    { label: 'Clientes',      path: '/sistema/clientes',      emoji: '👥' },
    { label: 'OS',            path: '/sistema/os',            emoji: '📋' },
    { label: 'Entregas',      path: '/sistema/entregas',      emoji: '🚚' },
    { label: 'Financeiro',    path: '/sistema/financeiro',    emoji: '💰', submenu: menuFinanceiro },
    { label: 'Relatorios',    path: '/sistema/relatorios',    emoji: '📊', submenu: menuRelatorios },
    { label: 'Email',         path: '/sistema/email',         emoji: '📧' },
    { label: 'Usuarios',      path: '/sistema/usuarios',      emoji: '👤' },
    { label: 'Configuracoes', path: '/sistema/configuracoes', emoji: '⚙️' },
  ],
  OPERACIONAL: [
    { label: 'Dashboard',  path: '/sistema/',           emoji: '🏠' },
    { label: 'Leads',      path: '/sistema/leads',      emoji: '🎯' },
    { label: 'Prospectos', path: '/sistema/prospectos', emoji: '🔍' },
    { label: 'Clientes',   path: '/sistema/clientes',   emoji: '👥' },
    { label: 'OS',         path: '/sistema/os',         emoji: '📋' },
    { label: 'Entregas',   path: '/sistema/entregas',   emoji: '🚚' },
    { label: 'Email',      path: '/sistema/email',      emoji: '📧' },
  ],
  FINANCEIRO: [
    { label: 'Dashboard',  path: '/sistema/',            emoji: '🏠' },
    { label: 'Financeiro', path: '/sistema/financeiro',  emoji: '💰', submenu: menuFinanceiro },
    { label: 'Relatorios', path: '/sistema/relatorios',  emoji: '📊', submenu: menuRelatorios },
    { label: 'Email',      path: '/sistema/email',       emoji: '📧' },
  ],
  CLIENTE: [
    { label: 'Meus Projetos',  path: '/sistema/meus-projetos',  emoji: '📁' },
    { label: 'Entregas',       path: '/sistema/entregas',        emoji: '🚚' },
    { label: 'Suporte',        path: '/sistema/suporte',         emoji: '💬' },
    { label: 'Minhas Faturas', path: '/sistema/minhas-faturas',  emoji: '🧾' },
  ],
}

function NavItem({ item, onClose, location }) {
  const isActive = item.path !== '/sistema/'
    ? location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    : location.pathname === '/sistema/'

  return (
    <NavLink
      to={item.path}
      end={item.path === '/sistema/'}
      onClick={onClose}
      style={({ isActive: a }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 16px',
        fontSize: '0.825rem',
        fontWeight: 500,
        color: a ? '#f1f5f9' : 'var(--color-text-muted)',
        textDecoration: 'none',
        borderRadius: 8,
        margin: '1px 8px',
        backgroundColor: a ? 'var(--sidebar-item-active-bg)' : 'transparent',
        borderLeft: a ? '2px solid var(--color-brand-blue)' : '2px solid transparent',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      })}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.color = 'var(--color-text-sub)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'var(--color-text-muted)'
        }
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1, width: 20, textAlign: 'center', flexShrink: 0 }}>
        {item.emoji || '•'}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
    </NavLink>
  )
}

function SubNav({ items, depth = 0, onClose, location }) {
  return (
    <div style={{ paddingLeft: depth === 0 ? 8 : 12 }}>
      {items.map(item => {
        if (item.submenu) {
          return (
            <SubGroup key={item.path} item={item} depth={depth + 1} onClose={onClose} location={location} />
          )
        }
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            style={({ isActive: a }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: depth === 0 ? '7px 16px 7px 20px' : '6px 16px 6px 20px',
              fontSize: '0.78rem',
              fontWeight: 500,
              color: a ? '#f1f5f9' : 'var(--color-text-muted)',
              textDecoration: 'none',
              borderRadius: 6,
              margin: '1px 8px 1px 0',
              backgroundColor: a ? 'rgba(6,59,248,0.1)' : 'transparent',
              transition: 'all 0.15s ease',
            })}
          >
            <span style={{ fontSize: 14, lineHeight: 1, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.emoji || '·'}</span>
            {item.label}
          </NavLink>
        )
      })}
    </div>
  )
}

function SubGroup({ item, depth, onClose, location }) {
  const isAberto = item.submenu.some(s =>
    s.submenu
      ? s.submenu.some(ss => location.pathname.startsWith(ss.path))
      : location.pathname.startsWith(s.path)
  )
  const [open, setOpen] = useState(isAberto)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '7px 16px 7px 20px',
          fontSize: depth <= 1 ? '0.78rem' : '0.75rem',
          fontWeight: 500,
          color: isAberto ? 'var(--color-text-sub)' : 'var(--color-text-muted)',
          background: 'none',
          border: 'none',
          borderRadius: 6,
          margin: '1px 8px 1px 0',
          cursor: 'pointer',
          transition: 'color 0.15s',
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.emoji || '·'}</span>
        <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginRight: 4 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <SubNav items={item.submenu} depth={depth} onClose={onClose} location={location} />
      )}
    </div>
  )
}

function GroupItem({ item, onClose, location }) {
  const isAberto = location.pathname.startsWith(item.path)
  const [open, setOpen] = useState(isAberto)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '9px 16px',
          fontSize: '0.825rem',
          fontWeight: 500,
          color: isAberto ? '#f1f5f9' : 'var(--color-text-muted)',
          background: isAberto ? 'var(--sidebar-item-active-bg)' : 'none',
          border: 'none',
          borderLeft: isAberto ? '2px solid var(--color-brand-blue)' : '2px solid transparent',
          borderRadius: 8,
          margin: '1px 8px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1, width: 20, textAlign: 'center', flexShrink: 0 }}>
          {item.emoji || '•'}
        </span>
        <span style={{ flex: 1 }}>{item.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ marginBottom: 4 }}>
          <SubNav items={item.submenu} depth={0} onClose={onClose} location={location} />
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ onClose }) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const perfil = usuario?.perfil || 'OPERACIONAL'
  const menu = menuPorPerfil[perfil] || []

  const [modalSenha, setModalSenha] = useState(false)
  const [senhaForm, setSenhaForm] = useState({ atual: '', nova: '', confirmar: '' })
  const [senhaErro, setSenhaErro] = useState('')
  const [senhaSucesso, setSenhaSucesso] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const abrirModalSenha = () => {
    setSenhaForm({ atual: '', nova: '', confirmar: '' })
    setSenhaErro('')
    setSenhaSucesso(false)
    setModalSenha(true)
  }

  const salvarSenha = async (e) => {
    e.preventDefault()
    setSenhaErro('')
    if (senhaForm.nova.length < 6) { setSenhaErro('Minimo 6 caracteres.'); return }
    if (senhaForm.nova !== senhaForm.confirmar) { setSenhaErro('As senhas nao coincidem.'); return }
    setSalvandoSenha(true)
    try {
      await api.post('/auth/alterar-senha/', { senha_atual: senhaForm.atual, senha_nova: senhaForm.nova })
      setSenhaSucesso(true)
    } catch (err) {
      setSenhaErro(err.response?.data?.erro || 'Erro ao alterar senha.')
    } finally {
      setSalvandoSenha(false)
    }
  }

  const iniciais = usuario?.nome
    ? usuario.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : usuario?.email?.[0]?.toUpperCase() || '?'

  const perfilCor = {
    ADMIN:       '#FF0000',
    OPERACIONAL: '#063BF8',
    FINANCEIRO:  '#10b981',
    CLIENTE:     '#3d0361',
  }[perfil] || '#a78bca'

  return (
    <>
      <aside
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: 'var(--sidebar-width)',
          flexShrink: 0,
          backgroundColor: 'var(--color-bg-mid)',
          borderRight: '1px solid var(--color-border)',
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30,
              background: 'linear-gradient(135deg, #063BF8, #3d0361)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>
              uid<span style={{ color: '#063BF8' }}>.</span>sistema
            </span>
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '0 12px' }} />

        {/* Navegacao */}
        <nav style={{ flex: 1, paddingTop: 10, paddingBottom: 8, overflowY: 'auto' }}>
          {menu.map((item) => (
            item.submenu
              ? <GroupItem key={item.path} item={item} onClose={onClose} location={location} />
              : <NavItem key={item.path} item={item} onClose={onClose} location={location} />
          ))}
        </nav>

        <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '0 12px' }} />

        {/* Usuario */}
        <div style={{ padding: '14px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              backgroundColor: perfilCor + '22',
              border: `1.5px solid ${perfilCor}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: perfilCor,
              flexShrink: 0,
            }}>
              {iniciais}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario?.nome || usuario?.email}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario?.email_corporativo || usuario?.email}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={abrirModalSenha}
              title="Alterar senha"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px',
                fontSize: '0.72rem', fontWeight: 500,
                color: 'var(--color-text-muted)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-border)',
                borderRadius: 7,
                cursor: 'pointer',
                flex: 1,
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
            >
              <Icon d={icons.lock} size={12} />
              Senha
            </button>
            <button
              onClick={handleLogout}
              title="Sair"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px',
                fontSize: '0.72rem', fontWeight: 500,
                color: 'var(--color-text-muted)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-border)',
                borderRadius: 7,
                cursor: 'pointer',
                flex: 1,
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
            >
              <Icon d={icons.logout} size={12} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Modal alterar senha */}
      {modalSenha && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.72)',
          zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-mid)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: 380,
            padding: 28,
            boxShadow: 'var(--shadow-modal)',
          }}
            className="animate-fade-in"
          >
            {senhaSucesso ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  backgroundColor: 'rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
                  </svg>
                </div>
                <p style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 6, fontSize: 15 }}>Senha alterada!</p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 20 }}>Sua nova senha ja esta ativa.</p>
                <button
                  onClick={() => setModalSenha(false)}
                  style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={salvarSenha}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(6,59,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon d={icons.lock} size={16} />
                  </div>
                  <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: 0 }}>Alterar senha</h2>
                </div>
                {senhaErro && (
                  <p style={{ color: '#f87171', fontSize: 12, marginBottom: 14, padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 7, border: '1px solid rgba(248,113,113,0.15)' }}>
                    {senhaErro}
                  </p>
                )}
                {[
                  { label: 'Senha atual', field: 'atual' },
                  { label: 'Nova senha', field: 'nova' },
                  { label: 'Confirmar nova senha', field: 'confirmar' },
                ].map(({ label, field }) => (
                  <div key={field} style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 5, display: 'block', fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                      {label}
                    </label>
                    <input
                      type="password"
                      value={senhaForm[field]}
                      autoComplete="new-password"
                      onChange={e => setSenhaForm(f => ({ ...f, [field]: e.target.value }))}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--color-border-mid)',
                        borderRadius: 8,
                        color: '#f1f5f9',
                        padding: '9px 12px',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--color-brand-blue)'}
                      onBlur={e => e.target.style.borderColor = 'var(--color-border-mid)'}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
                  <button
                    type="button"
                    onClick={() => setModalSenha(false)}
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-sub)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoSenha}
                    style={{ background: '#063BF8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvandoSenha ? 0.7 : 1 }}>
                    {salvandoSenha ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
