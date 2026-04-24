const diferenciais = [
  {
    emoji: '🔍',
    titulo: 'Sob medida de verdade',
    descricao: 'Cada sistema é construído pro seu negócio. Não adaptamos template.',
  },
  {
    emoji: '🤝',
    titulo: 'Parceria, não fornecimento',
    descricao: 'Acompanhamos seu crescimento. Você não vira ticket de suporte.',
  },
  {
    emoji: '🧠',
    titulo: 'Interface pra quem usa',
    descricao: 'Pensada pra pessoa que vai usar todo dia, não pra quem programa.',
  },
]

export default function About() {
  return (
    <section className="py-24 px-6" style={{ backgroundColor: '#3d0361' }}>
      <div className="max-w-5xl mx-auto">
        <h2
          className="font-display font-bold text-3xl md:text-4xl text-center mb-8"
          style={{ color: '#f1f5f9' }}
        >
          Por que a Uid é diferente
        </h2>
        <p
          className="text-base md:text-lg text-center max-w-3xl mx-auto mb-16 leading-relaxed"
          style={{ color: '#a78bca' }}
        >
          Antes de escrever uma linha de código, a gente entende seu negócio por dentro.
          Viramos clientes, testamos o processo, sentimos a dor.
          <br /><br />
          A Uid nasceu em Uberlândia/MG com uma missão simples: colocar tecnologia de verdade
          nas mãos de quem realmente precisa — o MEI e o pequeno empresário que sustenta o Brasil.
          <br /><br />
          Somos pequenos de propósito. Atendemos poucos clientes por nicho justamente pra poder
          atender bem.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {diferenciais.map((d) => (
            <div
              key={d.titulo}
              className="rounded-2xl p-6 transition-all duration-200"
              style={{
                backgroundColor: 'rgba(10, 0, 20, 0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(6, 59, 248, 0.4)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div className="text-3xl mb-3">{d.emoji}</div>
              <h3 className="font-display font-bold text-xl mb-2" style={{ color: '#f1f5f9' }}>
                {d.titulo}
              </h3>
              <p style={{ color: '#a78bca' }}>{d.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
