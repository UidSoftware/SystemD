export default function Header({ titulo, onMenuToggle }) {
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
        onMouseEnter={e => e.currentTarget.style.color = '#f1f5f9'}
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
          color: '#f1f5f9',
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
    </header>
  )
}
