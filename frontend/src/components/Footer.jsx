const links = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Portfólio', href: '#portfolio' },
  { label: 'Contato', href: '#contato' },
]

export default function Footer() {
  return (
    <footer
      className="py-12 px-6"
      style={{
        backgroundColor: '#0a0014',
        borderTop: '1px solid rgba(6, 59, 248, 0.2)',
      }}
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-center md:text-left">
          <img
            src="/assets/uid-logo.jpeg"
            alt="Uid Software"
            style={{ height: '48px', width: 'auto', borderRadius: '8px' }}
          />
          <p className="text-sm mt-1" style={{ color: '#a78bca' }}>Uberlândia/MG</p>
          <p className="text-xs mt-1" style={{ color: '#a78bca' }}>CNPJ: 60.939.393/0001-25</p>
        </div>

        <nav className="flex gap-6">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm transition-colors hover:text-white"
              style={{ color: '#a78bca' }}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <p className="text-xs text-center md:text-right" style={{ color: '#a78bca' }}>
          © 2025 Uid Software e Tecnologia LTDA
        </p>
      </div>
    </footer>
  )
}
