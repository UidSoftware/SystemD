export default function Hero() {
  return (
    <section
      id="inicio"
      className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0014 0%, #3d0361 50%, #063BF8 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 59, 248, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 59, 248, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <h1
          className="font-display font-extrabold text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight"
          style={{ color: '#f1f5f9' }}
        >
          Chega de planilha.<br />
          Chega de papel.<br />
          <span style={{ color: '#6b8fff' }}>Chega de caos.</span>
        </h1>
        <p
          className="text-lg md:text-xl max-w-2xl mx-auto mb-10"
          style={{ color: '#a78bca' }}
        >
          Sistemas de gestão sob medida para estúdios, salões, clínicas e pequenos negócios.
          Do zero ao ar, sem complicação.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#contato"
            className="font-semibold px-8 py-4 rounded-full text-base transition-colors"
            style={{
              backgroundColor: '#063BF8',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(6, 59, 248, 0.4)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0430cc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#063BF8')}
          >
            Quero meu sistema
          </a>
          <a
            href="#portfolio"
            className="font-semibold px-8 py-4 rounded-full text-base transition-colors"
            style={{
              border: '2px solid rgba(6, 59, 248, 0.6)',
              color: '#f1f5f9',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#063BF8')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(6, 59, 248, 0.6)')}
          >
            Ver portfólio
          </a>
        </div>
      </div>
    </section>
  )
}
