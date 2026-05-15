import { useState, useEffect } from 'react'

const links = [
  { label: 'Início', href: '#inicio' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Portfólio', href: '#portfolio' },
  { label: 'Contato', href: '#contato' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#0a0014',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        borderBottom: scrolled
          ? '1px solid rgba(6, 59, 248, 0.2)'
          : '1px solid transparent',
        transition: 'border-color 0.3s',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#inicio" className="flex items-center">
          <img
            src="/assets/uid-logo.jpeg"
            alt="Uid Software"
            style={{ height: '42px', width: 'auto', borderRadius: '8px' }}
          />
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium transition-colors hover:text-white"
              style={{ color: '#a78bca' }}
            >
              {l.label}
            </a>
          ))}
          <a
            href="/login"
            className="text-sm font-medium px-5 py-2 rounded-full transition-all"
            style={{
              border: '1px solid rgba(6, 59, 248, 0.4)',
              background: 'transparent',
              color: '#f1f5f9',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#063BF8'
              e.currentTarget.style.color = '#6b8fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(6, 59, 248, 0.4)'
              e.currentTarget.style.color = '#f1f5f9'
            }}
          >
            Entrar
          </a>
          <a
            href="#contato"
            className="text-sm font-semibold px-5 py-2 rounded-full transition-colors"
            style={{ backgroundColor: '#063BF8', color: '#fff' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0430cc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#063BF8')}
          >
            Quero meu sistema
          </a>
        </div>

        <button
          className="md:hidden flex flex-col gap-1.5 p-1"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <span
            className="block w-6 h-0.5 bg-white transition-all duration-300"
            style={{ transform: open ? 'rotate(45deg) translateY(8px)' : 'none' }}
          />
          <span
            className="block w-6 h-0.5 bg-white transition-all duration-300"
            style={{ opacity: open ? 0 : 1 }}
          />
          <span
            className="block w-6 h-0.5 bg-white transition-all duration-300"
            style={{ transform: open ? 'rotate(-45deg) translateY(-8px)' : 'none' }}
          />
        </button>
      </div>

      {open && (
        <div className="md:hidden px-6 pb-6 flex flex-col gap-4" style={{ backgroundColor: '#0a0014' }}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-base font-medium"
              style={{ color: '#a78bca' }}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="/login"
            className="text-base font-medium"
            style={{ color: '#a78bca' }}
            onClick={() => setOpen(false)}
          >
            Entrar
          </a>
          <a
            href="#contato"
            className="text-sm font-semibold px-5 py-3 rounded-full text-center"
            style={{ backgroundColor: '#063BF8', color: '#fff' }}
            onClick={() => setOpen(false)}
          >
            Quero meu sistema
          </a>
        </div>
      )}
    </nav>
  )
}
