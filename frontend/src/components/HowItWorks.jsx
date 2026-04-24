const passos = [
  {
    num: '01',
    emoji: '🗣️',
    titulo: 'Me conta seu negócio',
    descricao: 'Você explica como funciona. A gente ouve de verdade, não só anota requisitos.',
  },
  {
    num: '02',
    emoji: '🔧',
    titulo: 'A gente constrói',
    descricao: 'Sistema feito pra sua realidade. Não um template adaptado.',
  },
  {
    num: '03',
    emoji: '🚀',
    titulo: 'Você usa e cresce',
    descricao: 'Acompanhamos o crescimento. Não sumimos depois da entrega.',
  },
]

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 px-6" style={{ backgroundColor: '#1a0a2e' }}>
      <div className="max-w-5xl mx-auto">
        <h2
          className="font-display font-bold text-3xl md:text-4xl text-center mb-16"
          style={{ color: '#f1f5f9' }}
        >
          Simples assim
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {passos.map((p, i) => (
            <div key={p.num} className="relative flex flex-col items-center text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-display font-bold text-xl mb-4"
                style={{ backgroundColor: '#063BF8', color: '#fff' }}
              >
                {p.num}
              </div>
              <div className="text-4xl mb-4">{p.emoji}</div>
              <h3 className="font-display font-bold text-xl mb-3" style={{ color: '#f1f5f9' }}>
                {p.titulo}
              </h3>
              <p style={{ color: '#a78bca' }}>{p.descricao}</p>

              {i < passos.length - 1 && (
                <div
                  className="hidden md:block absolute top-6 left-[calc(100%+8px)] text-2xl"
                  style={{ color: '#063BF8' }}
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
