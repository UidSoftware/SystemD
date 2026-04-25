export default function Header({ titulo }) {
  return (
    <header
      className="px-8 py-5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
    >
      <h1 className="font-display font-bold text-2xl" style={{ color: '#f1f5f9' }}>
        {titulo}
      </h1>
    </header>
  )
}
