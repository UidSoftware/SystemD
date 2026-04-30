export default function Header({ titulo, onMenuToggle }) {
  return (
    <header
      className="flex items-center gap-4 px-6 py-5 shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
    >
      <button
        onClick={onMenuToggle}
        className="lg:hidden flex flex-col gap-1.5 p-1"
        aria-label="Menu"
      >
        <span className="block w-5 h-0.5 rounded" style={{ backgroundColor: '#a78bca' }} />
        <span className="block w-5 h-0.5 rounded" style={{ backgroundColor: '#a78bca' }} />
        <span className="block w-5 h-0.5 rounded" style={{ backgroundColor: '#a78bca' }} />
      </button>
      <h1 className="font-display font-bold text-2xl" style={{ color: '#f1f5f9' }}>
        {titulo}
      </h1>
    </header>
  )
}
